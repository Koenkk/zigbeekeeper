/* v8 ignore start */

import Device from '../../../controller/model/device';
import * as Models from '../../../models';
import {wait, Waitress} from '../../../utils';
import {logger} from '../../../utils/logger';
import * as ZSpec from '../../../zspec';
import {BroadcastAddress} from '../../../zspec/enums';
import * as Zcl from '../../../zspec/zcl';
import * as Zdo from '../../../zspec/zdo';
import * as ZdoTypes from '../../../zspec/zdo/definition/tstypes';
import Adapter from '../../adapter';
import * as Events from '../../events';
import {AdapterOptions, CoordinatorVersion, NetworkOptions, NetworkParameters, SerialPortOptions, StartResult} from '../../tstype';
import PARAM, {ApsDataRequest, gpDataInd, ReceivedDataResponse, WaitForDataRequest} from '../driver/constants';
import Driver from '../driver/driver';
import processFrame, {frameParserEvents} from '../driver/frameParser';

const NS = 'zh:deconz';

interface WaitressMatcher {
    address?: number | string;
    endpoint: number;
    transactionSequenceNumber?: number;
    frameType: Zcl.FrameType;
    clusterID: number;
    commandIdentifier: number;
    direction: number;
}

export class DeconzAdapter extends Adapter {
    private driver: Driver;
    private openRequestsQueue: WaitForDataRequest[];
    private transactionID: number;
    private frameParserEvent = frameParserEvents;
    private fwVersion?: CoordinatorVersion;
    private waitress: Waitress<Events.ZclPayload, WaitressMatcher>;
    private TX_OPTIONS = 0x00; // No APS ACKS
    private joinPermitted: boolean = false;

    public constructor(networkOptions: NetworkOptions, serialPortOptions: SerialPortOptions, backupPath: string, adapterOptions: AdapterOptions) {
        super(networkOptions, serialPortOptions, backupPath, adapterOptions);
        this.hasZdoMessageOverhead = true;
        this.manufacturerID = Zcl.ManufacturerCode.DRESDEN_ELEKTRONIK_INGENIEURTECHNIK_GMBH;

        // const concurrent = this.adapterOptions && this.adapterOptions.concurrent ? this.adapterOptions.concurrent : 2;

        // TODO: https://github.com/Koenkk/zigbee2mqtt/issues/4884#issuecomment-728903121
        const delay = this.adapterOptions && typeof this.adapterOptions.delay === 'number' ? this.adapterOptions.delay : 0;

        this.waitress = new Waitress<Events.ZclPayload, WaitressMatcher>(this.waitressValidator, this.waitressTimeoutFormatter);

        this.driver = new Driver(serialPortOptions.path!);
        this.driver.setDelay(delay);

        if (delay >= 200) {
            this.TX_OPTIONS = 0x04; // activate APS ACKS
        }

        this.driver.on('rxFrame', (frame) => {
            processFrame(frame);
        });
        this.transactionID = 0;
        this.openRequestsQueue = [];
        this.fwVersion = undefined;

        this.frameParserEvent.on('receivedDataPayload', (data) => {
            this.checkReceivedDataPayload(data);
        });
        this.frameParserEvent.on('receivedGreenPowerIndication', (data) => {
            this.checkReceivedGreenPowerIndication(data);
        });

        setInterval(() => {
            this.checkReceivedDataPayload(null);
        }, 1000);
    }

    /**
     * Adapter methods
     */
    public async start(): Promise<StartResult> {
        const baudrate = this.serialPortOptions.baudRate || 38400;
        await this.driver.open(baudrate);

        const result = await this.initNetwork();

        // write endpoints
        //[ sd1   ep    proId       devId       vers  #inCl iCl1        iCl2        iCl3        iCl4        iCl5        #outC oCl1        oCl2        oCl3        oCl4      ]
        const sd = [
            0x00, 0x01, 0x04, 0x01, 0x05, 0x00, 0x01, 0x05, 0x00, 0x00, 0x00, 0x06, 0x0a, 0x00, 0x19, 0x00, 0x01, 0x05, 0x04, 0x01, 0x00, 0x20, 0x00,
            0x00, 0x05, 0x02, 0x05,
        ];
        const sd1 = sd.reverse();

        await this.driver.writeParameterRequest(PARAM.PARAM.STK.Endpoint, sd1);

        return result;
    }

    public async stop(): Promise<void> {
        await this.driver.close();
    }

    /**
     * Check the network status on the adapter (execute the necessary pre-steps to be able to get it).
     * WARNING: This is a one-off. Should not be called outside of `initNetwork`.
     */
    protected async initHasNetwork(): Promise<[true, panID: number, extendedPanID: Buffer] | [false, panID: undefined, extendedPanID: undefined]> {
        const panid = (await this.driver.readParameterRequest(PARAM.PARAM.Network.PAN_ID)) as number;
        const expanid = (await this.driver.readParameterRequest(PARAM.PARAM.Network.APS_EXT_PAN_ID)) as string;

        // TODO: probably should be a request for actual NET_CONNECTED NetworkState instead?
        if (panid && expanid) {
            return [true, panid, Buffer.from(expanid, 'hex')];
        }

        return [false, undefined, undefined];
    }

    public async leaveNetwork(): Promise<void> {
        // TODO: https://github.com/dresden-elektronik/deconz/blob/7a87ce0b3e401dd1be89b10e41b13abfd983e329/src/zm_controller.cpp#L3130-L3147
        // since this is used below AFTER changing parameters, this does not seem to actually "clear" the network in the adapter, just puts it in a state of "offline"?
        await this.driver.changeNetworkStateRequest(PARAM.PARAM.Network.NET_OFFLINE);
        await wait(2000);
    }

    public async formNetwork(backup?: Models.Backup): Promise<void> {
        if (backup) {
            // this path should never be reached
            throw new Error('This adapter does not support backup');
        } else {
            await this.driver.writeParameterRequest(
                PARAM.PARAM.Network.CHANNEL_MASK,
                ZSpec.Utils.channelsToUInt32Mask(this.networkOptions.channelList),
            );
            await wait(500);
            await this.driver.writeParameterRequest(PARAM.PARAM.Network.PAN_ID, this.networkOptions.panID);
            await wait(500);
            await this.driver.writeParameterRequest(PARAM.PARAM.Network.APS_EXT_PAN_ID, this.networkOptions.extendedPanID!);
            await wait(500);
            await this.driver.writeParameterRequest(PARAM.PARAM.Network.NETWORK_KEY, this.networkOptions.networkKey!);
            await wait(500);

            await this.driver.changeNetworkStateRequest(PARAM.PARAM.Network.NET_OFFLINE);
            await wait(2000);
            await this.driver.changeNetworkStateRequest(PARAM.PARAM.Network.NET_CONNECTED);
            await wait(2000);
        }
    }

    public async getNetworkKey(): Promise<Buffer> {
        return Buffer.from((await this.driver.readParameterRequest(PARAM.PARAM.Network.NETWORK_KEY)) as string, 'hex');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public checkBackup(backup: Models.Backup): void {
        // always fail if found a backup, since not supported, it can't be for deconz
        throw new Error('This adapter does not support backup');
    }

    public async getCoordinatorIEEE(): Promise<string> {
        return (await this.driver.readParameterRequest(PARAM.PARAM.Network.MAC)) as string;
    }

    public async permitJoin(seconds: number, networkAddress?: number): Promise<void> {
        const clusterId = Zdo.ClusterId.PERMIT_JOINING_REQUEST;

        if (networkAddress) {
            // `authentication`: TC significance always 1 (zb specs)
            const zdoPayload = Zdo.Buffalo.buildRequest(this.hasZdoMessageOverhead, clusterId, seconds, 1, []);

            const result = await this.sendZdo(ZSpec.BLANK_EUI64, networkAddress, clusterId, zdoPayload, false);

            if (!Zdo.Buffalo.checkStatus(result)) {
                // TODO: will disappear once moved upstream
                throw new Zdo.StatusError(result[0]);
            }
        } else {
            await this.driver.writeParameterRequest(PARAM.PARAM.Network.PERMIT_JOIN, seconds);

            logger.debug(`Permit joining on coordinator for ${seconds} sec.`, NS);

            // broadcast permit joining ZDO
            if (networkAddress === undefined) {
                // `authentication`: TC significance always 1 (zb specs)
                const zdoPayload = Zdo.Buffalo.buildRequest(this.hasZdoMessageOverhead, clusterId, seconds, 1, []);

                await this.sendZdo(ZSpec.BLANK_EUI64, ZSpec.BroadcastAddress.DEFAULT, clusterId, zdoPayload, true);
            }
        }

        this.joinPermitted = seconds !== 0;
    }

    public async getCoordinatorVersion(): Promise<CoordinatorVersion> {
        // product: number; transportrev: number; majorrel: number; minorrel: number; maintrel: number; revision: string;
        if (this.fwVersion != undefined) {
            return this.fwVersion;
        } else {
            try {
                const fw = await this.driver.readFirmwareVersionRequest();
                const buf = Buffer.from(fw);
                const fwString = '0x' + buf.readUInt32LE(0).toString(16);
                let type: string = '';
                if (fw[1] === 5) {
                    type = 'ConBee/RaspBee';
                } else if (fw[1] === 7) {
                    type = 'ConBee2/RaspBee2';
                } else {
                    type = 'ConBee3';
                }
                const meta = {transportrev: 0, product: 0, majorrel: fw[3], minorrel: fw[2], maintrel: 0, revision: fwString};
                this.fwVersion = {type: type, meta: meta};
                return {type: type, meta: meta};
            } catch (error) {
                throw new Error('Get coordinator version Error: ' + error);
            }
        }
    }

    public async addInstallCode(ieeeAddress: string, key: Buffer): Promise<void> {
        await this.driver.writeLinkKey(ieeeAddress, ZSpec.Utils.aes128MmoHash(key));
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async reset(type: 'soft' | 'hard'): Promise<void> {
        return await Promise.reject(new Error('Reset is not supported'));
    }

    public waitFor(
        networkAddress: number | undefined,
        endpoint: number,
        frameType: Zcl.FrameType,
        direction: Zcl.Direction,
        transactionSequenceNumber: number | undefined,
        clusterID: number,
        commandIdentifier: number,
        timeout: number,
    ): {promise: Promise<Events.ZclPayload>; cancel: () => void} {
        const payload = {
            address: networkAddress,
            endpoint,
            clusterID,
            commandIdentifier,
            frameType,
            direction,
            transactionSequenceNumber,
        };
        const waiter = this.waitress.waitFor(payload, timeout);
        const cancel = (): void => this.waitress.remove(waiter.ID);
        return {promise: waiter.start().promise, cancel};
    }

    public async sendZdo(
        ieeeAddress: string,
        networkAddress: number,
        clusterId: Zdo.ClusterId,
        payload: Buffer,
        disableResponse: true,
    ): Promise<void>;
    public async sendZdo<K extends keyof ZdoTypes.RequestToResponseMap>(
        ieeeAddress: string,
        networkAddress: number,
        clusterId: K,
        payload: Buffer,
        disableResponse: false,
    ): Promise<ZdoTypes.RequestToResponseMap[K]>;
    public async sendZdo<K extends keyof ZdoTypes.RequestToResponseMap>(
        ieeeAddress: string,
        networkAddress: number,
        clusterId: K,
        payload: Buffer,
        disableResponse: boolean,
    ): Promise<ZdoTypes.RequestToResponseMap[K] | void> {
        const transactionID = this.nextTransactionID();
        payload[0] = transactionID;
        const isNwkAddrRequest = clusterId === Zdo.ClusterId.NETWORK_ADDRESS_REQUEST;
        const req: ApsDataRequest = {
            requestId: transactionID,
            destAddrMode: isNwkAddrRequest ? PARAM.PARAM.addressMode.IEEE_ADDR : PARAM.PARAM.addressMode.NWK_ADDR,
            destAddr16: isNwkAddrRequest ? undefined : networkAddress,
            destAddr64: isNwkAddrRequest ? ieeeAddress : undefined,
            destEndpoint: Zdo.ZDO_ENDPOINT,
            profileId: Zdo.ZDO_PROFILE_ID,
            clusterId,
            srcEndpoint: Zdo.ZDO_ENDPOINT,
            asduLength: payload.length,
            asduPayload: payload,
            txOptions: 0,
            radius: PARAM.PARAM.txRadius.DEFAULT_RADIUS,
            timeout: 30,
        };

        this.driver
            .enqueueSendDataRequest(req)
            .then(() => {})
            .catch(() => {});

        if (!disableResponse) {
            const responseClusterId = Zdo.Utils.getResponseClusterId(clusterId);

            if (responseClusterId) {
                const response = await this.waitForData(isNwkAddrRequest ? ieeeAddress : networkAddress, Zdo.ZDO_PROFILE_ID, responseClusterId);

                return response.zdo! as ZdoTypes.RequestToResponseMap[K];
            }
        }
    }

    public async sendZclFrameToEndpoint(
        ieeeAddr: string,
        networkAddress: number,
        endpoint: number,
        zclFrame: Zcl.Frame,
        timeout: number,
        disableResponse: boolean,
        disableRecovery: boolean,
        sourceEndpoint?: number,
    ): Promise<Events.ZclPayload | void> {
        const transactionID = this.nextTransactionID();
        const payload = zclFrame.toBuffer();
        const request: ApsDataRequest = {
            requestId: transactionID,
            destAddrMode: PARAM.PARAM.addressMode.NWK_ADDR,
            destAddr16: networkAddress,
            destEndpoint: endpoint,
            profileId: sourceEndpoint === 242 && endpoint === 242 ? 0xa1e0 : 0x104,
            clusterId: zclFrame.cluster.ID,
            srcEndpoint: sourceEndpoint || 1,
            asduLength: payload.length,
            asduPayload: payload,
            txOptions: this.TX_OPTIONS, // 0x00 normal, 0x04 APS ACK
            radius: PARAM.PARAM.txRadius.DEFAULT_RADIUS,
            timeout: timeout,
        };

        const command = zclFrame.command;

        this.driver
            .enqueueSendDataRequest(request)
            .then(() => {
                logger.debug(`sendZclFrameToEndpoint - message send with transSeq Nr.: ${zclFrame.header.transactionSequenceNumber}`, NS);
                logger.debug(
                    (command.response !== undefined) +
                        ', ' +
                        zclFrame.header.frameControl.disableDefaultResponse +
                        ', ' +
                        disableResponse +
                        ', ' +
                        request.timeout,
                    NS,
                );

                if (command.response == undefined || zclFrame.header.frameControl.disableDefaultResponse || !disableResponse) {
                    logger.debug(`resolve request (${zclFrame.header.transactionSequenceNumber})`, NS);
                    return Promise.resolve();
                }
            })
            .catch((error) => {
                logger.debug(`sendZclFrameToEndpoint ERROR (${zclFrame.header.transactionSequenceNumber})`, NS);
                logger.debug(error, NS);
                //return Promise.reject(new Error("sendZclFrameToEndpoint ERROR " + error));
            });

        try {
            let data = null;
            if ((command.response != undefined && !disableResponse) || !zclFrame.header.frameControl.disableDefaultResponse) {
                data = await this.waitForData(
                    networkAddress,
                    ZSpec.HA_PROFILE_ID,
                    zclFrame.cluster.ID,
                    zclFrame.header.transactionSequenceNumber,
                    request.timeout,
                );
            }

            if (data !== null) {
                const response: Events.ZclPayload = {
                    address: data.srcAddr16 ?? `0x${data.srcAddr64!}`,
                    data: data.asduPayload,
                    clusterID: zclFrame.cluster.ID,
                    header: Zcl.Header.fromBuffer(data.asduPayload),
                    endpoint: data.srcEndpoint,
                    linkquality: data.lqi,
                    groupID: data.srcAddrMode === 0x01 ? data.srcAddr16! : 0,
                    wasBroadcast: data.srcAddrMode === 0x01 || data.srcAddrMode === 0xf,
                    destinationEndpoint: data.destEndpoint,
                };
                logger.debug(`response received (${zclFrame.header.transactionSequenceNumber})`, NS);
                return response;
            } else {
                logger.debug(`no response expected (${zclFrame.header.transactionSequenceNumber})`, NS);
            }
        } catch (error) {
            throw new Error(`no response received (${zclFrame.header.transactionSequenceNumber}) ${error}`);
        }
    }

    public async sendZclFrameToGroup(groupID: number, zclFrame: Zcl.Frame): Promise<void> {
        const transactionID = this.nextTransactionID();
        const payload = zclFrame.toBuffer();

        logger.debug(`zclFrame to group - ${groupID}`, NS);

        const request: ApsDataRequest = {
            requestId: transactionID,
            destAddrMode: PARAM.PARAM.addressMode.GROUP_ADDR,
            destAddr16: groupID,
            profileId: 0x104,
            clusterId: zclFrame.cluster.ID,
            srcEndpoint: 1,
            asduLength: payload.length,
            asduPayload: payload,
            txOptions: 0,
            radius: PARAM.PARAM.txRadius.UNLIMITED,
        };

        logger.debug(`sendZclFrameToGroup - message send`, NS);
        return await (this.driver.enqueueSendDataRequest(request) as Promise<void>);
    }

    public async sendZclFrameToAll(endpoint: number, zclFrame: Zcl.Frame, sourceEndpoint: number, destination: BroadcastAddress): Promise<void> {
        const transactionID = this.nextTransactionID();
        const payload = zclFrame.toBuffer();

        logger.debug(`zclFrame to all - ${endpoint}`, NS);

        const request: ApsDataRequest = {
            requestId: transactionID,
            destAddrMode: PARAM.PARAM.addressMode.NWK_ADDR,
            destAddr16: destination,
            destEndpoint: endpoint,
            profileId: sourceEndpoint === 242 && endpoint === 242 ? 0xa1e0 : 0x104,
            clusterId: zclFrame.cluster.ID,
            srcEndpoint: sourceEndpoint,
            asduLength: payload.length,
            asduPayload: payload,
            txOptions: 0,
            radius: PARAM.PARAM.txRadius.UNLIMITED,
        };

        logger.debug(`sendZclFrameToAll - message send`, NS);
        return await (this.driver.enqueueSendDataRequest(request) as Promise<void>);
    }

    public async supportsBackup(): Promise<boolean> {
        return false;
    }

    public async backup(): Promise<Models.Backup> {
        throw new Error('This adapter does not support backup');
    }

    public async getNetworkParameters(): Promise<NetworkParameters> {
        try {
            const panid = await this.driver.readParameterRequest(PARAM.PARAM.Network.PAN_ID);
            const expanid = await this.driver.readParameterRequest(PARAM.PARAM.Network.APS_EXT_PAN_ID);
            const channel = await this.driver.readParameterRequest(PARAM.PARAM.Network.CHANNEL);

            return {
                panID: panid as number,
                extendedPanID: expanid as string, // read as `0x...`
                channel: channel as number,
            };
        } catch (error) {
            const msg = 'get network parameters Error:' + error;
            logger.debug(msg, NS);
            return await Promise.reject(new Error(msg));
        }
    }

    public async restoreChannelInterPAN(): Promise<void> {
        throw new Error('not supported');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async sendZclFrameInterPANToIeeeAddr(zclFrame: Zcl.Frame, ieeeAddr: string): Promise<void> {
        throw new Error('not supported');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async sendZclFrameInterPANBroadcast(zclFrame: Zcl.Frame, timeout: number): Promise<Events.ZclPayload> {
        throw new Error('not supported');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async sendZclFrameInterPANBroadcastWithResponse(zclFrame: Zcl.Frame, timeout: number): Promise<Events.ZclPayload> {
        throw new Error('not supported');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async setChannelInterPAN(channel: number): Promise<void> {
        throw new Error('not supported');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async sendZclFrameInterPANIeeeAddr(zclFrame: Zcl.Frame, ieeeAddr: string): Promise<void> {
        throw new Error('not supported');
    }

    /**
     * Private methods
     */

    private waitForData(
        addr: number | string,
        profileId: number,
        clusterId: number,
        transactionSequenceNumber?: number,
        timeout?: number,
    ): Promise<ReceivedDataResponse> {
        return new Promise((resolve, reject): void => {
            const ts = Date.now();
            // const commandId = PARAM.PARAM.APS.DATA_INDICATION;
            const req: WaitForDataRequest = {addr, profileId, clusterId, transactionSequenceNumber, resolve, reject, ts, timeout};
            this.openRequestsQueue.push(req);
        });
    }

    private checkReceivedGreenPowerIndication(ind: gpDataInd): void {
        const gpdHeader = Buffer.alloc(15); // applicationId === IEEE_ADDRESS ? 20 : 15
        gpdHeader.writeUInt8(0b00000001, 0); // frameControl: FrameType.SPECIFIC + Direction.CLIENT_TO_SERVER + disableDefaultResponse=false
        gpdHeader.writeUInt8(ind.seqNr, 1);
        gpdHeader.writeUInt8(ind.id, 2); // commandIdentifier
        gpdHeader.writeUInt16LE(0, 3); // options, only srcID present
        gpdHeader.writeUInt32LE(ind.srcId, 5);
        // omitted: gpdIEEEAddr (ieeeAddr)
        // omitted: gpdEndpoint (uint8)
        gpdHeader.writeUInt32LE(ind.frameCounter, 9);
        gpdHeader.writeUInt8(ind.commandId, 13);
        gpdHeader.writeUInt8(ind.commandFrameSize, 14);

        const payBuf = Buffer.concat([gpdHeader, ind.commandFrame]);
        const payload: Events.ZclPayload = {
            header: Zcl.Header.fromBuffer(payBuf),
            data: payBuf,
            clusterID: Zcl.Clusters.greenPower.ID,
            address: ind.srcId & 0xffff,
            endpoint: ZSpec.GP_ENDPOINT,
            linkquality: 0xff, // bogus
            groupID: ZSpec.GP_GROUP_ID,
            wasBroadcast: true, // Take the codepath that doesn't require `gppNwkAddr` as its not present in the payload
            destinationEndpoint: ZSpec.GP_ENDPOINT,
        };

        this.waitress.resolve(payload);
        this.emit('zclPayload', payload);
    }

    private checkReceivedDataPayload(resp: ReceivedDataResponse | null): void {
        let srcAddr: number | undefined;
        let srcEUI64: string | undefined;
        let header: Zcl.Header | undefined;

        if (resp) {
            if (resp.srcAddr16 != null) {
                srcAddr = resp.srcAddr16;
            } else {
                // For some devices srcAddr64 is reported by ConBee 3, even if the frame contains both
                // srcAddr16 and srcAddr64. This happens even if the request was sent to a short address.
                // At least some parts, e.g. the while loop below, only work with srcAddr16 (i.e. the network
                // address) being set. So we try to look up the network address in the list of know devices.
                if (resp.srcAddr64 != null) {
                    logger.debug(`Try to find network address of ${resp.srcAddr64}`, NS);
                    // Note: Device expects addresses with a 0x prefix...
                    srcAddr = Device.byIeeeAddr('0x' + resp.srcAddr64, false)?.networkAddress;
                    // apperantly some functions furhter up in the protocol stack expect this to be set.
                    // so let's make sure they get the network address
                    // Note: srcAddr16 can be undefined after this and this is intended behavior
                    // there are zigbee frames which do not contain a 16 bit address, e.g. during joining.
                    // So any code that relies on srcAddr16 must handle this in some way.
                    resp.srcAddr16 = srcAddr;
                }
            }

            if (resp.profileId === Zdo.ZDO_PROFILE_ID) {
                if (resp.clusterId === Zdo.ClusterId.NETWORK_ADDRESS_RESPONSE) {
                    if (Zdo.Buffalo.checkStatus<Zdo.ClusterId.NETWORK_ADDRESS_RESPONSE>(resp.zdo!)) {
                        srcEUI64 = resp.zdo![1].eui64;
                    }
                } else if (resp.clusterId === Zdo.ClusterId.END_DEVICE_ANNOUNCE) {
                    // XXX: using same response for announce (handled by controller) or joined depending on permit join status?
                    if (this.joinPermitted === true && Zdo.Buffalo.checkStatus<Zdo.ClusterId.END_DEVICE_ANNOUNCE>(resp.zdo!)) {
                        const payload = resp.zdo[1];

                        this.emit('deviceJoined', {networkAddress: payload.nwkAddress, ieeeAddr: payload.eui64});
                    }
                }

                this.emit('zdoResponse', resp.clusterId, resp.zdo!);
            } else {
                header = Zcl.Header.fromBuffer(resp.asduPayload);
            }
        }

        let i = this.openRequestsQueue.length;

        while (i--) {
            const req: WaitForDataRequest = this.openRequestsQueue[i];

            if (
                resp &&
                (req.addr === undefined ||
                    (typeof req.addr === 'number' ? srcAddr !== undefined && req.addr === srcAddr : srcEUI64 && req.addr === srcEUI64)) &&
                req.clusterId === resp.clusterId &&
                req.profileId === resp.profileId &&
                (header === undefined ||
                    req.transactionSequenceNumber === undefined ||
                    req.transactionSequenceNumber === header.transactionSequenceNumber)
            ) {
                this.openRequestsQueue.splice(i, 1);
                req.resolve(resp);
            }

            const now = Date.now();

            // Default timeout: 60 seconds.
            // Comparison is negated to prevent orphans when invalid timeout is entered (resulting in NaN).
            if (!(now - req.ts! <= (req.timeout ?? 60000))) {
                //logger.debug("Timeout for request in openRequestsQueue addr: " + req.addr.toString(16) + " clusterId: " + req.clusterId.toString(16) + " profileId: " + req.profileId.toString(16), NS);
                //remove from busyQueue
                this.openRequestsQueue.splice(i, 1);
                req.reject(new Error('waiting for response TIMEOUT'));
            }
        }

        if (resp && resp.profileId != Zdo.ZDO_PROFILE_ID) {
            const payload: Events.ZclPayload = {
                clusterID: resp.clusterId,
                header,
                data: resp.asduPayload,
                address: resp.srcAddrMode === 0x03 ? `0x${resp.srcAddr64!}` : resp.srcAddr16!,
                endpoint: resp.srcEndpoint,
                linkquality: resp.lqi,
                groupID: resp.destAddrMode === 0x01 ? resp.destAddr16! : 0,
                wasBroadcast: resp.destAddrMode === 0x01 || resp.destAddrMode === 0xf,
                destinationEndpoint: resp.destEndpoint,
            };

            this.waitress.resolve(payload);
            this.emit('zclPayload', payload);
        }
    }

    private nextTransactionID(): number {
        this.transactionID++;

        if (this.transactionID > 255) {
            this.transactionID = 1;
        }

        return this.transactionID;
    }

    private waitressTimeoutFormatter(matcher: WaitressMatcher, timeout: number): string {
        return (
            `Timeout - ${matcher.address} - ${matcher.endpoint}` +
            ` - ${matcher.transactionSequenceNumber} - ${matcher.clusterID}` +
            ` - ${matcher.commandIdentifier} after ${timeout}ms`
        );
    }

    private waitressValidator(payload: Events.ZclPayload, matcher: WaitressMatcher): boolean {
        return Boolean(
            payload.header &&
                (!matcher.address || payload.address === matcher.address) &&
                payload.endpoint === matcher.endpoint &&
                (!matcher.transactionSequenceNumber || payload.header.transactionSequenceNumber === matcher.transactionSequenceNumber) &&
                payload.clusterID === matcher.clusterID &&
                matcher.frameType === payload.header.frameControl.frameType &&
                matcher.commandIdentifier === payload.header.commandIdentifier &&
                matcher.direction === payload.header.frameControl.direction,
        );
    }
}

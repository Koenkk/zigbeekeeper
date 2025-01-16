/* v8 ignore start */

import {EventEmitter} from 'node:events';

import {wait, Waitress} from '../../../utils';
import {logger} from '../../../utils/logger';
import * as ZSpec from '../../../zspec';
import {Clusters} from '../../../zspec/zcl/definition/cluster';
import * as Zdo from '../../../zspec/zdo';
import {GenericZdoResponse} from '../../../zspec/zdo/definition/tstypes';
import {EZSPAdapterBackup} from '../adapter/backup';
import * as TsType from './../../tstype';
import {ParamsDesc} from './commands';
import {Ezsp, EZSPFrameData} from './ezsp';
import {Multicast} from './multicast';
import {EmberApsOption, EmberJoinDecision, EmberKeyData, EmberStatus, uint8_t, uint16_t} from './types';
import {
    EmberDerivedKeyType,
    EmberDeviceUpdate,
    EmberEUI64,
    EmberKeyType,
    EmberOutgoingMessageType,
    EmberStackError,
    EzspDecisionBitmask,
    EzspPolicyId,
    EzspValueId,
    SLStatus,
} from './types/named';
import {
    EmberAesMmoHashContext,
    EmberApsFrame,
    EmberIeeeRawFrame,
    EmberNetworkParameters,
    EmberRawFrame,
    EmberSecurityManagerContext,
} from './types/struct';

const NS = 'zh:ezsp:driv';

interface AddEndpointParameters {
    endpoint?: number;
    profileId?: number;
    deviceId?: number;
    appFlags?: number;
    inputClusters?: number[];
    outputClusters?: number[];
}

type EmberFrame = {
    address: number | string;
    payload: Buffer;
    frame: EmberApsFrame;
    zdoResponse?: GenericZdoResponse;
};

type EmberWaitressMatcher = {
    address: number | string;
    clusterId: number;
    sequence: number;
};

type IeeeMfg = {
    mfgId: number;
    prefix: number[];
};

export interface EmberIncomingMessage {
    messageType: number;
    apsFrame: EmberApsFrame;
    lqi: number;
    rssi: number;
    sender: number;
    bindingIndex: number;
    addressIndex: number;
    message: Buffer;
    senderEui64: EmberEUI64;
    zdoResponse?: GenericZdoResponse;
}

const IEEE_PREFIX_MFG_ID: IeeeMfg[] = [
    {mfgId: 0x115f, prefix: [0x04, 0xcf, 0xfc]},
    {mfgId: 0x115f, prefix: [0x54, 0xef, 0x44]},
];
const DEFAULT_MFG_ID = 0x1049;
// we make three attempts to send the request
const REQUEST_ATTEMPT_DELAYS = [500, 1000, 1500];

export class Driver extends EventEmitter {
    public ezsp!: Ezsp;
    public networkParams!: EmberNetworkParameters;
    public version!: {
        product: number;
        majorrel: string;
        minorrel: string;
        maintrel: string;
        revision: string;
    };
    private eui64ToNodeId = new Map<string, number>();
    // private eui64ToRelays = new Map<string, number>();
    public ieee!: EmberEUI64;
    private multicast!: Multicast;
    private waitress: Waitress<EmberFrame, EmberWaitressMatcher>;
    private transactionID = 1;
    private serialOpt: TsType.SerialPortOptions;
    public backupMan: EZSPAdapterBackup;
    private initNetwork: () => Promise<TsType.StartResult>;

    constructor(serialOpt: TsType.SerialPortOptions, backupPath: string, initNetwork: () => Promise<TsType.StartResult>) {
        super();

        this.serialOpt = serialOpt;
        this.waitress = new Waitress<EmberFrame, EmberWaitressMatcher>(this.waitressValidator, this.waitressTimeoutFormatter);
        this.backupMan = new EZSPAdapterBackup(this, backupPath);
        this.initNetwork = initNetwork;
    }

    /**
     * Requested by the EZSP watchdog after too many failures, or by UART layer after port closed unexpectedly.
     * Tries to stop the layers below and startup again.
     * @returns
     */
    public async reset(): Promise<void> {
        logger.debug(`Reset connection.`, NS);

        try {
            // don't emit 'close' on stop since we don't want this to bubble back up as 'disconnected' to the controller.
            await this.stop(false);
        } catch (err) {
            logger.debug(`Stop error ${err}`, NS);
        }
        try {
            await wait(1000);
            logger.debug(`Startup again.`, NS);
            await this.startup();
        } catch (err) {
            logger.debug(`Reset error ${err}`, NS);

            try {
                // here we let emit
                await this.stop();
            } catch (stopErr) {
                logger.debug(`Failed to stop after failed reset ${stopErr}`, NS);
            }
        }
    }

    private async onEzspReset(): Promise<void> {
        logger.debug('onEzspReset()', NS);
        await this.reset();
    }

    private onEzspClose(): void {
        logger.debug('onEzspClose()', NS);
        this.emit('close');
    }

    public async stop(emitClose: boolean = true): Promise<void> {
        logger.debug('Stopping driver', NS);

        if (this.ezsp) {
            return await this.ezsp.close(emitClose);
        }
    }

    public async startup(): Promise<TsType.StartResult> {
        this.transactionID = 1;
        this.ezsp = new Ezsp();
        this.ezsp.on('close', this.onEzspClose.bind(this));

        try {
            await this.ezsp.connect(this.serialOpt);
        } catch (error) {
            logger.debug(`EZSP could not connect: ${error}`, NS);

            throw error;
        }

        this.ezsp.on('reset', this.onEzspReset.bind(this));

        await this.ezsp.version();
        await this.ezsp.updateConfig();
        await this.ezsp.updatePolicies();
        //await this.ezsp.setValue(EzspValueId.VALUE_MAXIMUM_OUTGOING_TRANSFER_SIZE, 82);
        //await this.ezsp.setValue(EzspValueId.VALUE_MAXIMUM_INCOMING_TRANSFER_SIZE, 82);
        await this.ezsp.setValue(EzspValueId.VALUE_END_DEVICE_KEEP_ALIVE_SUPPORT_MODE, 3);
        await this.ezsp.setValue(EzspValueId.VALUE_CCA_THRESHOLD, 0);
        await this.ezsp.setSourceRouting();
        //const count = await ezsp.getConfigurationValue(EzspConfigId.CONFIG_APS_UNICAST_MESSAGE_COUNT);
        //logger.info("APS_UNICAST_MESSAGE_COUNT is set to %s", count, NS);
        await this.addEndpoint({
            inputClusters: [0x0000, 0x0003, 0x0006, 0x000a, 0x0019, 0x001a, 0x0300],
            outputClusters: [
                0x0000, 0x0003, 0x0004, 0x0005, 0x0006, 0x0008, 0x0020, 0x0300, 0x0400, 0x0402, 0x0405, 0x0406, 0x0500, 0x0b01, 0x0b03, 0x0b04,
                0x0702, 0x1000, 0xfc01, 0xfc02,
            ],
        });
        await this.addEndpoint({
            endpoint: 242,
            profileId: 0xa1e0,
            deviceId: 0x61,
            outputClusters: [0x0021],
        });

        // getting MFG_STRING token
        //const mfgName = await ezsp.execCommand('getMfgToken', EzspMfgTokenId.MFG_STRING);
        // getting MFG_BOARD_NAME token
        //const boardName = await ezsp.execCommand('getMfgToken', EzspMfgTokenId.MFG_BOARD_NAME);
        /* eslint-disable prefer-const */
        let verInfo = await this.ezsp.getValue(EzspValueId.VALUE_VERSION_INFO);
        let build, major, minor, patch, special;
        [build, verInfo] = uint16_t.deserialize(uint16_t, verInfo);
        [major, verInfo] = uint8_t.deserialize(uint8_t, verInfo);
        [minor, verInfo] = uint8_t.deserialize(uint8_t, verInfo);
        [patch, verInfo] = uint8_t.deserialize(uint8_t, verInfo);
        [special, verInfo] = uint8_t.deserialize(uint8_t, verInfo);
        /* eslint-enable prefer-const */
        const vers = `${major}.${minor}.${patch}.${special} build ${build}`;
        logger.debug(`EmberZNet version: ${vers}`, NS);
        this.version = {
            product: this.ezsp.ezspV,
            majorrel: `${major}`,
            minorrel: `${minor}`,
            maintrel: `${patch} `,
            revision: vers,
        };

        const result = await this.initNetwork();
        const state = (await this.ezsp.execCommand('networkState')).status;
        logger.debug(`Network state ${state}`, NS);

        const netParams = await this.ezsp.execCommand('getNetworkParameters');

        if (netParams.status != EmberStatus.SUCCESS) {
            logger.error(`Command (getNetworkParameters) returned unexpected state: ${netParams.status}`, NS);
        }

        this.networkParams = netParams.parameters;
        logger.debug(`Node type: ${netParams.nodeType}, Network parameters: ${this.networkParams}`, NS);

        const nwk = (await this.ezsp.execCommand('getNodeId')).nodeId;
        const ieee = (await this.ezsp.execCommand('getEui64')).eui64;
        this.ieee = new EmberEUI64(ieee);
        logger.debug('Network ready', NS);
        this.ezsp.on('frame', this.handleFrame.bind(this));
        logger.debug(`EZSP nwk=${nwk}, IEEE=0x${this.ieee}`, NS);
        const linkResult = await this.getKey(EmberKeyType.TRUST_CENTER_LINK_KEY);
        logger.debug(`TRUST_CENTER_LINK_KEY: ${JSON.stringify(linkResult)}`, NS);
        const netResult = await this.getKey(EmberKeyType.CURRENT_NETWORK_KEY);
        logger.debug(`CURRENT_NETWORK_KEY: ${JSON.stringify(netResult)}`, NS);

        await wait(1000);
        await this.ezsp.execCommand('setManufacturerCode', {code: DEFAULT_MFG_ID});

        this.multicast = new Multicast(this);
        await this.multicast.startup([]);
        await this.multicast.subscribe(ZSpec.GP_GROUP_ID, ZSpec.GP_ENDPOINT);
        // await this.multicast.subscribe(1, 901);

        return result;
    }

    private handleFrame(frameName: string, frame: EZSPFrameData): void {
        switch (true) {
            case frameName === 'incomingMessageHandler': {
                const apsFrame: EmberApsFrame = frame.apsFrame;

                if (apsFrame.profileId == Zdo.ZDO_PROFILE_ID && apsFrame.clusterId >= 0x8000 /* response only */) {
                    const zdoResponse = Zdo.Buffalo.readResponse(true, apsFrame.clusterId, frame.message);

                    if (apsFrame.clusterId === Zdo.ClusterId.NETWORK_ADDRESS_RESPONSE) {
                        // special case to properly resolve a NETWORK_ADDRESS_RESPONSE following a NETWORK_ADDRESS_REQUEST (based on EUI64 from ZDO payload)
                        // NOTE: if response has invalid status (no EUI64 available), response waiter will eventually time out
                        if (Zdo.Buffalo.checkStatus<Zdo.ClusterId.NETWORK_ADDRESS_RESPONSE>(zdoResponse)) {
                            const eui64 = zdoResponse[1].eui64;

                            // update cache with new network address
                            this.eui64ToNodeId.set(eui64, frame.sender);

                            this.waitress.resolve({
                                address: eui64,
                                payload: frame.message,
                                frame: apsFrame,
                                zdoResponse,
                            });
                        }
                    } else {
                        this.waitress.resolve({
                            address: frame.sender,
                            payload: frame.message,
                            frame: apsFrame,
                            zdoResponse,
                        });
                    }

                    // always pass ZDO to bubble up to controller
                    this.emit('incomingMessage', {
                        messageType: frame.type,
                        apsFrame,
                        lqi: frame.lastHopLqi,
                        rssi: frame.lastHopRssi,
                        sender: frame.sender,
                        bindingIndex: frame.bindingIndex,
                        addressIndex: frame.addressIndex,
                        message: frame.message,
                        senderEui64: this.eui64ToNodeId.get(frame.sender),
                        zdoResponse,
                    });
                } else {
                    const handled = this.waitress.resolve({
                        address: frame.sender,
                        payload: frame.message,
                        frame: apsFrame,
                    });

                    if (!handled) {
                        this.emit('incomingMessage', {
                            messageType: frame.type,
                            apsFrame,
                            lqi: frame.lastHopLqi,
                            rssi: frame.lastHopRssi,
                            sender: frame.sender,
                            bindingIndex: frame.bindingIndex,
                            addressIndex: frame.addressIndex,
                            message: frame.message,
                            senderEui64: this.eui64ToNodeId.get(frame.sender),
                        });
                    }
                }
                break;
            }
            case frameName === 'trustCenterJoinHandler': {
                if (frame.status === EmberDeviceUpdate.DEVICE_LEFT) {
                    this.handleNodeLeft(frame.newNodeId, frame.newNodeEui64);
                } else {
                    if (frame.policyDecision !== EmberJoinDecision.DENY_JOIN) {
                        this.handleNodeJoined(frame.newNodeId, frame.newNodeEui64);
                    }
                }
                break;
            }
            case frameName === 'incomingRouteRecordHandler': {
                this.handleRouteRecord(frame.source, frame.longId, frame.lastHopLqi, frame.lastHopRssi, frame.relay);
                break;
            }
            case frameName === 'incomingRouteErrorHandler': {
                this.handleRouteError(frame.status, frame.target);
                break;
            }
            case frameName === 'incomingNetworkStatusHandler': {
                this.handleNetworkStatus(frame.errorCode, frame.target);
                break;
            }
            case frameName === 'messageSentHandler': {
                // todo
                const status = frame.status;
                if (status != 0) {
                    // send failure
                    logger.debug(() => `Delivery failed for ${JSON.stringify(frame)}.`, NS);
                } else {
                    // send success
                    // If there was a message to the group and this group is not known,
                    // then we will register the coordinator in this group
                    // Applicable for IKEA remotes
                    const msgType = frame.type;
                    if (msgType == EmberOutgoingMessageType.OUTGOING_MULTICAST) {
                        const apsFrame = frame.apsFrame;
                        if (apsFrame.destinationEndpoint == 255) {
                            // eslint-disable-next-line @typescript-eslint/no-floating-promises
                            this.multicast.subscribe(apsFrame.groupId, 1);
                        }
                    }
                }
                break;
            }
            case frameName === 'macFilterMatchMessageHandler': {
                const [rawFrame, data] = EmberIeeeRawFrame.deserialize(EmberIeeeRawFrame, frame.message);
                logger.debug(`macFilterMatchMessageHandler frame message: ${rawFrame}`, NS);
                this.emit('incomingMessage', {
                    messageType: null,
                    apsFrame: rawFrame,
                    lqi: frame.lastHopLqi,
                    rssi: frame.lastHopRssi,
                    sender: null,
                    bindingIndex: null,
                    addressIndex: null,
                    message: data,
                    senderEui64: new EmberEUI64(rawFrame.sourceAddress),
                });
                break;
            }
            case frameName === 'stackStatusHandler': {
                logger.debug(`stackStatusHandler: ${EmberStatus.valueToName(EmberStatus, frame.status)}`, NS);
                break;
            }
            // case (frameName === 'childJoinHandler'): {
            //     if (!frame.joining) {
            //         this.handleNodeLeft(frame.childId, frame.childEui64);
            //     } else {
            //         this.handleNodeJoined(frame.childId, frame.childEui64);
            //     }
            //     break;
            // }
            case frameName == 'gpepIncomingMessageHandler': {
                let commandIdentifier = Clusters.greenPower.commands.notification.ID;

                if (frame.gpdCommandId === 0xe0) {
                    if (!frame.gpdCommandPayload.length) {
                        // XXX: seem to be receiving duplicate commissioningNotification from some devices, second one with empty payload?
                        //      this will mess with the process no doubt, so dropping them
                        return;
                    }

                    commandIdentifier = Clusters.greenPower.commands.commissioningNotification.ID;
                }

                const gpdHeader = Buffer.alloc(15);
                gpdHeader.writeUInt8(0b00000001, 0); // frameControl: FrameType.SPECIFIC + Direction.CLIENT_TO_SERVER + disableDefaultResponse=false
                gpdHeader.writeUInt8(frame.sequenceNumber, 1); // transactionSequenceNumber
                gpdHeader.writeUInt8(commandIdentifier, 2); // commandIdentifier
                gpdHeader.writeUInt16LE(0, 3); // options XXX: bypassed, same as deconz https://github.com/Koenkk/zigbee-herdsman/pull/536
                gpdHeader.writeUInt32LE(frame.srcId, 5); // srcID
                // omitted: gpdIEEEAddr ieeeAddr
                // omitted: gpdEndpoint uint8
                gpdHeader.writeUInt32LE(frame.gpdSecurityFrameCounter, 9); // frameCounter
                gpdHeader.writeUInt8(frame.gpdCommandId, 13); // commandID
                gpdHeader.writeUInt8(frame.gpdCommandPayload.length, 14); // payloadSize

                const gpdMessage = {
                    messageType: frame.gpdCommandId,
                    apsFrame: {
                        profileId: 0xa1e0,
                        sourceEndpoint: 242,
                        clusterId: 0x0021,
                        sequence: frame.sequenceNumber,
                    },
                    lqi: frame.gpdLink,
                    message: Buffer.concat([gpdHeader, frame.gpdCommandPayload]),
                    sender: frame.addr,
                };
                this.emit('incomingMessage', gpdMessage);
                break;
            }
            default:
                // <=== Application frame 35 (childJoinHandler) received: 00013e9c2ebd08feff9ffd9004 +1ms
                // <=== Application frame 35 (childJoinHandler)   parsed: 0,1,39998,144,253,159,255,254,8,189,46,4 +1ms
                // Unhandled frame childJoinHandler +2s
                // <=== Application frame 98 (incomingSenderEui64Handler) received: 2ebd08feff9ffd90 +2ms
                // <=== Application frame 98 (incomingSenderEui64Handler)   parsed: 144,253,159,255,254,8,189,46 +1ms
                // Unhandled frame incomingSenderEui64Handler
                // <=== Application frame 155 (zigbeeKeyEstablishmentHandler) received: 2ebd08feff9ffd9006 +2ms
                // <=== Application frame 155 (zigbeeKeyEstablishmentHandler)   parsed: 144,253,159,255,254,8,189,46,6 +2ms
                // Unhandled frame zigbeeKeyEstablishmentHandler
                logger.debug(`Unhandled frame ${frameName}`, NS);
        }
    }

    private handleRouteRecord(nwk: number, ieee: EmberEUI64 | number[], lqi: number, rssi: number, relays: number): void {
        // todo
        logger.debug(`handleRouteRecord: nwk=${nwk}, ieee=${ieee.toString()}, lqi=${lqi}, rssi=${rssi}, relays=${relays}`, NS);

        this.setNode(nwk, ieee);
        // if (ieee && !(ieee instanceof EmberEUI64)) {
        //     ieee = new EmberEUI64(ieee);
        // }
        // this.eui64ToRelays.set(ieee.toString(), relays);
    }

    private handleRouteError(status: EmberStatus, nwk: number): void {
        // todo
        logger.debug(`handleRouteError: nwk=${nwk}, status=${status}`, NS);
        //this.waitress.reject({address: nwk, payload: null, frame: null}, 'Route error');
        // const ieee = await this.networkIdToEUI64(nwk);
        // this.eui64ToRelays.set(ieee.toString(), null);
    }

    private handleNetworkStatus(errorCode: EmberStackError, nwk: number): void {
        // todo
        // <== Frame: e19401c4000684c5
        // <== 0xc4: {
        //     "_cls_":"incomingNetworkStatusHandler",
        //     "_id_":196,
        //     "_isRequest_":false,
        //     "errorCode":6,
        //     "target":50564
        // }
        // https://docs.silabs.com/d/zigbee-stack-api/7.4.0/message#ember-incoming-network-status-handler
        logger.debug(`handleNetworkStatus: nwk=${nwk}, errorCode=${errorCode}`, NS);
    }

    private handleNodeLeft(nwk: number, ieee: EmberEUI64 | number[]): void {
        if (ieee && !(ieee instanceof EmberEUI64)) {
            ieee = new EmberEUI64(ieee);
        }

        this.eui64ToNodeId.delete(ieee.toString());
        this.emit('deviceLeft', nwk, ieee);
    }

    private async resetMfgId(mfgId: number): Promise<void> {
        await this.ezsp.execCommand('setManufacturerCode', {code: mfgId});
        // 60 sec for waiting
        await wait(60000);
        await this.ezsp.execCommand('setManufacturerCode', {code: DEFAULT_MFG_ID});
    }

    public handleNodeJoined(nwk: number, ieee: EmberEUI64 | number[]): void {
        if (ieee && !(ieee instanceof EmberEUI64)) {
            ieee = new EmberEUI64(ieee);
        }

        for (const rec of IEEE_PREFIX_MFG_ID) {
            if (Buffer.from(ieee.value).indexOf(Buffer.from(rec.prefix)) == 0) {
                // set ManufacturerCode
                logger.debug(`handleNodeJoined: change ManufacturerCode for ieee ${ieee} to ${rec.mfgId}`, NS);
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                this.resetMfgId(rec.mfgId);
                break;
            }
        }

        this.eui64ToNodeId.set(ieee.toString(), nwk);
        this.emit('deviceJoined', nwk, ieee);
    }

    public setNode(nwk: number, ieee: EmberEUI64 | number[]): void {
        if (ieee && !(ieee instanceof EmberEUI64)) {
            ieee = new EmberEUI64(ieee);
        }

        this.eui64ToNodeId.set(ieee.toString(), nwk);
    }

    public async request(nwk: number | EmberEUI64, apsFrame: EmberApsFrame, data: Buffer, extendedTimeout = false): Promise<boolean> {
        let result = false;

        for (const delay of REQUEST_ATTEMPT_DELAYS) {
            try {
                const seq = (apsFrame.sequence + 1) & 0xff;
                let eui64: EmberEUI64;

                if (typeof nwk !== 'number') {
                    eui64 = nwk as EmberEUI64;
                    const strEui64 = eui64.toString();
                    let nodeId = this.eui64ToNodeId.get(strEui64);

                    if (nodeId === undefined) {
                        nodeId = (await this.ezsp.execCommand('lookupNodeIdByEui64', {eui64: eui64})).nodeId;

                        if (nodeId && nodeId !== 0xffff) {
                            this.eui64ToNodeId.set(strEui64, nodeId);
                        } else {
                            throw new Error('Unknown EUI64:' + strEui64);
                        }
                    }
                    nwk = nodeId;
                } else {
                    eui64 = await this.networkIdToEUI64(nwk);
                }

                if (this.ezsp.ezspV < 8) {
                    // const route = this.eui64ToRelays.get(eui64.toString());
                    // if (route) {
                    //     const = await this.ezsp.execCommand('setSourceRoute', {eui64});
                    // // }
                }

                if (extendedTimeout) {
                    await this.ezsp.execCommand('setExtendedTimeout', {remoteEui64: eui64, extendedTimeout: true});
                }

                const sendResult = await this.ezsp.sendUnicast(EmberOutgoingMessageType.OUTGOING_DIRECT, nwk, apsFrame, seq, data);

                // repeat only for these statuses
                if ([EmberStatus.MAX_MESSAGE_LIMIT_REACHED, EmberStatus.NO_BUFFERS, EmberStatus.NETWORK_BUSY].includes(sendResult.status)) {
                    // need to repeat after pause
                    logger.error(`Request send status ${sendResult.status}. Attempt to repeat the request`, NS);

                    await wait(delay);
                } else {
                    result = sendResult.status == EmberStatus.SUCCESS;
                    break;
                }
            } catch (e) {
                logger.debug(`Request error ${e}`, NS);
                break;
            }
        }

        return result;
    }

    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    public async mrequest(apsFrame: EmberApsFrame, data: Buffer, timeout = 30000): Promise<boolean> {
        try {
            const seq = (apsFrame.sequence + 1) & 0xff;
            await this.ezsp.sendMulticast(apsFrame, seq, data);
            return true;
        } catch {
            return false;
        }
    }

    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    public async rawrequest(rawFrame: EmberRawFrame, data: Buffer, timeout = 10000): Promise<boolean> {
        try {
            const msgData = Buffer.concat([EmberRawFrame.serialize(EmberRawFrame, rawFrame), data]);
            await this.ezsp.execCommand('sendRawMessage', {message: msgData});
            return true;
        } catch (e) {
            logger.debug(`Request error ${e}`, NS);
            return false;
        }
    }

    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    public async ieeerawrequest(rawFrame: EmberIeeeRawFrame, data: Buffer, timeout = 10000): Promise<boolean> {
        try {
            const msgData = Buffer.concat([EmberIeeeRawFrame.serialize(EmberIeeeRawFrame, rawFrame), data]);
            await this.ezsp.execCommand('sendRawMessage', {message: msgData});
            return true;
        } catch (e) {
            logger.debug(`Request error ${e}`, NS);
            return false;
        }
    }

    public async brequest(destination: number, apsFrame: EmberApsFrame, data: Buffer): Promise<boolean> {
        try {
            const seq = (apsFrame.sequence + 1) & 0xff;
            await this.ezsp.sendBroadcast(destination, apsFrame, seq, data);
            return true;
        } catch {
            return false;
        }
    }

    private nextTransactionID(): number {
        this.transactionID = (this.transactionID + 1) & 0xff;
        return this.transactionID;
    }

    public makeApsFrame(clusterId: number, disableResponse: boolean): EmberApsFrame {
        const frame = new EmberApsFrame();
        frame.clusterId = clusterId;
        frame.profileId = 0;
        frame.sequence = this.nextTransactionID();
        frame.sourceEndpoint = 0;
        frame.destinationEndpoint = 0;
        frame.groupId = 0;
        frame.options = EmberApsOption.APS_OPTION_ENABLE_ROUTE_DISCOVERY || EmberApsOption.APS_OPTION_ENABLE_ADDRESS_DISCOVERY;

        if (!disableResponse) {
            frame.options ||= EmberApsOption.APS_OPTION_RETRY;
        }

        return frame;
    }

    public makeEmberRawFrame(): EmberRawFrame {
        const frame = new EmberRawFrame();
        frame.sequence = this.nextTransactionID();
        return frame;
    }

    public makeEmberIeeeRawFrame(): EmberIeeeRawFrame {
        const frame = new EmberIeeeRawFrame();
        frame.sequence = this.nextTransactionID();
        return frame;
    }

    public async networkIdToEUI64(nwk: number): Promise<EmberEUI64> {
        for (const [eUI64, value] of this.eui64ToNodeId) {
            if (value === nwk) return new EmberEUI64(eUI64);
        }

        const value = await this.ezsp.execCommand('lookupEui64ByNodeId', {nodeId: nwk});

        if (value.status === EmberStatus.SUCCESS) {
            const eUI64 = new EmberEUI64(value.eui64);
            this.eui64ToNodeId.set(eUI64.toString(), nwk);

            return eUI64;
        } else {
            throw new Error('Unrecognized nodeId:' + nwk);
        }
    }

    public async preJoining(seconds: number): Promise<void> {
        if (seconds) {
            const ieee = new EmberEUI64('0xFFFFFFFFFFFFFFFF');
            const linkKey = new EmberKeyData();
            linkKey.contents = Buffer.from('ZigBeeAlliance09');
            const result = await this.addTransientLinkKey(ieee, linkKey);

            if (result.status !== EmberStatus.SUCCESS) {
                throw new Error(`Add Transient Link Key for '${ieee}' failed`);
            }

            if (this.ezsp.ezspV >= 8) {
                await this.ezsp.setPolicy(
                    EzspPolicyId.TRUST_CENTER_POLICY,
                    EzspDecisionBitmask.ALLOW_UNSECURED_REJOINS | EzspDecisionBitmask.ALLOW_JOINS,
                );
                //| EzspDecisionBitmask.JOINS_USE_INSTALL_CODE_KEY
            }
        } else {
            await this.ezsp.execCommand('clearTransientLinkKeys');
        }
    }

    public async permitJoining(seconds: number): Promise<EZSPFrameData> {
        return await this.ezsp.execCommand('permitJoining', {duration: seconds});
    }

    public makeZDOframe(name: string | number, params: ParamsDesc): Buffer {
        return this.ezsp.makeZDOframe(name, params);
    }

    public async addEndpoint({
        endpoint = 1,
        profileId = 260,
        deviceId = 0xbeef,
        appFlags = 0,
        inputClusters = [],
        outputClusters = [],
    }: AddEndpointParameters): Promise<void> {
        const res = await this.ezsp.execCommand('addEndpoint', {
            endpoint: endpoint,
            profileId: profileId,
            deviceId: deviceId,
            appFlags: appFlags,
            inputClusterCount: inputClusters.length,
            outputClusterCount: outputClusters.length,
            inputClusterList: inputClusters,
            outputClusterList: outputClusters,
        });
        logger.debug(() => `Ezsp adding endpoint: ${JSON.stringify(res)}`, NS);
    }

    public waitFor(
        address: number | string,
        clusterId: number,
        sequence: number,
        timeout = 10000,
    ): ReturnType<typeof this.waitress.waitFor> & {cancel: () => void} {
        const waiter = this.waitress.waitFor({address, clusterId, sequence}, timeout);

        return {...waiter, cancel: () => this.waitress.remove(waiter.ID)};
    }

    private waitressTimeoutFormatter(matcher: EmberWaitressMatcher, timeout: number): string {
        return `${JSON.stringify(matcher)} after ${timeout}ms`;
    }

    private waitressValidator(payload: EmberFrame, matcher: EmberWaitressMatcher): boolean {
        return (
            (!matcher.address || payload.address === matcher.address) &&
            (!payload.frame || payload.frame.clusterId === matcher.clusterId) &&
            (!payload.frame || payload.payload[0] === matcher.sequence)
        );
    }

    public setChannel(channel: number): Promise<EZSPFrameData> {
        return this.ezsp.execCommand('setLogicalAndRadioChannel', {radioChannel: channel});
    }

    public addTransientLinkKey(partner: EmberEUI64, transientKey: EmberKeyData): Promise<EZSPFrameData> {
        if (this.ezsp.ezspV < 13) {
            return this.ezsp.execCommand('addTransientLinkKey', {partner, transientKey});
        } else {
            return this.ezsp.execCommand('importTransientKey', {partner, transientKey, flags: 0});
        }
    }

    public async addInstallCode(ieeeAddress: string, key: Buffer): Promise<void> {
        // Key need to be converted to aes hash string
        const hc = new EmberAesMmoHashContext();
        hc.result = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        hc.length = 0;
        const hash = await this.ezsp.execCommand('aesMmoHash', {context: hc, finalize: true, data: key});
        if (hash.status == EmberStatus.SUCCESS) {
            const ieee = new EmberEUI64(ieeeAddress);
            const linkKey = new EmberKeyData();
            linkKey.contents = hash.returnContext.result;
            const result = await this.addTransientLinkKey(ieee, linkKey);
            if (result.status !== EmberStatus.SUCCESS) {
                throw new Error(`Add install code for '${ieeeAddress}' failed`);
            }
        } else {
            throw new Error(`Add install code for '${ieeeAddress}' failed`);
        }
    }

    public async getKey(keyType: EmberKeyType): Promise<EZSPFrameData> {
        if (this.ezsp.ezspV < 13) {
            return await this.ezsp.execCommand('getKey', {keyType});
        } else {
            // Mapping EmberKeyType to SecManKeyType (ezsp13)
            const SecManKeyType = {
                [EmberKeyType.TRUST_CENTER_LINK_KEY]: 2,
                [EmberKeyType.CURRENT_NETWORK_KEY]: 1,
            };
            const smc = new EmberSecurityManagerContext();
            smc.type = SecManKeyType[keyType as number];
            smc.index = 0;
            smc.derivedType = EmberDerivedKeyType.NONE;
            smc.eui64 = new EmberEUI64('0x0000000000000000');
            smc.multiNetworkIndex = 0;
            smc.flags = 0;
            smc.psaKeyAlgPermission = 0;
            const keyInfo = await this.ezsp.execCommand('exportKey', {context: smc});

            if (keyInfo.status !== SLStatus.SL_STATUS_OK) {
                logger.error(`exportKey(${EmberKeyType.valueToName(EmberKeyType, keyType)}) returned unexpected SL status: ${keyInfo.status}`, NS);
            }
            return keyInfo;
        }
    }

    public async getNetworkKeyInfo(): Promise<EZSPFrameData> {
        if (this.ezsp.ezspV < 13) {
            throw new Error(`getNetKeyInfo(): Invalid call on EZSP < 13.`);
        } else {
            const keyInfo = await this.ezsp.execCommand('getNetworkKeyInfo');
            if (keyInfo.status !== SLStatus.SL_STATUS_OK) {
                logger.error(`getNetworkKeyInfo() returned unexpected SL status: ${keyInfo.status}`, NS);
            }

            return keyInfo;
        }
    }
}

/* v8 ignore start */

import assert from 'node:assert';

import * as Models from '../../../models';
import {Queue, wait, Waitress} from '../../../utils';
import {logger} from '../../../utils/logger';
import * as ZSpec from '../../../zspec';
import * as Zcl from '../../../zspec/zcl';
import * as Zdo from '../../../zspec/zdo';
import * as ZdoTypes from '../../../zspec/zdo/definition/tstypes';
import Adapter from '../../adapter';
import {ZclPayload} from '../../events';
import {AdapterOptions, CoordinatorVersion, NetworkOptions, NetworkParameters, SerialPortOptions, StartResult} from '../../tstype';
import {Driver, EmberIncomingMessage} from '../driver';
import {
    EmberEUI64,
    EmberInitialSecurityBitmask,
    EmberInitialSecurityState,
    EmberJoinMethod,
    EmberKeyData,
    EmberKeyStruct,
    EmberKeyType,
    EmberNetworkParameters,
    EmberNodeType,
    EmberStatus,
    EzspValueId,
} from '../driver/types';
import {ember_security} from '../driver/utils';

const NS = 'zh:ezsp';

interface WaitressMatcher {
    address?: number | string;
    endpoint: number;
    transactionSequenceNumber?: number;
    clusterID: number;
    commandIdentifier: number;
}

export class EZSPAdapter extends Adapter {
    private driver: Driver;
    private waitress: Waitress<ZclPayload, WaitressMatcher>;
    private interpanLock: boolean;
    private queue: Queue;
    private closing: boolean;

    public constructor(networkOptions: NetworkOptions, serialPortOptions: SerialPortOptions, backupPath: string, adapterOptions: AdapterOptions) {
        super(networkOptions, serialPortOptions, backupPath, adapterOptions);
        this.hasZdoMessageOverhead = true;
        this.manufacturerID = Zcl.ManufacturerCode.SILICON_LABORATORIES;

        this.waitress = new Waitress<ZclPayload, WaitressMatcher>(this.waitressValidator, this.waitressTimeoutFormatter);
        this.interpanLock = false;
        this.closing = false;

        const concurrent = adapterOptions && adapterOptions.concurrent ? adapterOptions.concurrent : 8;
        logger.debug(`Adapter concurrent: ${concurrent}`, NS);
        this.queue = new Queue(concurrent);

        this.driver = new Driver(this.serialPortOptions, backupPath, this.initNetwork.bind(this));
        this.driver.on('close', this.onDriverClose.bind(this));
        this.driver.on('deviceJoined', this.handleDeviceJoin.bind(this));
        this.driver.on('deviceLeft', this.handleDeviceLeft.bind(this));
        this.driver.on('incomingMessage', this.processMessage.bind(this));
    }

    private async processMessage(frame: EmberIncomingMessage): Promise<void> {
        logger.debug(() => `processMessage: ${JSON.stringify(frame)}`, NS);

        if (frame.apsFrame.profileId == Zdo.ZDO_PROFILE_ID) {
            if (frame.apsFrame.clusterId >= 0x8000 /* response only */) {
                this.emit('zdoResponse', frame.apsFrame.clusterId, frame.zdoResponse!);
            }
        } else if (frame.apsFrame.profileId == ZSpec.HA_PROFILE_ID || frame.apsFrame.profileId == 0xffff) {
            const payload: ZclPayload = {
                clusterID: frame.apsFrame.clusterId,
                header: Zcl.Header.fromBuffer(frame.message),
                data: frame.message,
                address: frame.sender,
                endpoint: frame.apsFrame.sourceEndpoint,
                linkquality: frame.lqi,
                groupID: frame.apsFrame.groupId ?? 0,
                wasBroadcast: false, // TODO
                destinationEndpoint: frame.apsFrame.destinationEndpoint,
            };

            this.waitress.resolve(payload);
            this.emit('zclPayload', payload);
        } else if (frame.apsFrame.profileId == ZSpec.TOUCHLINK_PROFILE_ID && frame.senderEui64) {
            // ZLL Frame
            const payload: ZclPayload = {
                clusterID: frame.apsFrame.clusterId,
                header: Zcl.Header.fromBuffer(frame.message),
                data: frame.message,
                address: `0x${frame.senderEui64.toString()}`,
                endpoint: 0xfe,
                linkquality: frame.lqi,
                groupID: 0,
                wasBroadcast: false,
                destinationEndpoint: 1,
            };

            this.waitress.resolve(payload);
            this.emit('zclPayload', payload);
        } else if (frame.apsFrame.profileId == ZSpec.GP_PROFILE_ID) {
            // GP Frame
            // Only handle when clusterId == 33 (greenPower), some devices send messages with this profileId
            // while the cluster is not greenPower
            // https://github.com/Koenkk/zigbee2mqtt/issues/20838
            if (frame.apsFrame.clusterId === Zcl.Clusters.greenPower.ID) {
                const payload: ZclPayload = {
                    header: Zcl.Header.fromBuffer(frame.message),
                    clusterID: frame.apsFrame.clusterId,
                    data: frame.message,
                    address: frame.sender,
                    endpoint: frame.apsFrame.sourceEndpoint,
                    linkquality: frame.lqi,
                    groupID: 0,
                    wasBroadcast: true,
                    destinationEndpoint: frame.apsFrame.sourceEndpoint,
                };

                this.waitress.resolve(payload);
                this.emit('zclPayload', payload);
            } else {
                logger.debug(`Ignoring GP frame because clusterId is not greenPower`, NS);
            }
        }
    }

    private async handleDeviceJoin(nwk: number, ieee: EmberEUI64): Promise<void> {
        logger.debug(() => `Device join request received: ${nwk} ${ieee.toString()}`, NS);

        this.emit('deviceJoined', {
            networkAddress: nwk,
            ieeeAddr: `0x${ieee.toString()}`,
        });
    }

    private handleDeviceLeft(nwk: number, ieee: EmberEUI64): void {
        logger.debug(() => `Device left network request received: ${nwk} ${ieee.toString()}`, NS);

        this.emit('deviceLeave', {
            networkAddress: nwk,
            ieeeAddr: `0x${ieee.toString()}`,
        });
    }

    /**
     * Adapter methods
     */
    public async start(): Promise<StartResult> {
        logger.warning(
            `'ezsp' driver is deprecated and will only remain to provide support for older firmware (pre 7.4.x). Migration to 'ember' is recommended. If using Zigbee2MQTT see https://github.com/Koenkk/zigbee2mqtt/discussions/21462`,
            NS,
        );

        const result = await this.driver.startup();

        if (this.adapterOptions.transmitPower != undefined && this.driver.networkParams.radioTxPower !== this.adapterOptions.transmitPower) {
            await this.driver.ezsp.execCommand('setRadioPower', {power: this.adapterOptions.transmitPower});
        }

        return result;
    }

    public async stop(): Promise<void> {
        this.closing = true;
        await this.driver.stop();
    }

    /**
     * Check the network status on the adapter (execute the necessary pre-steps to be able to get it).
     * WARNING: This is a one-off. Should not be called outside of `initNetwork`.
     */
    protected async initHasNetwork(): Promise<[true, panID: number, extendedPanID: Buffer] | [false, panID: undefined, extendedPanID: undefined]> {
        const hasNetwork = await this.driver.ezsp.networkInit();

        if (hasNetwork) {
            const {status, nodeType, parameters} = await this.driver.ezsp.execCommand('getNetworkParameters');

            if (status !== EmberStatus.SUCCESS) {
                throw new Error(`Failed to get network parameters`);
            }

            // force forming in case current network is `ROUTER` type
            if (nodeType !== EmberNodeType.COORDINATOR) {
                return [false, undefined, undefined];
            }

            logger.debug(
                () => `Current adapter network: nodeType=${EmberNodeType.valueToName(EmberNodeType, nodeType)} params=${JSON.stringify(parameters)}`,
                NS,
            );

            return [true, (parameters as EmberNetworkParameters).panId, (parameters as EmberNetworkParameters).extendedPanId];
        }

        return [false, undefined, undefined];
    }

    public async leaveNetwork(): Promise<void> {
        await this.driver.ezsp.leaveNetwork();
    }

    public async formNetwork(backup?: Models.Backup): Promise<void> {
        await this.driver.ezsp.execCommand('clearTransientLinkKeys');

        if (backup) {
            const initial_security_state: EmberInitialSecurityState = ember_security(backup.networkOptions.networkKey);
            initial_security_state.bitmask |= EmberInitialSecurityBitmask.NO_FRAME_COUNTER_RESET;
            initial_security_state.networkKeySequenceNumber = backup.networkKeyInfo.sequenceNumber;
            // valid from `checkBackup`
            initial_security_state.preconfiguredKey.contents = backup.ezsp!.hashed_tclk!;

            await this.driver.ezsp.setInitialSecurityState(initial_security_state);
        } else {
            await this.driver.ezsp.execCommand('clearKeyTable');
            const initial_security_state: EmberInitialSecurityState = ember_security(Buffer.from(this.networkOptions.networkKey));

            await this.driver.ezsp.setInitialSecurityState(initial_security_state);
        }

        const parameters: EmberNetworkParameters = new EmberNetworkParameters();
        parameters.radioTxPower = this.adapterOptions.transmitPower ?? 5;
        parameters.joinMethod = EmberJoinMethod.USE_MAC_ASSOCIATION;
        parameters.nwkManagerId = 0;
        parameters.nwkUpdateId = 0;
        parameters.channels = 0x07fff800; // all channels

        if (backup) {
            parameters.panId = backup.networkOptions.panId;
            parameters.extendedPanId = backup.networkOptions.extendedPanId;
            parameters.radioChannel = backup.logicalChannel;
            parameters.nwkUpdateId = backup.networkUpdateId;
        } else {
            parameters.radioChannel = this.networkOptions.channelList[0];
            parameters.panId = this.networkOptions.panID;
            parameters.extendedPanId = Buffer.from(this.networkOptions.extendedPanID);
        }

        await this.driver.ezsp.formNetwork(parameters);
        await this.driver.ezsp.setValue(EzspValueId.VALUE_STACK_TOKEN_WRITING, 1);
    }

    public async getNetworkKey(): Promise<Buffer> {
        const networkKey = await this.driver.getKey(EmberKeyType.CURRENT_NETWORK_KEY);

        if (this.driver.ezsp.ezspV < 13) {
            return Buffer.from((networkKey.keyStruct as EmberKeyStruct).key.contents);
        } else {
            return Buffer.from((networkKey.keyData as EmberKeyData).contents);
        }
    }

    public async onDriverClose(): Promise<void> {
        logger.debug(`onDriverClose()`, NS);

        if (!this.closing) {
            this.emit('disconnected');
        }
    }

    public async getCoordinatorIEEE(): Promise<string> {
        return `0x${this.driver.ieee.toString()}`;
    }

    public async permitJoin(seconds: number, networkAddress?: number): Promise<void> {
        if (!this.driver.ezsp.isInitialized()) {
            return;
        }

        const clusterId = Zdo.ClusterId.PERMIT_JOINING_REQUEST;

        if (networkAddress) {
            // specific device that is not `Coordinator`
            await this.queue.execute<void>(async () => {
                this.checkInterpanLock();
                await this.driver.preJoining(seconds);
            });

            // `authentication`: TC significance always 1 (zb specs)
            const zdoPayload = Zdo.Buffalo.buildRequest(this.hasZdoMessageOverhead, clusterId, seconds, 1, []);

            const result = await this.sendZdo(ZSpec.BLANK_EUI64, networkAddress, clusterId, zdoPayload, false);

            if (!Zdo.Buffalo.checkStatus(result)) {
                // TODO: will disappear once moved upstream
                throw new Zdo.StatusError(result[0]);
            }
        } else {
            // coordinator-only (0), or all
            await this.queue.execute<void>(async () => {
                this.checkInterpanLock();
                await this.driver.preJoining(seconds);
            });

            const result = await this.driver.permitJoining(seconds);

            if (result.status !== EmberStatus.SUCCESS) {
                throw new Error(`[ZDO] Failed coordinator permit joining request with status=${result.status}.`);
            }

            logger.debug(`Permit joining on coordinator for ${seconds} sec.`, NS);

            // broadcast permit joining ZDO
            if (networkAddress === undefined) {
                // `authentication`: TC significance always 1 (zb specs)
                const zdoPayload = Zdo.Buffalo.buildRequest(this.hasZdoMessageOverhead, clusterId, seconds, 1, []);

                await this.sendZdo(ZSpec.BLANK_EUI64, ZSpec.BroadcastAddress.DEFAULT, clusterId, zdoPayload, true);
            }
        }
    }

    public async getCoordinatorVersion(): Promise<CoordinatorVersion> {
        return {type: `EZSP v${this.driver.version.product}`, meta: this.driver.version};
    }

    public async addInstallCode(ieeeAddress: string, key: Buffer): Promise<void> {
        if ([8, 10, 14, 16, 18].indexOf(key.length) === -1) {
            throw new Error('Wrong install code length');
        }
        await this.driver.addInstallCode(ieeeAddress, key);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async reset(type: 'soft' | 'hard'): Promise<void> {
        return await Promise.reject(new Error('Not supported'));
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
        return await this.queue.execute(async () => {
            this.checkInterpanLock();

            const clusterName = Zdo.ClusterId[clusterId];
            const frame = this.driver.makeApsFrame(clusterId, disableResponse);
            payload[0] = frame.sequence;
            let waiter: ReturnType<typeof this.driver.waitFor> | undefined;
            let responseClusterId: number | undefined;

            if (!disableResponse) {
                responseClusterId = Zdo.Utils.getResponseClusterId(clusterId);

                if (responseClusterId) {
                    waiter = this.driver.waitFor(
                        responseClusterId === Zdo.ClusterId.NETWORK_ADDRESS_RESPONSE ? ieeeAddress : networkAddress,
                        responseClusterId,
                        frame.sequence,
                    );
                }
            }

            if (ZSpec.Utils.isBroadcastAddress(networkAddress)) {
                logger.debug(() => `~~~> [ZDO ${clusterName} BROADCAST to=${networkAddress} payload=${payload.toString('hex')}]`, NS);

                const req = await this.driver.brequest(networkAddress, frame, payload);

                logger.debug(`~~~> [SENT ZDO BROADCAST]`, NS);

                if (!req) {
                    waiter?.cancel();
                    throw new Error(`~x~> [ZDO ${clusterName} BROADCAST to=${networkAddress}] Failed to send request.`);
                }
            } else {
                logger.debug(() => `~~~> [ZDO ${clusterName} UNICAST to=${ieeeAddress}:${networkAddress} payload=${payload.toString('hex')}]`, NS);

                const req = await this.driver.request(networkAddress, frame, payload);

                logger.debug(`~~~> [SENT ZDO UNICAST]`, NS);

                if (!req) {
                    waiter?.cancel();
                    throw new Error(`~x~> [ZDO ${clusterName} UNICAST to=${ieeeAddress}:${networkAddress}] Failed to send request.`);
                }
            }

            if (waiter && responseClusterId !== undefined) {
                const response = await waiter.start().promise;

                logger.debug(() => `<~~ [ZDO ${Zdo.ClusterId[responseClusterId]} ${JSON.stringify(response.zdoResponse!)}]`, NS);

                return response.zdoResponse! as ZdoTypes.RequestToResponseMap[K];
            }
        }, networkAddress);
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
    ): Promise<ZclPayload | void> {
        return await this.queue.execute<ZclPayload | void>(async () => {
            this.checkInterpanLock();
            return await this.sendZclFrameToEndpointInternal(
                ieeeAddr,
                networkAddress,
                endpoint,
                sourceEndpoint || 1,
                zclFrame,
                timeout,
                disableResponse,
                disableRecovery,
                0,
                0,
            );
        }, networkAddress);
    }

    private async sendZclFrameToEndpointInternal(
        ieeeAddr: string | undefined,
        networkAddress: number,
        endpoint: number,
        sourceEndpoint: number,
        zclFrame: Zcl.Frame,
        timeout: number,
        disableResponse: boolean,
        disableRecovery: boolean,
        responseAttempt: number,
        dataRequestAttempt: number,
    ): Promise<ZclPayload | void> {
        if (ieeeAddr == null) {
            ieeeAddr = `0x${this.driver.ieee.toString()}`;
        }
        logger.debug(
            `sendZclFrameToEndpointInternal ${ieeeAddr}:${networkAddress}/${endpoint} ` +
                `(${responseAttempt},${dataRequestAttempt},${this.queue.count()}), timeout=${timeout}`,
            NS,
        );
        let response = null;
        const command = zclFrame.command;
        if (command.response != undefined && disableResponse === false) {
            response = this.waitForInternal(
                networkAddress,
                endpoint,
                zclFrame.header.transactionSequenceNumber,
                zclFrame.cluster.ID,
                command.response,
                timeout,
            );
        } else if (!zclFrame.header.frameControl.disableDefaultResponse) {
            response = this.waitForInternal(
                networkAddress,
                endpoint,
                zclFrame.header.transactionSequenceNumber,
                zclFrame.cluster.ID,
                Zcl.Foundation.defaultRsp.ID,
                timeout,
            );
        }

        const frame = this.driver.makeApsFrame(zclFrame.cluster.ID, disableResponse || zclFrame.header.frameControl.disableDefaultResponse);
        frame.profileId = ZSpec.HA_PROFILE_ID;
        frame.sourceEndpoint = sourceEndpoint || 0x01;
        frame.destinationEndpoint = endpoint;
        frame.groupId = 0;

        this.driver.setNode(networkAddress, new EmberEUI64(ieeeAddr));
        const dataConfirmResult = await this.driver.request(networkAddress, frame, zclFrame.toBuffer());
        if (!dataConfirmResult) {
            if (response != null) {
                response.cancel();
            }
            throw Error('sendZclFrameToEndpointInternal error');
        }
        if (response !== null) {
            try {
                const result = await response.start().promise;
                return result;
            } catch (error) {
                logger.debug(`Response timeout (${ieeeAddr}:${networkAddress},${responseAttempt})`, NS);
                if (responseAttempt < 1 && !disableRecovery) {
                    return await this.sendZclFrameToEndpointInternal(
                        ieeeAddr,
                        networkAddress,
                        endpoint,
                        sourceEndpoint,
                        zclFrame,
                        timeout,
                        disableResponse,
                        disableRecovery,
                        responseAttempt + 1,
                        dataRequestAttempt,
                    );
                } else {
                    throw error;
                }
            }
        }
    }

    public async sendZclFrameToGroup(groupID: number, zclFrame: Zcl.Frame): Promise<void> {
        return await this.queue.execute<void>(async () => {
            this.checkInterpanLock();
            const frame = this.driver.makeApsFrame(zclFrame.cluster.ID, false);
            frame.profileId = ZSpec.HA_PROFILE_ID;
            frame.sourceEndpoint = 0x01;
            frame.destinationEndpoint = 0x01;
            frame.groupId = groupID;

            await this.driver.mrequest(frame, zclFrame.toBuffer());
            /**
             * As a group command is not confirmed and thus immidiately returns
             * (contrary to network address requests) we will give the
             * command some time to 'settle' in the network.
             */
            await wait(200);
        });
    }

    public async sendZclFrameToAll(
        endpoint: number,
        zclFrame: Zcl.Frame,
        sourceEndpoint: number,
        destination: ZSpec.BroadcastAddress,
    ): Promise<void> {
        return await this.queue.execute<void>(async () => {
            this.checkInterpanLock();
            const frame = this.driver.makeApsFrame(zclFrame.cluster.ID, false);
            frame.profileId = sourceEndpoint === ZSpec.GP_ENDPOINT && endpoint === ZSpec.GP_ENDPOINT ? ZSpec.GP_PROFILE_ID : ZSpec.HA_PROFILE_ID;
            frame.sourceEndpoint = sourceEndpoint;
            frame.destinationEndpoint = endpoint;
            frame.groupId = destination;

            // XXX: should be:
            // await this.driver.brequest(destination, frame, zclFrame.toBuffer())
            await this.driver.mrequest(frame, zclFrame.toBuffer());

            /**
             * As a broadcast command is not confirmed and thus immidiately returns
             * (contrary to network address requests) we will give the
             * command some time to 'settle' in the network.
             */
            await wait(200);
        });
    }

    public async getNetworkParameters(): Promise<NetworkParameters> {
        return {
            panID: this.driver.networkParams.panId,
            extendedPanID: ZSpec.Utils.eui64LEBufferToHex(this.driver.networkParams.extendedPanId),
            channel: this.driver.networkParams.radioChannel,
        };
    }

    public async supportsBackup(): Promise<boolean> {
        return true;
    }

    public checkBackup(backup: Models.Backup): void {
        if (!backup.ezsp?.hashed_tclk) {
            throw new Error(`Current backup file is not for EmberZNet stack.`);
        }
    }

    public async backup(): Promise<Models.Backup> {
        assert(this.driver.ezsp.isInitialized(), 'Cannot make backup when ezsp is not initialized');
        return await this.driver.backupMan.createBackup();
    }

    public async restoreChannelInterPAN(): Promise<void> {
        return await this.queue.execute<void>(async () => {
            const channel = (await this.getNetworkParameters()).channel;
            await this.driver.setChannel(channel);
            // Give adapter some time to restore, otherwise stuff crashes
            await wait(3000);
            this.interpanLock = false;
        });
    }

    private checkInterpanLock(): void {
        if (this.interpanLock) {
            throw new Error(`Cannot execute command, in Inter-PAN mode`);
        }
    }

    public async sendZclFrameInterPANToIeeeAddr(zclFrame: Zcl.Frame, ieeeAddr: string): Promise<void> {
        return await this.queue.execute<void>(async () => {
            logger.debug(`sendZclFrameInterPANToIeeeAddr to ${ieeeAddr}`, NS);
            const frame = this.driver.makeEmberIeeeRawFrame();
            frame.ieeeFrameControl = 0xcc21;
            frame.destPanId = 0xffff;
            frame.destAddress = new EmberEUI64(ieeeAddr);
            frame.sourcePanId = this.driver.networkParams.panId;
            frame.sourceAddress = this.driver.ieee;
            frame.nwkFrameControl = 0x000b;
            frame.appFrameControl = 0x03;
            frame.clusterId = zclFrame.cluster.ID;
            frame.profileId = 0xc05e;

            await this.driver.ieeerawrequest(frame, zclFrame.toBuffer());
        });
    }

    public async sendZclFrameInterPANBroadcast(zclFrame: Zcl.Frame, timeout: number): Promise<ZclPayload> {
        return await this.queue.execute<ZclPayload>(async () => {
            logger.debug(`sendZclFrameInterPANBroadcast`, NS);
            const command = zclFrame.command;

            if (command.response == undefined) {
                throw new Error(`Command '${command.name}' has no response, cannot wait for response`);
            }

            const response = this.waitForInternal(undefined, 0xfe, undefined, zclFrame.cluster.ID, command.response, timeout);

            try {
                const frame = this.driver.makeEmberRawFrame();
                frame.ieeeFrameControl = 0xc801;
                frame.destPanId = 0xffff;
                frame.destNodeId = 0xffff;
                frame.sourcePanId = this.driver.networkParams.panId;
                frame.ieeeAddress = this.driver.ieee;
                frame.nwkFrameControl = 0x000b;
                frame.appFrameControl = 0x0b;
                frame.clusterId = zclFrame.cluster.ID;
                frame.profileId = 0xc05e;

                await this.driver.rawrequest(frame, zclFrame.toBuffer());
            } catch (error) {
                response.cancel();
                throw error;
            }

            return await response.start().promise;
        });
    }

    public async setChannelInterPAN(channel: number): Promise<void> {
        return await this.queue.execute<void>(async () => {
            this.interpanLock = true;
            await this.driver.setChannel(channel);
        });
    }

    private waitForInternal(
        networkAddress: number | undefined,
        endpoint: number,
        transactionSequenceNumber: number | undefined,
        clusterID: number,
        commandIdentifier: number,
        timeout: number,
    ): {start: () => {promise: Promise<ZclPayload>}; cancel: () => void} {
        const waiter = this.waitress.waitFor(
            {
                address: networkAddress,
                endpoint,
                clusterID,
                commandIdentifier,
                transactionSequenceNumber,
            },
            timeout,
        );
        const cancel = (): void => this.waitress.remove(waiter.ID);
        return {start: waiter.start, cancel};
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
    ): {promise: Promise<ZclPayload>; cancel: () => void} {
        const waiter = this.waitForInternal(networkAddress, endpoint, transactionSequenceNumber, clusterID, commandIdentifier, timeout);

        return {cancel: waiter.cancel, promise: waiter.start().promise};
    }

    private waitressTimeoutFormatter(matcher: WaitressMatcher, timeout: number): string {
        return (
            `Timeout - ${matcher.address} - ${matcher.endpoint}` +
            ` - ${matcher.transactionSequenceNumber} - ${matcher.clusterID}` +
            ` - ${matcher.commandIdentifier} after ${timeout}ms`
        );
    }

    private waitressValidator(payload: ZclPayload, matcher: WaitressMatcher): boolean {
        return Boolean(
            payload.header &&
                (!matcher.address || payload.address === matcher.address) &&
                payload.endpoint === matcher.endpoint &&
                (!matcher.transactionSequenceNumber || payload.header.transactionSequenceNumber === matcher.transactionSequenceNumber) &&
                payload.clusterID === matcher.clusterID &&
                matcher.commandIdentifier === payload.header.commandIdentifier,
        );
    }
}

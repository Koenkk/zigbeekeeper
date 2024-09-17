/* istanbul ignore file */

import assert from 'assert';

import * as Models from '../../../models';
import {Queue, RealpathSync, Wait, Waitress} from '../../../utils';
import {logger} from '../../../utils/logger';
import * as ZSpec from '../../../zspec';
import {EUI64} from '../../../zspec/tstypes';
import * as Zcl from '../../../zspec/zcl';
import * as Zdo from '../../../zspec/zdo';
import * as ZdoTypes from '../../../zspec/zdo/definition/tstypes';
import Adapter from '../../adapter';
import {ZclPayload} from '../../events';
import SerialPortUtils from '../../serialPortUtils';
import SocketPortUtils from '../../socketPortUtils';
import {
    ActiveEndpoints,
    AdapterOptions,
    Coordinator,
    CoordinatorVersion,
    DeviceType,
    LQI,
    LQINeighbor,
    NetworkOptions,
    NetworkParameters,
    NodeDescriptor,
    RoutingTable,
    RoutingTableEntry,
    SerialPortOptions,
    SimpleDescriptor,
    StartResult,
} from '../../tstype';
import {Driver, EmberIncomingMessage} from '../driver';
import {EmberEUI64, EmberStatus} from '../driver/types';

const NS = 'zh:ezsp';

const autoDetectDefinitions = [
    {manufacturer: 'ITEAD', vendorId: '1a86', productId: '55d4'}, // Sonoff ZBDongle-E
    {manufacturer: 'Nabu Casa', vendorId: '10c4', productId: 'ea60'}, // Home Assistant SkyConnect
];

interface WaitressMatcher {
    address?: number | string;
    endpoint: number;
    transactionSequenceNumber?: number;
    clusterID: number;
    commandIdentifier: number;
}

class EZSPAdapter extends Adapter {
    private driver: Driver;
    private waitress: Waitress<ZclPayload, WaitressMatcher>;
    private interpanLock: boolean;
    private queue: Queue;
    private closing: boolean;
    private deprecatedTimer?: NodeJS.Timeout;

    public constructor(networkOptions: NetworkOptions, serialPortOptions: SerialPortOptions, backupPath: string, adapterOptions: AdapterOptions) {
        super(networkOptions, serialPortOptions, backupPath, adapterOptions);
        this.hasZdoMessageOverhead = true;

        this.waitress = new Waitress<ZclPayload, WaitressMatcher>(this.waitressValidator, this.waitressTimeoutFormatter);
        this.interpanLock = false;
        this.closing = false;

        const concurrent = adapterOptions && adapterOptions.concurrent ? adapterOptions.concurrent : 8;
        logger.debug(`Adapter concurrent: ${concurrent}`, NS);
        this.queue = new Queue(concurrent);

        this.driver = new Driver(this.serialPortOptions, this.networkOptions, backupPath);
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
        const logEzspDeprecated = (): void => {
            const message =
                `Deprecated driver 'ezsp' currently in use, 'ember' will become the officially supported EmberZNet ` +
                `driver in next release. If using Zigbee2MQTT see https://github.com/Koenkk/zigbee2mqtt/discussions/21462`;
            logger.warning(message, NS);
        };
        logEzspDeprecated();
        this.deprecatedTimer = setInterval(logEzspDeprecated, 60 * 60 * 1000); // Every 60 mins
        return await this.driver.startup();
    }

    public async stop(): Promise<void> {
        this.closing = true;
        clearInterval(this.deprecatedTimer);
        await this.driver.stop();
    }

    public async onDriverClose(): Promise<void> {
        logger.debug(`onDriverClose()`, NS);

        if (!this.closing) {
            this.emit('disconnected');
        }
    }

    public static async isValidPath(path: string): Promise<boolean> {
        // For TCP paths we cannot get device information, therefore we cannot validate it.
        if (SocketPortUtils.isTcpPath(path)) {
            return false;
        }

        try {
            return await SerialPortUtils.is(RealpathSync(path), autoDetectDefinitions);
        } catch (error) {
            logger.debug(`Failed to determine if path is valid: '${error}'`, NS);
            return false;
        }
    }

    public static async autoDetectPath(): Promise<string | undefined> {
        const paths = await SerialPortUtils.find(autoDetectDefinitions);
        paths.sort((a, b) => (a < b ? -1 : 1));
        return paths.length > 0 ? paths[0] : undefined;
    }

    public async getCoordinator(): Promise<Coordinator> {
        return await this.queue.execute<Coordinator>(async () => {
            this.checkInterpanLock();
            const message = await this.activeEndpoints(ZSpec.COORDINATOR_ADDRESS);
            const endpoints = [];

            for (const endpoint of message.endpoints) {
                const descriptor = await this.simpleDescriptor(ZSpec.COORDINATOR_ADDRESS, endpoint);

                endpoints.push({
                    profileID: descriptor.profileID,
                    ID: descriptor.endpointID,
                    deviceID: descriptor.deviceID,
                    inputClusters: descriptor.inputClusters,
                    outputClusters: descriptor.outputClusters,
                });
            }

            return {
                networkAddress: ZSpec.COORDINATOR_ADDRESS,
                manufacturerID: 0,
                ieeeAddr: `0x${this.driver.ieee.toString()}`,
                endpoints,
            };
        });
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

            /* istanbul ignore next */
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

    public async lqi(networkAddress: number): Promise<LQI> {
        const clusterId = Zdo.ClusterId.LQI_TABLE_REQUEST;
        const neighbors: LQINeighbor[] = [];
        const request = async (startIndex: number): Promise<[tableEntries: number, entryCount: number]> => {
            const zdoPayload = Zdo.Buffalo.buildRequest(this.hasZdoMessageOverhead, clusterId, startIndex);
            const result = await this.sendZdo(ZSpec.BLANK_EUI64, networkAddress, clusterId, zdoPayload, false);

            /* istanbul ignore else */
            if (Zdo.Buffalo.checkStatus(result)) {
                const payload = result[1];

                for (const entry of payload.entryList) {
                    neighbors.push({
                        ieeeAddr: entry.eui64,
                        networkAddress: entry.nwkAddress,
                        linkquality: entry.lqi,
                        relationship: entry.relationship,
                        depth: entry.depth,
                    });
                }

                return [payload.neighborTableEntries, payload.entryList.length];
            } else {
                // TODO: will disappear once moved upstream
                throw new Zdo.StatusError(result[0]);
            }
        };

        let [tableEntries, entryCount] = await request(0);

        const size = tableEntries;
        let nextStartIndex = entryCount;

        while (neighbors.length < size) {
            [tableEntries, entryCount] = await request(nextStartIndex);

            nextStartIndex += entryCount;
        }

        return {neighbors};
    }

    public async routingTable(networkAddress: number): Promise<RoutingTable> {
        const clusterId = Zdo.ClusterId.ROUTING_TABLE_REQUEST;
        const table: RoutingTableEntry[] = [];
        const request = async (startIndex: number): Promise<[tableEntries: number, entryCount: number]> => {
            const zdoPayload = Zdo.Buffalo.buildRequest(this.hasZdoMessageOverhead, clusterId, startIndex);
            const result = await this.sendZdo(ZSpec.BLANK_EUI64, networkAddress, clusterId, zdoPayload, false);

            /* istanbul ignore else */
            if (Zdo.Buffalo.checkStatus(result)) {
                const payload = result[1];

                for (const entry of payload.entryList) {
                    table.push({
                        destinationAddress: entry.destinationAddress,
                        status: entry.status,
                        nextHop: entry.nextHopAddress,
                    });
                }

                return [payload.routingTableEntries, payload.entryList.length];
            } else {
                // TODO: will disappear once moved upstream
                throw new Zdo.StatusError(result[0]);
            }
        };

        let [tableEntries, entryCount] = await request(0);

        const size = tableEntries;
        let nextStartIndex = entryCount;

        while (table.length < size) {
            [tableEntries, entryCount] = await request(nextStartIndex);

            nextStartIndex += entryCount;
        }

        return {table};
    }

    public async nodeDescriptor(networkAddress: number): Promise<NodeDescriptor> {
        const clusterId = Zdo.ClusterId.NODE_DESCRIPTOR_REQUEST;
        const zdoPayload = Zdo.Buffalo.buildRequest(this.hasZdoMessageOverhead, clusterId, networkAddress);
        const result = await this.sendZdo(ZSpec.BLANK_EUI64, networkAddress, clusterId, zdoPayload, false);

        /* istanbul ignore else */
        if (Zdo.Buffalo.checkStatus(result)) {
            const payload = result[1];
            let type: DeviceType = 'Unknown';

            switch (payload.logicalType) {
                case 0x0:
                    type = 'Coordinator';
                    break;
                case 0x1:
                    type = 'Router';
                    break;
                case 0x2:
                    type = 'EndDevice';
                    break;
            }

            return {type, manufacturerCode: payload.manufacturerCode};
        } else {
            // TODO: will disappear once moved upstream
            throw new Zdo.StatusError(result[0]);
        }
    }

    public async activeEndpoints(networkAddress: number): Promise<ActiveEndpoints> {
        const clusterId = Zdo.ClusterId.ACTIVE_ENDPOINTS_REQUEST;
        const zdoPayload = Zdo.Buffalo.buildRequest(this.hasZdoMessageOverhead, clusterId, networkAddress);
        const result = await this.sendZdo(ZSpec.BLANK_EUI64, networkAddress, clusterId, zdoPayload, false);

        /* istanbul ignore else */
        if (Zdo.Buffalo.checkStatus(result)) {
            const payload = result[1];

            return {endpoints: payload.endpointList};
        } else {
            // TODO: will disappear once moved upstream
            throw new Zdo.StatusError(result[0]);
        }
    }

    public async simpleDescriptor(networkAddress: number, endpointID: number): Promise<SimpleDescriptor> {
        const clusterId = Zdo.ClusterId.SIMPLE_DESCRIPTOR_REQUEST;
        const zdoPayload = Zdo.Buffalo.buildRequest(this.hasZdoMessageOverhead, clusterId, networkAddress, endpointID);
        const result = await this.sendZdo(ZSpec.BLANK_EUI64, networkAddress, clusterId, zdoPayload, false);

        /* istanbul ignore else */
        if (Zdo.Buffalo.checkStatus(result)) {
            const payload = result[1];

            return {
                profileID: payload.profileId,
                endpointID: payload.endpoint,
                deviceID: payload.deviceId,
                inputClusters: payload.inClusterList,
                outputClusters: payload.outClusterList,
            };
        } else {
            // TODO: will disappear once moved upstream
            throw new Zdo.StatusError(result[0]);
        }
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
        }, networkAddress /* TODO: replace with ieeeAddress once zdo moved upstream */);
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
            await Wait(200);
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
            await Wait(200);
        });
    }

    public async bind(
        destinationNetworkAddress: number,
        sourceIeeeAddress: string,
        sourceEndpoint: number,
        clusterID: number,
        destinationAddressOrGroup: string | number,
        type: 'endpoint' | 'group',
        destinationEndpoint?: number,
    ): Promise<void> {
        const clusterId = Zdo.ClusterId.BIND_REQUEST;
        const zdoPayload = Zdo.Buffalo.buildRequest(
            this.hasZdoMessageOverhead,
            clusterId,
            sourceIeeeAddress as EUI64,
            sourceEndpoint,
            clusterID,
            type === 'group' ? Zdo.MULTICAST_BINDING : Zdo.UNICAST_BINDING,
            destinationAddressOrGroup as EUI64, // not used with MULTICAST_BINDING
            destinationAddressOrGroup as number, // not used with UNICAST_BINDING
            destinationEndpoint ?? 0, // not used with MULTICAST_BINDING
        );
        const result = await this.sendZdo(ZSpec.BLANK_EUI64, destinationNetworkAddress, clusterId, zdoPayload, false);

        /* istanbul ignore next */
        if (!Zdo.Buffalo.checkStatus(result)) {
            // TODO: will disappear once moved upstream
            throw new Zdo.StatusError(result[0]);
        }
    }

    public async unbind(
        destinationNetworkAddress: number,
        sourceIeeeAddress: string,
        sourceEndpoint: number,
        clusterID: number,
        destinationAddressOrGroup: string | number,
        type: 'endpoint' | 'group',
        destinationEndpoint?: number,
    ): Promise<void> {
        const clusterId = Zdo.ClusterId.UNBIND_REQUEST;
        const zdoPayload = Zdo.Buffalo.buildRequest(
            this.hasZdoMessageOverhead,
            clusterId,
            sourceIeeeAddress as EUI64,
            sourceEndpoint,
            clusterID,
            type === 'group' ? Zdo.MULTICAST_BINDING : Zdo.UNICAST_BINDING,
            destinationAddressOrGroup as EUI64, // not used with MULTICAST_BINDING
            destinationAddressOrGroup as number, // not used with UNICAST_BINDING
            destinationEndpoint ?? 0, // not used with MULTICAST_BINDING
        );
        const result = await this.sendZdo(ZSpec.BLANK_EUI64, destinationNetworkAddress, clusterId, zdoPayload, false);

        /* istanbul ignore next */
        if (!Zdo.Buffalo.checkStatus(result)) {
            // TODO: will disappear once moved upstream
            throw new Zdo.StatusError(result[0]);
        }
    }

    public async removeDevice(networkAddress: number, ieeeAddr: string): Promise<void> {
        const clusterId = Zdo.ClusterId.LEAVE_REQUEST;
        const zdoPayload = Zdo.Buffalo.buildRequest(this.hasZdoMessageOverhead, clusterId, ieeeAddr as EUI64, Zdo.LeaveRequestFlags.WITHOUT_REJOIN);
        const result = await this.sendZdo(ZSpec.BLANK_EUI64, networkAddress, clusterId, zdoPayload, false);

        /* istanbul ignore next */
        if (!Zdo.Buffalo.checkStatus(result)) {
            // TODO: will disappear once moved upstream
            throw new Zdo.StatusError(result[0]);
        }
    }

    public async getNetworkParameters(): Promise<NetworkParameters> {
        return {
            panID: this.driver.networkParams.panId,
            extendedPanID: this.driver.networkParams.extendedPanId[0],
            channel: this.driver.networkParams.radioChannel,
        };
    }

    public async supportsBackup(): Promise<boolean> {
        return true;
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
            await Wait(3000);
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

    public async changeChannel(newChannel: number): Promise<void> {
        const clusterId = Zdo.ClusterId.NWK_UPDATE_REQUEST;
        const zdoPayload = Zdo.Buffalo.buildRequest(this.hasZdoMessageOverhead, clusterId, [newChannel], 0xfe, undefined, undefined, undefined);

        await this.sendZdo(ZSpec.BLANK_EUI64, ZSpec.BroadcastAddress.SLEEPY, clusterId, zdoPayload, true /* handled below */);
        await Wait(12000);
    }

    public async setTransmitPower(value: number): Promise<void> {
        logger.debug(`setTransmitPower to ${value}`, NS);
        return await this.queue.execute<void>(async () => {
            await this.driver.setRadioPower(value);
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

export default EZSPAdapter;

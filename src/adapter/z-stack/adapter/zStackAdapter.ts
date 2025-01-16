import assert from 'node:assert';

import debounce from 'debounce';

import * as Models from '../../../models';
import {Queue, wait, Waitress} from '../../../utils';
import {logger} from '../../../utils/logger';
import * as ZSpec from '../../../zspec';
import {BroadcastAddress} from '../../../zspec/enums';
import {EUI64} from '../../../zspec/tstypes';
import * as Zcl from '../../../zspec/zcl';
import * as Zdo from '../../../zspec/zdo';
import * as ZdoTypes from '../../../zspec/zdo/definition/tstypes';
import Adapter from '../../adapter';
import * as Events from '../../events';
import {AdapterOptions, CoordinatorVersion, NetworkOptions, NetworkParameters, SerialPortOptions, StartResult} from '../../tstype';
import * as Constants from '../constants';
import {Constants as UnpiConstants} from '../unpi';
import {Znp, ZpiObject} from '../znp';
import Definition from '../znp/definition';
import {isMtCmdAreqZdo} from '../znp/utils';
import {ZnpAdapterManager} from './manager';
import {ZnpVersion} from './tstype';

const NS = 'zh:zstack';
const Subsystem = UnpiConstants.Subsystem;
const Type = UnpiConstants.Type;
const {ZnpCommandStatus, AddressMode} = Constants.COMMON;

const DataConfirmTimeout = 9999; // Not an actual code
const DataConfirmErrorCodeLookup: {[k: number]: string} = {
    [DataConfirmTimeout]: 'Timeout',
    26: 'MAC no resources',
    183: 'APS no ack',
    205: 'No network route',
    225: 'MAC channel access failure',
    233: 'MAC no ack',
    240: 'MAC transaction expired',
};

interface WaitressMatcher {
    address?: number | string;
    endpoint: number;
    transactionSequenceNumber?: number;
    frameType: Zcl.FrameType;
    clusterID: number;
    commandIdentifier: number;
    direction: number;
}

class DataConfirmError extends Error {
    public code: number;
    constructor(code: number) {
        const message = `Data request failed with error: '${DataConfirmErrorCodeLookup[code]}' (${code})`;
        super(message);
        this.code = code;
    }
}

export class ZStackAdapter extends Adapter {
    private deviceAnnounceRouteDiscoveryDebouncers: Map<number, () => void>;
    private znp: Znp;
    // @ts-expect-error initialized in `start`
    private adapterManager: ZnpAdapterManager;
    private transactionID: number;
    // @ts-expect-error initialized in `start`
    private version: {
        product: ZnpVersion;
        transportrev: number;
        majorrel: number;
        minorrel: number;
        maintrel: number;
        revision: string;
    };
    private closing: boolean;
    // @ts-expect-error initialized in `start`
    private queue: Queue;
    private supportsLED?: boolean;
    private interpanLock: boolean;
    private interpanEndpointRegistered: boolean;
    private waitress: Waitress<Events.ZclPayload, WaitressMatcher>;

    public constructor(networkOptions: NetworkOptions, serialPortOptions: SerialPortOptions, backupPath: string, adapterOptions: AdapterOptions) {
        super(networkOptions, serialPortOptions, backupPath, adapterOptions);
        this.hasZdoMessageOverhead = false;
        this.manufacturerID = Zcl.ManufacturerCode.TEXAS_INSTRUMENTS;
        this.znp = new Znp(this.serialPortOptions.path!, this.serialPortOptions.baudRate!, this.serialPortOptions.rtscts!);

        this.transactionID = 0;
        this.deviceAnnounceRouteDiscoveryDebouncers = new Map();
        this.interpanLock = false;
        this.interpanEndpointRegistered = false;
        this.closing = false;
        this.waitress = new Waitress<Events.ZclPayload, WaitressMatcher>(this.waitressValidator, this.waitressTimeoutFormatter);

        this.znp.on('received', this.onZnpRecieved.bind(this));
        this.znp.on('close', this.onZnpClose.bind(this));
    }

    /**
     * Adapter methods
     */
    public async start(): Promise<StartResult> {
        await this.znp.open();

        const attempts = 3;
        for (let i = 0; i < attempts; i++) {
            try {
                await this.znp.request(Subsystem.SYS, 'ping', {capabilities: 1});
                break;
            } catch (e) {
                if (attempts - 1 === i) {
                    throw new Error(`Failed to connect to the adapter (${e})`);
                }
            }
        }

        // Old firmware did not support version, assume it's Z-Stack 1.2 for now.
        try {
            this.version = (await this.znp.requestWithReply(Subsystem.SYS, 'version', {})).payload as typeof this.version;
        } catch {
            logger.debug(`Failed to get zStack version, assuming 1.2`, NS);
            this.version = {transportrev: 2, product: 0, majorrel: 2, minorrel: 0, maintrel: 0, revision: ''};
        }

        const concurrent =
            this.adapterOptions && this.adapterOptions.concurrent
                ? this.adapterOptions.concurrent
                : this.version.product === ZnpVersion.zStack3x0
                  ? 16
                  : 2;

        logger.debug(`Adapter concurrent: ${concurrent}`, NS);

        this.queue = new Queue(concurrent);

        logger.debug(`Detected znp version '${ZnpVersion[this.version.product]}' (${JSON.stringify(this.version)})`, NS);
        this.adapterManager = new ZnpAdapterManager(this, this.znp, {
            backupPath: this.backupPath,
            version: this.version.product,
            networkOptions: this.networkOptions,
            adapterOptions: this.adapterOptions,
        });

        const startResult = await this.initNetwork();

        if (startResult === 'resumed') {
            await this.adapterManager.resume();
        }

        await this.adapterManager.registerEndpoints();

        /* add green power group */
        await this.adapterManager.addToGroup(ZSpec.GP_ENDPOINT, ZSpec.GP_GROUP_ID);

        if (this.adapterOptions.disableLED) {
            // Wait a bit for adapter to startup, otherwise led doesn't disable (tested with CC2531)
            await wait(200);
            await this.setLED('disable');
        }

        if (this.adapterOptions.transmitPower != null) {
            await this.znp.request(Subsystem.SYS, 'stackTune', {operation: 0, value: this.adapterOptions.transmitPower});
        }

        return startResult;
    }

    public async stop(): Promise<void> {
        this.closing = true;
        await this.znp.close();
    }

    /**
     * Check the network status on the adapter (execute the necessary pre-steps to be able to get it).
     * WARNING: This is a one-off. Should not be called outside of `initNetwork`.
     */
    protected async initHasNetwork(): Promise<[true, panID: number, extendedPanID: Buffer] | [false, panID: undefined, extendedPanID: undefined]> {
        return await this.adapterManager.initHasNetwork();
    }

    public async leaveNetwork(): Promise<void> {
        return await this.adapterManager.leaveNetwork();
    }

    /**
     * If backup is defined, form network from backup, otherwise from config.
     */
    public async formNetwork(backup?: Models.Backup): Promise<StartResult | void> {
        if (backup) {
            await this.adapterManager.restore(backup);
        } else {
            return await this.adapterManager.reset();
        }
    }

    public async getNetworkKey(): Promise<Buffer> {
        return await this.adapterManager.getNetworkKey();
    }

    public async getCoordinatorIEEE(): Promise<string> {
        return await this.queue.execute(async () => {
            this.checkInterpanLock();
            const deviceInfo = await this.znp.requestWithReply(Subsystem.UTIL, 'getDeviceInfo', {});

            return deviceInfo.payload.ieeeaddr;
        });
    }

    public async getCoordinatorVersion(): Promise<CoordinatorVersion> {
        return {type: ZnpVersion[this.version.product], meta: this.version};
    }

    public async permitJoin(seconds: number, networkAddress?: number): Promise<void> {
        const clusterId = Zdo.ClusterId.PERMIT_JOINING_REQUEST;
        // `authentication`: TC significance always 1 (zb specs)
        const zdoPayload = Zdo.Buffalo.buildRequest(this.hasZdoMessageOverhead, clusterId, seconds, 1, []);

        if (networkAddress === undefined) {
            await this.sendZdo(ZSpec.BLANK_EUI64, ZSpec.BroadcastAddress.DEFAULT, clusterId, zdoPayload, true);
        } else {
            // NOTE: `sendZdo` takes care of adjusting the payload as appropriate based on `networkAddress === 0` or not
            const result = await this.sendZdo(ZSpec.BLANK_EUI64, networkAddress, clusterId, zdoPayload, false);

            /* v8 ignore start */
            if (!Zdo.Buffalo.checkStatus(result)) {
                // TODO: will disappear once moved upstream
                throw new Zdo.StatusError(result[0]);
            }
            /* v8 ignore stop */
        }

        await this.queue.execute<void>(async () => {
            this.checkInterpanLock();
            await this.setLED(seconds == 0 ? 'off' : 'on');
        });
    }

    public async reset(type: 'soft' | 'hard'): Promise<void> {
        if (type === 'soft') {
            await this.znp.request(Subsystem.SYS, 'resetReq', {type: Constants.SYS.resetType.SOFT});
        } else {
            await this.znp.request(Subsystem.SYS, 'resetReq', {type: Constants.SYS.resetType.HARD});
        }
    }

    private async setLED(action: 'disable' | 'on' | 'off'): Promise<void> {
        if (this.supportsLED == undefined) {
            // Only zStack3x0 with 20210430 and greater support LED
            const zStack3x0 = this.version.product === ZnpVersion.zStack3x0;
            this.supportsLED = !zStack3x0 || (zStack3x0 && parseInt(this.version.revision) >= 20210430);
        }

        if (!this.supportsLED || (this.adapterOptions.disableLED && action !== 'disable')) {
            return;
        }

        // Firmwares build on and after 20211029 should handle LED themselves
        const firmwareControlsLed = parseInt(this.version.revision) >= 20211029;
        const lookup = {
            disable: firmwareControlsLed ? {ledid: 0xff, mode: 5} : {ledid: 3, mode: 0},
            on: firmwareControlsLed ? null : {ledid: 3, mode: 1},
            off: firmwareControlsLed ? null : {ledid: 3, mode: 0},
        };

        const payload = lookup[action];
        if (payload) {
            this.znp.request(Subsystem.UTIL, 'ledControl', payload, undefined, 500).catch(() => {
                // We cannot 100% correctly determine if an adapter supports LED. E.g. the zStack 1.2 20190608
                // fw supports led on the CC2531 but not on the CC2530. Therefore if a led request fails never thrown
                // an error but instead mark the led as unsupported.
                // https://github.com/Koenkk/zigbee-herdsman/issues/377
                // https://github.com/Koenkk/zigbee2mqtt/issues/7693
                this.supportsLED = false;
            });
        }
    }

    private async requestNetworkAddress(ieeeAddr: string): Promise<number> {
        /**
         * NOTE: There are cases where multiple nwkAddrRsp are recevied with different network addresses,
         * this is currently not handled, the first nwkAddrRsp is taken.
         */
        logger.debug(`Request network address of '${ieeeAddr}'`, NS);

        const clusterId = Zdo.ClusterId.NETWORK_ADDRESS_REQUEST;
        const zdoPayload = Zdo.Buffalo.buildRequest(this.hasZdoMessageOverhead, clusterId, ieeeAddr as EUI64, false, 0);

        const result = await this.sendZdoInternal(ieeeAddr, ZSpec.NULL_NODE_ID, clusterId, zdoPayload, false, true);

        if (Zdo.Buffalo.checkStatus(result)) {
            return result[1].nwkAddress;
            /* v8 ignore start */
        } else {
            // TODO: will disappear once moved upstream
            throw new Zdo.StatusError(result[0]);
        }
        /* v8 ignore stop */
    }

    private supportsAssocRemove(): boolean {
        return this.version.product === ZnpVersion.zStack3x0 && parseInt(this.version.revision) >= 20200805;
    }

    private supportsAssocAdd(): boolean {
        return this.version.product === ZnpVersion.zStack3x0 && parseInt(this.version.revision) >= 20201026;
    }

    private async discoverRoute(networkAddress: number, waitSettled = true): Promise<void> {
        logger.debug(`Discovering route to ${networkAddress}`, NS);
        const payload = {dstAddr: networkAddress, options: 0, radius: Constants.AF.DEFAULT_RADIUS};
        await this.znp.request(Subsystem.ZDO, 'extRouteDisc', payload);

        if (waitSettled) {
            await wait(3000);
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
        return await this.sendZdoInternal(ieeeAddress, networkAddress, clusterId, payload, disableResponse, false);
    }

    private async sendZdoInternal(
        ieeeAddress: string,
        networkAddress: number,
        clusterId: Zdo.ClusterId,
        payload: Buffer,
        disableResponse: boolean,
        skipQueue: boolean,
    ): Promise<void>;
    private async sendZdoInternal<K extends keyof ZdoTypes.RequestToResponseMap>(
        ieeeAddress: string,
        networkAddress: number,
        clusterId: K,
        payload: Buffer,
        disableResponse: false,
        skipQueue: boolean,
    ): Promise<ZdoTypes.RequestToResponseMap[K]>;
    private async sendZdoInternal<K extends keyof ZdoTypes.RequestToResponseMap>(
        ieeeAddress: string,
        networkAddress: number,
        clusterId: K,
        payload: Buffer,
        disableResponse: boolean,
        skipQueue: boolean,
    ): Promise<ZdoTypes.RequestToResponseMap[K] | void> {
        const func = async (): Promise<ZdoTypes.RequestToResponseMap[K] | void> => {
            this.checkInterpanLock();

            // stack-specific requirements
            switch (clusterId) {
                case Zdo.ClusterId.PERMIT_JOINING_REQUEST: {
                    const finalPayload = Buffer.alloc(payload.length + 3);
                    finalPayload.writeUInt8(ZSpec.BroadcastAddress[networkAddress] ? AddressMode.ADDR_BROADCAST : AddressMode.ADDR_16BIT, 0);
                    // zstack uses AddressMode.ADDR_16BIT + ZSpec.BroadcastAddress.DEFAULT to signal "coordinator-only"
                    finalPayload.writeUInt16LE(networkAddress === 0 ? ZSpec.BroadcastAddress.DEFAULT : networkAddress, 1);
                    finalPayload.set(payload, 3);

                    payload = finalPayload;
                    break;
                }

                case Zdo.ClusterId.NWK_UPDATE_REQUEST: {
                    // extra zeroes for empty nwkManagerAddr if necessary
                    const zeroes = 9 - payload.length - 1; /* zstack doesn't have nwkUpdateId */
                    const finalPayload = Buffer.alloc(payload.length + 3 + zeroes);
                    finalPayload.writeUInt16LE(networkAddress, 0);
                    finalPayload.writeUInt8(ZSpec.BroadcastAddress[networkAddress] ? AddressMode.ADDR_BROADCAST : AddressMode.ADDR_16BIT, 2);
                    finalPayload.set(payload, 3);

                    payload = finalPayload;
                    break;
                }

                case Zdo.ClusterId.BIND_REQUEST:
                case Zdo.ClusterId.UNBIND_REQUEST: {
                    // extra zeroes for uint16 (in place of ieee when MULTICAST) and endpoint (not used when MULTICAST)
                    const zeroes = 21 - payload.length;
                    const finalPayload = Buffer.alloc(payload.length + 2 + zeroes);
                    finalPayload.writeUInt16LE(networkAddress, 0);
                    finalPayload.set(payload, 2);

                    payload = finalPayload;
                    break;
                }

                case Zdo.ClusterId.NETWORK_ADDRESS_REQUEST:
                case Zdo.ClusterId.IEEE_ADDRESS_REQUEST: {
                    // no modification necessary
                    break;
                }

                default: {
                    const finalPayload = Buffer.alloc(payload.length + 2);
                    finalPayload.writeUInt16LE(networkAddress, 0);
                    finalPayload.set(payload, 2);

                    payload = finalPayload;
                    break;
                }
            }

            let waiter: ReturnType<typeof this.znp.waitFor> | undefined;

            if (!disableResponse) {
                const responseClusterId = Zdo.Utils.getResponseClusterId(clusterId);

                if (responseClusterId) {
                    const cmd = Definition[Subsystem.ZDO].find((c) => isMtCmdAreqZdo(c) && c.zdoClusterId === responseClusterId);
                    assert(cmd, `Response for ZDO cluster ID '${responseClusterId}' not supported.`);

                    waiter = this.znp.waitFor(
                        UnpiConstants.Type.AREQ,
                        Subsystem.ZDO,
                        cmd.name,
                        responseClusterId === Zdo.ClusterId.NETWORK_ADDRESS_RESPONSE ? ieeeAddress : networkAddress,
                        undefined,
                        undefined,
                    );
                }
            }

            try {
                await this.znp.requestZdo(clusterId, payload, waiter?.ID);
            } catch (error) {
                if (clusterId === Zdo.ClusterId.NODE_DESCRIPTOR_REQUEST) {
                    // Discover route when node descriptor request fails
                    // https://github.com/Koenkk/zigbee2mqtt/issues/3276
                    logger.debug(`Discover route to '${networkAddress}' because node descriptor request failed`, NS);
                    await this.discoverRoute(networkAddress);
                    await this.znp.requestZdo(clusterId, payload, /* v8 ignore next */ waiter?.ID);
                } else {
                    throw error;
                }
            }

            if (waiter) {
                const response = await waiter.start().promise;

                return response.payload.zdo;
            }
        };
        return skipQueue ? await func() : await this.queue.execute(func, networkAddress);
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
        return await this.queue.execute<Events.ZclPayload | void>(async () => {
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
                false,
                false,
                false,
                undefined,
            );
        }, networkAddress);
    }

    private async sendZclFrameToEndpointInternal(
        ieeeAddr: string,
        networkAddress: number,
        endpoint: number,
        sourceEndpoint: number,
        zclFrame: Zcl.Frame,
        timeout: number,
        disableResponse: boolean,
        disableRecovery: boolean,
        responseAttempt: number,
        dataRequestAttempt: number,
        checkedNetworkAddress: boolean,
        discoveredRoute: boolean,
        assocRemove: boolean,
        assocRestore?: {ieeeadr: string; nwkaddr: number; noderelation: number},
    ): Promise<Events.ZclPayload | void> {
        logger.debug(
            `sendZclFrameToEndpointInternal ${ieeeAddr}:${networkAddress}/${endpoint} ` +
                `(${responseAttempt},${dataRequestAttempt},${this.queue.count()})`,
            NS,
        );
        let response = null;
        const command = zclFrame.command;
        if (command.response != undefined && disableResponse === false) {
            response = this.waitForInternal(
                networkAddress,
                endpoint,
                zclFrame.header.frameControl.frameType,
                Zcl.Direction.SERVER_TO_CLIENT,
                zclFrame.header.transactionSequenceNumber,
                zclFrame.cluster.ID,
                command.response,
                timeout,
            );
        } else if (!zclFrame.header.frameControl.disableDefaultResponse) {
            response = this.waitForInternal(
                networkAddress,
                endpoint,
                Zcl.FrameType.GLOBAL,
                Zcl.Direction.SERVER_TO_CLIENT,
                zclFrame.header.transactionSequenceNumber,
                zclFrame.cluster.ID,
                Zcl.Foundation.defaultRsp.ID,
                timeout,
            );
        }

        const dataConfirmResult = await this.dataRequest(
            networkAddress,
            endpoint,
            sourceEndpoint,
            zclFrame.cluster.ID,
            Constants.AF.DEFAULT_RADIUS,
            zclFrame.toBuffer(),
            timeout,
        );

        if (dataConfirmResult !== ZnpCommandStatus.SUCCESS) {
            // In case dataConfirm timesout (= null) or gives an error, try to recover
            logger.debug(`Data confirm error (${ieeeAddr}:${networkAddress},${dataConfirmResult},${dataRequestAttempt})`, NS);
            if (response !== null) response.cancel();

            /**
             * In case we did an assocRemove in the previous attempt and it still fails after this, assume that the
             * coordinator is still the parent of the device (but for some reason the device is not available now).
             * Re-add the device to the assoc table, otherwise we will never be able to reach it anymore.
             */
            if (assocRemove && assocRestore && this.supportsAssocAdd()) {
                logger.debug(`assocAdd(${assocRestore.ieeeadr})`, NS);
                await this.znp.request(Subsystem.UTIL, 'assocAdd', assocRestore);
                assocRestore = undefined;
            }

            const recoverableErrors = [
                ZnpCommandStatus.NWK_NO_ROUTE,
                ZnpCommandStatus.MAC_NO_ACK,
                ZnpCommandStatus.MAC_CHANNEL_ACCESS_FAILURE,
                ZnpCommandStatus.MAC_TRANSACTION_EXPIRED,
                ZnpCommandStatus.BUFFER_FULL,
                ZnpCommandStatus.MAC_NO_RESOURCES,
            ];

            if (dataRequestAttempt >= 4 || !recoverableErrors.includes(dataConfirmResult) || disableRecovery) {
                throw new DataConfirmError(dataConfirmResult);
            }

            if (
                dataConfirmResult === ZnpCommandStatus.MAC_CHANNEL_ACCESS_FAILURE ||
                dataConfirmResult === ZnpCommandStatus.BUFFER_FULL ||
                dataConfirmResult === ZnpCommandStatus.MAC_NO_RESOURCES
            ) {
                /**
                 * MAC_CHANNEL_ACCESS_FAILURE: When many commands at once are executed we can end up in a MAC
                 * channel access failure error. This is because there is too much traffic on the network.
                 * Retry this command once after a cooling down period.
                 * BUFFER_FULL: When many commands are executed at once the buffer can get full, wait
                 * some time and retry.
                 * MAC_NO_RESOURCES: Operation could not be completed because no memory resources are available,
                 * wait some time and retry.
                 */
                await wait(2000);
                return await this.sendZclFrameToEndpointInternal(
                    ieeeAddr,
                    networkAddress,
                    endpoint,
                    sourceEndpoint,
                    zclFrame,
                    timeout,
                    disableResponse,
                    disableRecovery,
                    responseAttempt,
                    dataRequestAttempt + 1,
                    checkedNetworkAddress,
                    discoveredRoute,
                    assocRemove,
                    assocRestore,
                );
            } else {
                let doAssocRemove = false;
                if (
                    !assocRemove &&
                    dataConfirmResult === ZnpCommandStatus.MAC_TRANSACTION_EXPIRED &&
                    dataRequestAttempt >= 1 &&
                    this.supportsAssocRemove()
                ) {
                    const match = await this.znp.requestWithReply(Subsystem.UTIL, 'assocGetWithAddress', {
                        extaddr: ieeeAddr,
                        nwkaddr: networkAddress,
                    });

                    if (match.payload.nwkaddr !== 0xfffe && match.payload.noderelation !== 255) {
                        doAssocRemove = true;
                        assocRestore = {ieeeadr: ieeeAddr, nwkaddr: networkAddress, noderelation: match.payload.noderelation};
                    }

                    assocRemove = true;
                }

                // NWK_NO_ROUTE: no network route => rediscover route
                // MAC_NO_ACK: route may be corrupted
                // MAC_TRANSACTION_EXPIRED: Mac layer is sleeping
                if (doAssocRemove) {
                    /**
                     * Since child aging is disabled on the firmware, when a end device is directly connected
                     * to the coordinator and changes parent and the coordinator does not recevie this update,
                     * it still thinks it's directly connected.
                     * A discoverRoute() is not send out in this case, therefore remove it from the associated device
                     * list and try again.
                     * Note: assocRemove is a custom command, not available by default, only available on recent
                     * z-stack-firmware firmware version. In case it's not supported by the coordinator we will
                     * automatically timeout after 60000ms.
                     */
                    logger.debug(`assocRemove(${ieeeAddr})`, NS);
                    await this.znp.request(Subsystem.UTIL, 'assocRemove', {ieeeadr: ieeeAddr});
                } else if (!discoveredRoute && dataRequestAttempt >= 1) {
                    discoveredRoute = true;
                    await this.discoverRoute(networkAddress);
                } else if (!checkedNetworkAddress && dataRequestAttempt >= 1) {
                    // Figure out once if the network address has been changed.
                    try {
                        checkedNetworkAddress = true;
                        const actualNetworkAddress = await this.requestNetworkAddress(ieeeAddr);
                        if (networkAddress !== actualNetworkAddress) {
                            logger.debug(`Failed because request was done with wrong network address`, NS);
                            discoveredRoute = true;
                            networkAddress = actualNetworkAddress;
                            await this.discoverRoute(actualNetworkAddress);
                        } else {
                            logger.debug('Network address did not change', NS);
                        }
                        /* v8 ignore start */
                    } catch {
                        /* empty */
                    }
                    /* v8 ignore stop */
                } else {
                    logger.debug('Wait 2000ms', NS);
                    await wait(2000);
                }

                return await this.sendZclFrameToEndpointInternal(
                    ieeeAddr,
                    networkAddress,
                    endpoint,
                    sourceEndpoint,
                    zclFrame,
                    timeout,
                    disableResponse,
                    disableRecovery,
                    responseAttempt,
                    dataRequestAttempt + 1,
                    checkedNetworkAddress,
                    discoveredRoute,
                    assocRemove,
                    assocRestore,
                );
            }
        }

        if (response !== null) {
            try {
                const result = await response.start().promise;
                return result;
            } catch (error) {
                logger.debug(`Response timeout (${ieeeAddr}:${networkAddress},${responseAttempt})`, NS);
                if (responseAttempt < 1 && !disableRecovery) {
                    // No response could be because the radio of the end device is turned off:
                    // Sometimes the coordinator does not properly set the PENDING flag.
                    // Try to rewrite the device entry in the association table, this fixes it sometimes.
                    const match = await this.znp.requestWithReply(Subsystem.UTIL, 'assocGetWithAddress', {
                        extaddr: ieeeAddr,
                        nwkaddr: networkAddress,
                    });
                    logger.debug(
                        `Response timeout recovery: Node relation ${match.payload.noderelation} (${ieeeAddr} / ${match.payload.nwkaddr})`,
                        NS,
                    );
                    if (
                        this.supportsAssocAdd() &&
                        this.supportsAssocRemove() &&
                        match.payload.nwkaddr !== 0xfffe &&
                        match.payload.noderelation == 1
                    ) {
                        logger.debug(`Response timeout recovery: Rewrite association table entry (${ieeeAddr})`, NS);
                        await this.znp.request(Subsystem.UTIL, 'assocRemove', {ieeeadr: ieeeAddr});
                        await this.znp.request(Subsystem.UTIL, 'assocAdd', {
                            ieeeadr: ieeeAddr,
                            nwkaddr: networkAddress,
                            noderelation: match.payload.noderelation,
                        });
                    }
                    // No response could be of invalid route, e.g. when message is send to wrong parent of end device.
                    await this.discoverRoute(networkAddress);
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
                        checkedNetworkAddress,
                        discoveredRoute,
                        assocRemove,
                        assocRestore,
                    );
                } else {
                    throw error;
                }
            }
        }
    }

    public async sendZclFrameToGroup(groupID: number, zclFrame: Zcl.Frame, sourceEndpoint?: number): Promise<void> {
        return await this.queue.execute<void>(async () => {
            this.checkInterpanLock();
            await this.dataRequestExtended(
                AddressMode.ADDR_GROUP,
                groupID,
                0xff,
                0,
                sourceEndpoint || 1,
                zclFrame.cluster.ID,
                Constants.AF.DEFAULT_RADIUS,
                zclFrame.toBuffer(),
                3000,
                true,
            );

            /**
             * As a group command is not confirmed and thus immidiately returns
             * (contrary to network address requests) we will give the
             * command some time to 'settle' in the network.
             */
            await wait(200);
        });
    }

    public async sendZclFrameToAll(endpoint: number, zclFrame: Zcl.Frame, sourceEndpoint: number, destination: BroadcastAddress): Promise<void> {
        return await this.queue.execute<void>(async () => {
            this.checkInterpanLock();
            await this.dataRequestExtended(
                AddressMode.ADDR_16BIT,
                destination,
                endpoint,
                0,
                sourceEndpoint,
                zclFrame.cluster.ID,
                Constants.AF.DEFAULT_RADIUS,
                zclFrame.toBuffer(),
                3000,
                false,
                0,
            );

            /**
             * As a broadcast command is not confirmed and thus immidiately returns
             * (contrary to network address requests) we will give the
             * command some time to 'settle' in the network.
             */
            await wait(200);
        });
    }

    public async addInstallCode(ieeeAddress: string, key: Buffer): Promise<void> {
        assert(this.version.product !== ZnpVersion.zStack12, 'Install code is not supported for ZStack 1.2 adapter');
        const payload = {installCodeFormat: key.length === 18 ? 1 : 2, ieeeaddr: ieeeAddress, installCode: key};
        await this.znp.request(Subsystem.APP_CNF, 'bdbAddInstallCode', payload);
    }

    /**
     * Event handlers
     */
    public onZnpClose(): void {
        if (!this.closing) {
            this.emit('disconnected');
        }
    }

    private onZnpRecieved(object: ZpiObject): void {
        if (object.type !== UnpiConstants.Type.AREQ) {
            return;
        }

        if (object.subsystem === Subsystem.ZDO) {
            if (isMtCmdAreqZdo(object.command)) {
                this.emit('zdoResponse', object.command.zdoClusterId, object.payload.zdo);
            }

            if (object.command.name === 'tcDeviceInd') {
                const payload: Events.DeviceJoinedPayload = {
                    networkAddress: object.payload.nwkaddr,
                    ieeeAddr: object.payload.extaddr,
                };

                this.emit('deviceJoined', payload);
            } else if (object.command.name === 'endDeviceAnnceInd') {
                // TODO: better way???
                if (Zdo.Buffalo.checkStatus<Zdo.ClusterId.END_DEVICE_ANNOUNCE>(object.payload.zdo)) {
                    const zdoPayload = object.payload.zdo[1];
                    // Only discover routes to end devices, if bit 1 of capabilities === 0 it's an end device.
                    const isEndDevice = zdoPayload.capabilities.deviceType === 0;

                    if (isEndDevice) {
                        if (!this.deviceAnnounceRouteDiscoveryDebouncers.has(zdoPayload.nwkAddress)) {
                            // If a device announces multiple times in a very short time, it makes no sense
                            // to rediscover the route every time.
                            const debouncer = debounce(
                                () => {
                                    // eslint-disable-next-line @typescript-eslint/no-floating-promises
                                    this.queue.execute<void>(async () => {
                                        this.discoverRoute(zdoPayload.nwkAddress, false).catch(() => {});
                                    }, zdoPayload.nwkAddress);
                                },
                                60 * 1000,
                                {immediate: true},
                            );
                            this.deviceAnnounceRouteDiscoveryDebouncers.set(zdoPayload.nwkAddress, debouncer);
                        }

                        const debouncer = this.deviceAnnounceRouteDiscoveryDebouncers.get(zdoPayload.nwkAddress);
                        assert(debouncer);
                        debouncer();
                    }
                }
            } else if (object.command.name === 'concentratorIndCb') {
                // Some routers may change short addresses and the announcement
                // is missed by the coordinator. This can happen when there are
                // power outages or other interruptions in service. They may
                // not send additional announcements, causing the device to go
                // offline. However, those devices may instead send
                // Concentrator Indicator Callback commands, which contain both
                // the short and the long address allowing us to update our own
                // mappings.
                // https://e2e.ti.com/cfs-file/__key/communityserver-discussions-components-files/158/4403.zstacktask.c
                // https://github.com/Koenkk/zigbee-herdsman/issues/74
                this.emit('zdoResponse', Zdo.ClusterId.NETWORK_ADDRESS_RESPONSE, [
                    Zdo.Status.SUCCESS,
                    {
                        eui64: object.payload.extaddr,
                        nwkAddress: object.payload.srcaddr,
                        startIndex: 0,
                        assocDevList: [],
                    } as ZdoTypes.NetworkAddressResponse,
                ]);
            } else {
                if (object.command.name === 'leaveInd') {
                    if (object.payload.rejoin) {
                        logger.debug(`Device leave: Got leave indication with rejoin=true, nothing to do`, NS);
                    } else {
                        const payload: Events.DeviceLeavePayload = {
                            networkAddress: object.payload.srcaddr,
                            ieeeAddr: object.payload.extaddr,
                        };

                        this.emit('deviceLeave', payload);
                    }
                }
            }
        } else {
            if (object.subsystem === Subsystem.AF) {
                if (object.command.name === 'incomingMsg' || object.command.name === 'incomingMsgExt') {
                    const payload: Events.ZclPayload = {
                        clusterID: object.payload.clusterid,
                        data: object.payload.data,
                        header: Zcl.Header.fromBuffer(object.payload.data),
                        address: object.payload.srcaddr,
                        endpoint: object.payload.srcendpoint,
                        linkquality: object.payload.linkquality,
                        groupID: object.payload.groupid,
                        wasBroadcast: object.payload.wasbroadcast === 1,
                        destinationEndpoint: object.payload.dstendpoint,
                    };

                    this.waitress.resolve(payload);
                    this.emit('zclPayload', payload);
                }
            }
        }
    }

    public async getNetworkParameters(): Promise<NetworkParameters> {
        const result = await this.znp.requestWithReply(Subsystem.ZDO, 'extNwkInfo', {});
        return {
            panID: result.payload.panid as number,
            extendedPanID: result.payload.extendedpanid as string, // read as IEEEADDR, so `0x${string}`
            channel: result.payload.channel as number,
        };
    }

    public async supportsBackup(): Promise<boolean> {
        return true;
    }

    public checkBackup(backup: Models.Backup): void {
        if (!backup.znp?.trustCenterLinkKeySeed) {
            throw new Error(`Current backup file is not for zStack.`);
        }

        if (
            this.version.product === ZnpVersion.zStack12 &&
            backup &&
            backup.znp?.version !== undefined &&
            backup.znp.version !== ZnpVersion.zStack12
        ) {
            throw new Error(
                `your backup is from newer platform version (Z-Stack 3.0.x+) and cannot be restored onto Z-Stack 1.2 adapter - please remove backup before proceeding`,
            );
        }
    }

    public async backup(ieeeAddressesInDatabase: string[]): Promise<Models.Backup> {
        return await this.adapterManager.backup.createBackup(ieeeAddressesInDatabase, this.getStoredBackup.bind(this));
    }

    public async setChannelInterPAN(channel: number): Promise<void> {
        return await this.queue.execute<void>(async () => {
            this.interpanLock = true;
            await this.znp.request(Subsystem.AF, 'interPanCtl', {cmd: 1, data: [channel]});

            if (!this.interpanEndpointRegistered) {
                // Make sure that endpoint 12 is registered to proxy the InterPAN messages.
                await this.znp.request(Subsystem.AF, 'interPanCtl', {cmd: 2, data: [12]});
                this.interpanEndpointRegistered = true;
            }
        });
    }

    public async sendZclFrameInterPANToIeeeAddr(zclFrame: Zcl.Frame, ieeeAddr: string): Promise<void> {
        return await this.queue.execute<void>(async () => {
            await this.dataRequestExtended(
                AddressMode.ADDR_64BIT,
                ieeeAddr,
                0xfe,
                0xffff,
                12,
                zclFrame.cluster.ID,
                30,
                zclFrame.toBuffer(),
                10000,
                false,
            );
        });
    }

    public async sendZclFrameInterPANBroadcast(zclFrame: Zcl.Frame, timeout: number): Promise<Events.ZclPayload> {
        return await this.queue.execute<Events.ZclPayload>(async () => {
            const command = zclFrame.command;
            if (command.response == undefined) {
                throw new Error(`Command '${command.name}' has no response, cannot wait for response`);
            }

            const response = this.waitForInternal(
                undefined,
                0xfe,
                zclFrame.header.frameControl.frameType,
                Zcl.Direction.SERVER_TO_CLIENT,
                undefined,
                zclFrame.cluster.ID,
                command.response,
                timeout,
            );

            try {
                await this.dataRequestExtended(
                    AddressMode.ADDR_16BIT,
                    0xffff,
                    0xfe,
                    0xffff,
                    12,
                    zclFrame.cluster.ID,
                    30,
                    zclFrame.toBuffer(),
                    10000,
                    false,
                );
            } catch (error) {
                response.cancel();
                throw error;
            }

            return await response.start().promise;
        });
    }

    public async restoreChannelInterPAN(): Promise<void> {
        return await this.queue.execute<void>(async () => {
            await this.znp.request(Subsystem.AF, 'interPanCtl', {cmd: 0, data: []});
            // Give adapter some time to restore, otherwise stuff crashes
            await wait(3000);
            this.interpanLock = false;
        });
    }

    private waitForInternal(
        networkAddress: number | undefined,
        endpoint: number,
        frameType: Zcl.FrameType,
        direction: Zcl.Direction,
        transactionSequenceNumber: number | undefined,
        clusterID: number,
        commandIdentifier: number,
        timeout: number,
    ): {start: () => {promise: Promise<Events.ZclPayload>}; cancel: () => void} {
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
    ): {promise: Promise<Events.ZclPayload>; cancel: () => void} {
        const waiter = this.waitForInternal(
            networkAddress,
            endpoint,
            frameType,
            direction,
            transactionSequenceNumber,
            clusterID,
            commandIdentifier,
            timeout,
        );

        return {cancel: waiter.cancel, promise: waiter.start().promise};
    }

    /**
     * Private methods
     */
    private async dataRequest(
        destinationAddress: number,
        destinationEndpoint: number,
        sourceEndpoint: number,
        clusterID: number,
        radius: number,
        data: Buffer,
        timeout: number,
    ): Promise<number> {
        const transactionID = this.nextTransactionID();
        const response = this.znp.waitFor(Type.AREQ, Subsystem.AF, 'dataConfirm', undefined, transactionID, undefined, timeout);

        await this.znp.request(
            Subsystem.AF,
            'dataRequest',
            {
                dstaddr: destinationAddress,
                destendpoint: destinationEndpoint,
                srcendpoint: sourceEndpoint,
                clusterid: clusterID,
                transid: transactionID,
                options: 0,
                radius: radius,
                len: data.length,
                data: data,
            },
            response.ID,
        );

        let result = null;
        try {
            const dataConfirm = await response.start().promise;
            result = dataConfirm.payload.status;
        } catch {
            result = DataConfirmTimeout;
        }

        return result;
    }

    private async dataRequestExtended(
        addressMode: number,
        destinationAddressOrGroupID: number | string,
        destinationEndpoint: number,
        panID: number,
        sourceEndpoint: number,
        clusterID: number,
        radius: number,
        data: Buffer,
        timeout: number,
        confirmation: boolean,
        attemptsLeft = 5,
    ): Promise<ZpiObject | void> {
        const transactionID = this.nextTransactionID();
        const response = confirmation
            ? this.znp.waitFor(Type.AREQ, Subsystem.AF, 'dataConfirm', undefined, transactionID, undefined, timeout)
            : undefined;

        await this.znp.request(
            Subsystem.AF,
            'dataRequestExt',
            {
                dstaddrmode: addressMode,
                dstaddr: this.toAddressString(destinationAddressOrGroupID),
                destendpoint: destinationEndpoint,
                dstpanid: panID,
                srcendpoint: sourceEndpoint,
                clusterid: clusterID,
                transid: transactionID,
                options: 0, // TODO: why was this here? Constants.AF.options.DISCV_ROUTE,
                radius,
                len: data.length,
                data: data,
            },
            response?.ID,
        );

        if (confirmation && response) {
            const dataConfirm = await response.start().promise;
            if (dataConfirm.payload.status !== ZnpCommandStatus.SUCCESS) {
                if (
                    attemptsLeft > 0 &&
                    (dataConfirm.payload.status === ZnpCommandStatus.MAC_CHANNEL_ACCESS_FAILURE ||
                        dataConfirm.payload.status === ZnpCommandStatus.BUFFER_FULL)
                ) {
                    /**
                     * 225: When many commands at once are executed we can end up in a MAC channel access failure
                     * error. This is because there is too much traffic on the network.
                     * Retry this command once after a cooling down period.
                     */
                    await wait(2000);
                    return await this.dataRequestExtended(
                        addressMode,
                        destinationAddressOrGroupID,
                        destinationEndpoint,
                        panID,
                        sourceEndpoint,
                        clusterID,
                        radius,
                        data,
                        timeout,
                        confirmation,
                        attemptsLeft - 1,
                    );
                } else {
                    throw new DataConfirmError(dataConfirm.payload.status);
                }
            }

            return dataConfirm;
        }
    }

    private nextTransactionID(): number {
        this.transactionID++;

        if (this.transactionID > 255) {
            this.transactionID = 1;
        }

        return this.transactionID;
    }

    private toAddressString(address: number | string): string {
        return typeof address === 'number' ? `0x${address.toString(16).padStart(16, '0')}` : address.toString();
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

    private checkInterpanLock(): void {
        if (this.interpanLock) {
            throw new Error(`Cannot execute command, in Inter-PAN mode`);
        }
    }
}

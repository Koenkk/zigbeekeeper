import assert from 'assert';
import events from 'events';
import fs from 'fs';

import mixinDeep from 'mixin-deep';

import {Adapter, Events as AdapterEvents, TsType as AdapterTsType} from '../adapter';
import {BackupUtils, Wait} from '../utils';
import {logger} from '../utils/logger';
import {isNumberArrayOfLength} from '../utils/utils';
import * as ZSpec from '../zspec';
import {EUI64} from '../zspec/tstypes';
import * as Zcl from '../zspec/zcl';
import {FrameControl} from '../zspec/zcl/definition/tstype';
import * as Zdo from '../zspec/zdo';
import * as ZdoTypes from '../zspec/zdo/definition/tstypes';
import Database from './database';
import * as Events from './events';
import GreenPower from './greenPower';
import {ZclFrameConverter} from './helpers';
import {Device, Entity} from './model';
import Group from './model/group';
import Touchlink from './touchlink';
import {DeviceType, GreenPowerDeviceJoinedPayload, KeyValue} from './tstype';

const NS = 'zh:controller';

interface Options {
    network: AdapterTsType.NetworkOptions;
    serialPort: AdapterTsType.SerialPortOptions;
    databasePath: string;
    databaseBackupPath: string;
    backupPath: string;
    adapter: AdapterTsType.AdapterOptions;
    /**
     * This lambda can be used by an application to explictly reject or accept an incoming device.
     * When false is returned zigbee-herdsman will not start the interview process and immidiately
     * try to remove the device from the network.
     */
    acceptJoiningDeviceHandler: (ieeeAddr: string) => Promise<boolean>;
}

const DefaultOptions: Pick<Options, 'network' | 'serialPort' | 'adapter'> = {
    network: {
        networkKeyDistribute: false,
        networkKey: [0x01, 0x03, 0x05, 0x07, 0x09, 0x0b, 0x0d, 0x0f, 0x00, 0x02, 0x04, 0x06, 0x08, 0x0a, 0x0c, 0x0d],
        panID: 0x1a62,
        extendedPanID: [0xdd, 0xdd, 0xdd, 0xdd, 0xdd, 0xdd, 0xdd, 0xdd],
        channelList: [11],
    },
    serialPort: {},
    adapter: {disableLED: false},
};

export interface ControllerEventMap {
    message: [data: Events.MessagePayload];
    adapterDisconnected: [];
    deviceJoined: [data: Events.DeviceJoinedPayload];
    deviceInterview: [data: Events.DeviceInterviewPayload];
    deviceAnnounce: [data: Events.DeviceAnnouncePayload];
    deviceNetworkAddressChanged: [data: Events.DeviceNetworkAddressChangedPayload];
    deviceLeave: [data: Events.DeviceLeavePayload];
    permitJoinChanged: [data: Events.PermitJoinChangedPayload];
    lastSeenChanged: [data: Events.LastSeenChangedPayload];
    sourceRoute: [data: Events.SrcRouteIndPayload];
}

/**
 * @noInheritDoc
 */
class Controller extends events.EventEmitter<ControllerEventMap> {
    private options: Options;
    // @ts-expect-error assigned and validated in start()
    private database: Database;
    // @ts-expect-error assigned and validated in start()
    private adapter: Adapter;
    // @ts-expect-error assigned and validated in start()
    private greenPower: GreenPower;
    // @ts-expect-error assigned and validated in start()
    private touchlink: Touchlink;

    private permitJoinTimer: NodeJS.Timeout | undefined;
    private permitJoinEnd?: number;
    private backupTimer: NodeJS.Timeout | undefined;
    private databaseSaveTimer: NodeJS.Timeout | undefined;
    private stopping: boolean;
    private adapterDisconnected: boolean;
    private networkParametersCached: AdapterTsType.NetworkParameters | undefined;
    /** List of unknown devices detected during a single runtime session. Serves as de-dupe and anti-spam. */
    private unknownDevices: Set<number>;

    /**
     * Create a controller
     *
     * To auto detect the port provide `null` for `options.serialPort.path`
     */
    public constructor(options: Options) {
        super();
        this.stopping = false;
        this.adapterDisconnected = true; // set false after adapter.start() is successfully called
        this.options = mixinDeep(JSON.parse(JSON.stringify(DefaultOptions)), options);
        this.unknownDevices = new Set();

        // Validate options
        for (const channel of this.options.network.channelList) {
            if (channel < 11 || channel > 26) {
                throw new Error(`'${channel}' is an invalid channel, use a channel between 11 - 26.`);
            }
        }

        if (!isNumberArrayOfLength(this.options.network.networkKey, 16)) {
            throw new Error(`Network key must be a 16 digits long array, got ${this.options.network.networkKey}.`);
        }

        if (!isNumberArrayOfLength(this.options.network.extendedPanID, 8)) {
            throw new Error(`ExtendedPanID must be an 8 digits long array, got ${this.options.network.extendedPanID}.`);
        }

        if (this.options.network.panID < 1 || this.options.network.panID >= 0xffff) {
            throw new Error(`PanID must have a value of 0x0001 (1) - 0xFFFE (65534), got ${this.options.network.panID}.`);
        }
    }

    /**
     * Start the Herdsman controller
     */
    public async start(): Promise<AdapterTsType.StartResult> {
        // Database (create end inject)
        this.database = Database.open(this.options.databasePath);
        Entity.injectDatabase(this.database);

        // Adapter (create and inject)
        this.adapter = await Adapter.create(this.options.network, this.options.serialPort, this.options.backupPath, this.options.adapter);

        const stringifiedOptions = JSON.stringify(this.options).replaceAll(JSON.stringify(this.options.network.networkKey), '"HIDDEN"');
        logger.debug(`Starting with options '${stringifiedOptions}'`, NS);
        const startResult = await this.adapter.start();
        logger.debug(`Started with result '${startResult}'`, NS);
        this.adapterDisconnected = false;

        // Check if we have to change the channel, only do this when adapter `resumed` because:
        // - `getNetworkParameters` might be return wrong info because it needs to propogate after backup restore
        // - If result is not `resumed` (`reset` or `restored`), the adapter should comission with the channel from `this.options.network`
        if (startResult === 'resumed') {
            const netParams = await this.getNetworkParameters();
            const configuredChannel = this.options.network.channelList[0];
            const adapterChannel = netParams.channel;

            if (configuredChannel != adapterChannel) {
                logger.info(`Configured channel '${configuredChannel}' does not match adapter channel '${adapterChannel}', changing channel`, NS);
                await this.changeChannel(adapterChannel, configuredChannel);
            }
        }

        Entity.injectAdapter(this.adapter);

        // log injection
        logger.debug(`Injected database: ${this.database != undefined}, adapter: ${this.adapter != undefined}`, NS);

        this.greenPower = new GreenPower(this.adapter);
        this.greenPower.on('deviceJoined', this.onDeviceJoinedGreenPower.bind(this));

        // Register adapter events
        this.adapter.on('deviceJoined', this.onDeviceJoined.bind(this));
        this.adapter.on('zclPayload', this.onZclPayload.bind(this));
        this.adapter.on('zdoResponse', this.onZdoResponse.bind(this));
        this.adapter.on('disconnected', this.onAdapterDisconnected.bind(this));
        this.adapter.on('deviceLeave', this.onDeviceLeave.bind(this));
        this.adapter.on('sourceRoute', this.onSourceRoute.bind(this));

        if (startResult === 'reset') {
            /* istanbul ignore else */
            if (this.options.databaseBackupPath && fs.existsSync(this.options.databasePath)) {
                fs.copyFileSync(this.options.databasePath, this.options.databaseBackupPath);
            }

            logger.debug('Clearing database...', NS);
            for (const group of Group.allIterator()) {
                group.removeFromDatabase();
            }

            for (const device of Device.allIterator()) {
                device.removeFromDatabase();
            }
        }

        if (startResult === 'reset' || (this.options.backupPath && !fs.existsSync(this.options.backupPath))) {
            await this.backup();
        }

        // Add coordinator to the database if it is not there yet.
        const coordinatorIEEE = await this.adapter.getCoordinatorIEEE();

        if (Device.byType('Coordinator').length === 0) {
            logger.debug('No coordinator in database, querying...', NS);
            const coordinator = Device.create(
                'Coordinator',
                coordinatorIEEE,
                ZSpec.COORDINATOR_ADDRESS,
                this.adapter.manufacturerID,
                undefined,
                undefined,
                undefined,
                true,
            );

            await coordinator.updateActiveEndpoints();

            for (const endpoint of coordinator.endpoints) {
                await endpoint.updateSimpleDescriptor();
            }

            coordinator.save();
        }

        // Update coordinator ieeeAddr if changed, can happen due to e.g. reflashing
        const databaseCoordinator = Device.byType('Coordinator')[0];
        if (databaseCoordinator.ieeeAddr !== coordinatorIEEE) {
            logger.info(`Coordinator address changed, updating to '${coordinatorIEEE}'`, NS);
            databaseCoordinator.changeIeeeAddress(coordinatorIEEE);
        }

        // Set backup timer to 1 day.
        this.backupTimer = setInterval(() => this.backup(), 86400000);

        // Set database save timer to 1 hour.
        this.databaseSaveTimer = setInterval(() => this.databaseSave(), 3600000);

        this.touchlink = new Touchlink(this.adapter);

        return startResult;
    }

    public async touchlinkIdentify(ieeeAddr: string, channel: number): Promise<void> {
        await this.touchlink.identify(ieeeAddr, channel);
    }

    public async touchlinkScan(): Promise<{ieeeAddr: string; channel: number}[]> {
        return await this.touchlink.scan();
    }

    public async touchlinkFactoryReset(ieeeAddr: string, channel: number): Promise<boolean> {
        return await this.touchlink.factoryReset(ieeeAddr, channel);
    }

    public async touchlinkFactoryResetFirst(): Promise<boolean> {
        return await this.touchlink.factoryResetFirst();
    }

    public async addInstallCode(installCode: string): Promise<void> {
        const aqaraMatch = installCode.match(/^G\$M:.+\$A:(.+)\$I:(.+)$/);
        const pipeMatch = installCode.match(/^(.+)\|(.+)$/);
        let ieeeAddr, key;

        if (aqaraMatch) {
            ieeeAddr = aqaraMatch[1];
            key = aqaraMatch[2];
        } else if (pipeMatch) {
            ieeeAddr = pipeMatch[1];
            key = pipeMatch[2];
        } else {
            assert(
                installCode.length === 95 || installCode.length === 91,
                `Unsupported install code, got ${installCode.length} chars, expected 95 or 91`,
            );
            const keyStart = installCode.length - (installCode.length === 95 ? 36 : 32);
            ieeeAddr = installCode.substring(keyStart - 19, keyStart - 3);
            key = installCode.substring(keyStart, installCode.length);
        }

        ieeeAddr = `0x${ieeeAddr}`;
        // match valid else asserted above
        key = Buffer.from(key.match(/.{1,2}/g)!.map((d) => parseInt(d, 16)));

        // will throw if code cannot be fixed and is invalid
        const [adjustedKey, adjusted] = ZSpec.Utils.checkInstallCode(key, true);

        if (adjusted) {
            logger.info(`Install code was adjusted for reason '${adjusted}'.`, NS);
        }

        logger.info(`Adding install code for ${ieeeAddr}.`, NS);

        await this.adapter.addInstallCode(ieeeAddr, adjustedKey);
    }

    public async permitJoin(time: number, device?: Device): Promise<void> {
        clearTimeout(this.permitJoinTimer);
        this.permitJoinTimer = undefined;
        this.permitJoinEnd = undefined;

        if (time > 0) {
            // never permit more than uint8, and never permit 255 that is often equal to "forever"
            assert(time <= 254, `Cannot permit join for more than 254 seconds.`);

            await this.adapter.permitJoin(time, device?.networkAddress);
            await this.greenPower.permitJoin(time, device?.networkAddress);

            const timeMs = time * 1000;
            this.permitJoinEnd = Date.now() + timeMs;
            this.permitJoinTimer = setTimeout((): void => {
                this.emit('permitJoinChanged', {permitted: false});

                this.permitJoinTimer = undefined;
                this.permitJoinEnd = undefined;
            }, timeMs);

            this.emit('permitJoinChanged', {permitted: true, time});
        } else {
            logger.debug('Disable joining', NS);

            await this.greenPower.permitJoin(0);
            await this.adapter.permitJoin(0);

            this.emit('permitJoinChanged', {permitted: false});
        }
    }

    public getPermitJoin(): boolean {
        return this.permitJoinTimer !== undefined;
    }

    public getPermitJoinEnd(): number | undefined {
        return this.permitJoinEnd;
    }

    public isStopping(): boolean {
        return this.stopping;
    }

    public isAdapterDisconnected(): boolean {
        return this.adapterDisconnected;
    }

    public async stop(): Promise<void> {
        this.stopping = true;

        // Unregister adapter events
        this.adapter.removeAllListeners();

        clearInterval(this.backupTimer);
        clearInterval(this.databaseSaveTimer);

        if (this.adapterDisconnected) {
            this.databaseSave();
        } else {
            try {
                await this.permitJoin(0);
            } catch (error) {
                logger.error(`Failed to disable join on stop: ${error}`, NS);
            }

            await this.backup(); // always calls databaseSave()
            await this.adapter.stop();

            this.adapterDisconnected = true;
        }

        Device.resetCache();
        Group.resetCache();
    }

    private databaseSave(): void {
        for (const device of Device.allIterator()) {
            device.save(false);
        }

        for (const group of Group.allIterator()) {
            group.save(false);
        }

        this.database.write();
    }

    public async backup(): Promise<void> {
        this.databaseSave();
        if (this.options.backupPath && (await this.adapter.supportsBackup())) {
            logger.debug('Creating coordinator backup', NS);
            const backup = await this.adapter.backup(this.getDeviceIeeeAddresses());
            const unifiedBackup = await BackupUtils.toUnifiedBackup(backup);
            const tmpBackupPath = this.options.backupPath + '.tmp';
            fs.writeFileSync(tmpBackupPath, JSON.stringify(unifiedBackup, null, 2));
            fs.renameSync(tmpBackupPath, this.options.backupPath);
            logger.info(`Wrote coordinator backup to '${this.options.backupPath}'`, NS);
        }
    }

    public async coordinatorCheck(): Promise<{missingRouters: Device[]}> {
        if (await this.adapter.supportsBackup()) {
            const backup = await this.adapter.backup(this.getDeviceIeeeAddresses());
            const devicesInBackup = backup.devices.map((d) => ZSpec.Utils.eui64BEBufferToHex(d.ieeeAddress));
            const missingRouters = [];

            for (const device of this.getDevicesIterator((d) => d.type === 'Router' && !devicesInBackup.includes(d.ieeeAddr as EUI64))) {
                missingRouters.push(device);
            }

            return {missingRouters};
        } else {
            throw new Error("Coordinator does not coordinator check because it doesn't support backups");
        }
    }

    public async reset(type: 'soft' | 'hard'): Promise<void> {
        await this.adapter.reset(type);
    }

    public async getCoordinatorVersion(): Promise<AdapterTsType.CoordinatorVersion> {
        return await this.adapter.getCoordinatorVersion();
    }

    public async getNetworkParameters(): Promise<AdapterTsType.NetworkParameters> {
        // Cache network parameters as they don't change anymore after start.
        if (!this.networkParametersCached) {
            this.networkParametersCached = await this.adapter.getNetworkParameters();
        }

        return this.networkParametersCached;
    }

    /**
     * Get all devices
     * @deprecated use getDevicesIterator()
     */
    public getDevices(): Device[] {
        return Device.all();
    }

    /**
     * Get iterator for all devices
     */
    public getDevicesIterator(predicate?: (value: Device) => boolean): Generator<Device> {
        return Device.allIterator(predicate);
    }

    /**
     * Get all devices with a specific type
     */
    public getDevicesByType(type: DeviceType): Device[] {
        return Device.byType(type);
    }

    /**
     * Get device by ieeeAddr
     */
    public getDeviceByIeeeAddr(ieeeAddr: string): Device | undefined {
        return Device.byIeeeAddr(ieeeAddr);
    }

    /**
     * Get device by networkAddress
     */
    public getDeviceByNetworkAddress(networkAddress: number): Device | undefined {
        return Device.byNetworkAddress(networkAddress);
    }

    /**
     * Get IEEE address for all devices
     */
    public getDeviceIeeeAddresses(): string[] {
        const deviceIeeeAddresses = [];

        for (const device of Device.allIterator()) {
            deviceIeeeAddresses.push(device.ieeeAddr);
        }

        return deviceIeeeAddresses;
    }

    /**
     * Get group by ID
     */
    public getGroupByID(groupID: number): Group | undefined {
        return Group.byGroupID(groupID);
    }

    /**
     * Get all groups
     * @deprecated use getGroupsIterator()
     */
    public getGroups(): Group[] {
        return Group.all();
    }

    /**
     * Get iterator for all groups
     */
    public getGroupsIterator(predicate?: (value: Group) => boolean): Generator<Group> {
        return Group.allIterator(predicate);
    }

    /**
     * Create a Group
     */
    public createGroup(groupID: number): Group {
        return Group.create(groupID);
    }

    /**
     * Broadcast a network-wide channel change.
     */
    private async changeChannel(oldChannel: number, newChannel: number): Promise<void> {
        logger.warning(`Changing channel from '${oldChannel}' to '${newChannel}'`, NS);

        const clusterId = Zdo.ClusterId.NWK_UPDATE_REQUEST;
        const zdoPayload = Zdo.Buffalo.buildRequest(this.adapter.hasZdoMessageOverhead, clusterId, [newChannel], 0xfe, undefined, 0, undefined);

        await this.adapter.sendZdo(ZSpec.BLANK_EUI64, ZSpec.BroadcastAddress.SLEEPY, clusterId, zdoPayload, true);
        logger.info(`Channel changed to '${newChannel}'`, NS);

        this.networkParametersCached = undefined; // invalidate cache
        // wait for the broadcast to propagate and the adapter to actually change
        // NOTE: observed to ~9sec on `ember` with actual stack event
        await Wait(12000);
    }

    public async identifyUnknownDevice(nwkAddress: number): Promise<Device | undefined> {
        if (this.unknownDevices.has(nwkAddress)) {
            // prevent duplicate triggering
            return;
        }

        logger.debug(`Trying to identify unknown device with address '${nwkAddress}'`, NS);
        this.unknownDevices.add(nwkAddress);
        const clusterId = Zdo.ClusterId.IEEE_ADDRESS_REQUEST;
        const zdoPayload = Zdo.Buffalo.buildRequest(this.adapter.hasZdoMessageOverhead, clusterId, nwkAddress, false, 0);

        try {
            const response = await this.adapter.sendZdo(ZSpec.BLANK_EUI64, nwkAddress, clusterId, zdoPayload, false);

            if (Zdo.Buffalo.checkStatus(response)) {
                const payload = response[1];
                const device = Device.byIeeeAddr(payload.eui64);

                /* istanbul ignore else */
                if (device) {
                    this.checkDeviceNetworkAddress(device, payload.eui64, payload.nwkAddress);
                    this.unknownDevices.delete(payload.nwkAddress);
                }

                return device;
            } else {
                throw new Zdo.StatusError(response[0]);
            }
        } catch (error) {
            // Catches 2 types of exception: Zdo.StatusError and no response from `adapter.sendZdo()`.
            logger.debug(`Failed to retrieve IEEE address for device '${nwkAddress}': ${error}`, NS);
        }

        // NOTE: by keeping nwkAddress in `this.unknownDevices` on fail, it prevents a non-responding device from potentially spamming identify.
        // This only lasts until next reboot (runtime Set), allowing to 'force' another trigger if necessary.
    }

    private checkDeviceNetworkAddress(device: Device, ieeeAddress: string, nwkAddress: number): void {
        if (device.networkAddress !== nwkAddress) {
            logger.debug(`Device '${ieeeAddress}' got new networkAddress '${nwkAddress}'`, NS);
            device.networkAddress = nwkAddress;
            device.save();

            this.selfAndDeviceEmit(device, 'deviceNetworkAddressChanged', {device});
        }
    }

    private onNetworkAddress(payload: ZdoTypes.NetworkAddressResponse): void {
        logger.debug(`Network address from '${payload.eui64}:${payload.nwkAddress}'`, NS);
        const device = Device.byIeeeAddr(payload.eui64);

        if (!device) {
            logger.debug(`Network address is from unknown device '${payload.eui64}:${payload.nwkAddress}'`, NS);
            return;
        }

        device.updateLastSeen();
        this.selfAndDeviceEmit(device, 'lastSeenChanged', {device, reason: 'networkAddress'});
        this.checkDeviceNetworkAddress(device, payload.eui64, payload.nwkAddress);
    }

    private onIEEEAddress(payload: ZdoTypes.IEEEAddressResponse): void {
        logger.debug(`IEEE address from '${payload.eui64}:${payload.nwkAddress}'`, NS);
        const device = Device.byIeeeAddr(payload.eui64);

        if (!device) {
            logger.debug(`IEEE address is from unknown device '${payload.eui64}:${payload.nwkAddress}'`, NS);
            return;
        }

        device.updateLastSeen();
        this.selfAndDeviceEmit(device, 'lastSeenChanged', {device, reason: 'networkAddress'});
        this.checkDeviceNetworkAddress(device, payload.eui64, payload.nwkAddress);
    }

    private onDeviceAnnounce(payload: ZdoTypes.EndDeviceAnnounce): void {
        logger.debug(`Device announce from '${payload.eui64}:${payload.nwkAddress}'`, NS);
        const device = Device.byIeeeAddr(payload.eui64);

        if (!device) {
            logger.debug(`Device announce is from unknown device '${payload.eui64}:${payload.nwkAddress}'`, NS);
            return;
        }

        device.updateLastSeen();
        this.selfAndDeviceEmit(device, 'lastSeenChanged', {device, reason: 'deviceAnnounce'});
        device.implicitCheckin();
        this.checkDeviceNetworkAddress(device, payload.eui64, payload.nwkAddress);
        this.selfAndDeviceEmit(device, 'deviceAnnounce', {device});
    }

    private onDeviceLeave(payload: AdapterEvents.DeviceLeavePayload): void {
        logger.debug(`Device leave '${payload.ieeeAddr}'`, NS);

        // XXX: seems type is not properly detected?
        const device = payload.ieeeAddr ? Device.byIeeeAddr(payload.ieeeAddr) : Device.byNetworkAddress(payload.networkAddress!);

        if (!device) {
            logger.debug(`Device leave is from unknown or already deleted device '${payload.ieeeAddr ?? payload.networkAddress}'`, NS);
            return;
        }

        logger.debug(`Removing device from database '${device.ieeeAddr}'`, NS);
        device.removeFromDatabase();

        this.selfAndDeviceEmit(device, 'deviceLeave', {ieeeAddr: device.ieeeAddr});
    }

    private async onAdapterDisconnected(): Promise<void> {
        logger.debug(`Adapter disconnected`, NS);

        this.adapterDisconnected = true;

        try {
            await this.adapter.stop();
        } catch (error) {
            logger.error(`Failed to stop adapter on disconnect: ${error}`, NS);
        }

        this.emit('adapterDisconnected');
    }

    private async onDeviceJoinedGreenPower(payload: GreenPowerDeviceJoinedPayload): Promise<void> {
        logger.debug(() => `Green power device '${JSON.stringify(payload)}' joined`, NS);

        // Green power devices don't have an ieeeAddr, the sourceID is unique and static so use this.
        let ieeeAddr = payload.sourceID.toString(16);
        ieeeAddr = `0x${ieeeAddr.padStart(16, '0')}`;

        // Green power devices dont' have a modelID, create a modelID based on the deviceID (=type)
        const modelID = `GreenPower_${payload.deviceID}`;

        let device = Device.byIeeeAddr(ieeeAddr, true);
        if (!device) {
            logger.debug(`New green power device '${ieeeAddr}' joined`, NS);
            logger.debug(`Creating device '${ieeeAddr}'`, NS);
            device = Device.create('GreenPower', ieeeAddr, payload.networkAddress, undefined, undefined, undefined, modelID, true);
            device.save();

            this.selfAndDeviceEmit(device, 'deviceJoined', {device});
            this.selfAndDeviceEmit(device, 'deviceInterview', {status: 'successful', device});
        } else if (device.isDeleted) {
            logger.debug(`Deleted green power device '${ieeeAddr}' joined, undeleting`, NS);

            device.undelete(true);

            this.selfAndDeviceEmit(device, 'deviceJoined', {device});
            this.selfAndDeviceEmit(device, 'deviceInterview', {status: 'successful', device});
        }
    }

    private selfAndDeviceEmit<K extends keyof ControllerEventMap>(
        device: Device,
        event: K,
        ...args: K extends keyof ControllerEventMap ? ControllerEventMap[K] : never
    ): void {
        device.emit(event, ...args);
        this.emit(event, ...args);
    }

    private async onDeviceJoined(payload: AdapterEvents.DeviceJoinedPayload): Promise<void> {
        logger.debug(`Device '${payload.ieeeAddr}' joined`, NS);

        /* istanbul ignore else */
        if (this.options.acceptJoiningDeviceHandler) {
            if (!(await this.options.acceptJoiningDeviceHandler(payload.ieeeAddr))) {
                logger.debug(`Device '${payload.ieeeAddr}' rejected by handler, removing it`, NS);

                // XXX: GP devices? see Device.removeFromNetwork
                try {
                    const clusterId = Zdo.ClusterId.LEAVE_REQUEST;
                    const zdoPayload = Zdo.Buffalo.buildRequest(
                        this.adapter.hasZdoMessageOverhead,
                        clusterId,
                        payload.ieeeAddr as EUI64,
                        Zdo.LeaveRequestFlags.WITHOUT_REJOIN,
                    );
                    const response = await this.adapter.sendZdo(payload.ieeeAddr, payload.networkAddress, clusterId, zdoPayload, false);

                    /* istanbul ignore else */
                    if (!Zdo.Buffalo.checkStatus(response)) {
                        throw new Zdo.StatusError(response[0]);
                    }
                } catch (error) {
                    logger.error(`Failed to remove rejected device: ${(error as Error).message}`, NS);
                }

                return;
            } else {
                logger.debug(`Device '${payload.ieeeAddr}' accepted by handler`, NS);
            }
        }

        let device = Device.byIeeeAddr(payload.ieeeAddr, true);
        if (!device) {
            logger.debug(`New device '${payload.ieeeAddr}' joined`, NS);
            logger.debug(`Creating device '${payload.ieeeAddr}'`, NS);
            device = Device.create('Unknown', payload.ieeeAddr, payload.networkAddress, undefined, undefined, undefined, undefined, false);
            this.selfAndDeviceEmit(device, 'deviceJoined', {device});
        } else if (device.isDeleted) {
            logger.debug(`Deleted device '${payload.ieeeAddr}' joined, undeleting`, NS);
            device.undelete();
            this.selfAndDeviceEmit(device, 'deviceJoined', {device});
        }

        if (device.networkAddress !== payload.networkAddress) {
            logger.debug(`Device '${payload.ieeeAddr}' is already in database with different network address, updating network address`, NS);
            device.networkAddress = payload.networkAddress;
            device.save();
        }

        device.updateLastSeen();
        this.selfAndDeviceEmit(device, 'lastSeenChanged', {device, reason: 'deviceJoined'});
        device.implicitCheckin();

        if (!device.interviewCompleted && !device.interviewing) {
            logger.info(`Interview for '${device.ieeeAddr}' started`, NS);
            this.selfAndDeviceEmit(device, 'deviceInterview', {status: 'started', device});

            try {
                await device.interview();
                logger.info(`Succesfully interviewed '${device.ieeeAddr}'`, NS);
                this.selfAndDeviceEmit(device, 'deviceInterview', {status: 'successful', device});
            } catch (error) {
                logger.error(`Interview failed for '${device.ieeeAddr} with error '${error}'`, NS);
                this.selfAndDeviceEmit(device, 'deviceInterview', {status: 'failed', device});
            }
        } else {
            logger.debug(
                `Not interviewing '${payload.ieeeAddr}', completed '${device.interviewCompleted}', in progress '${device.interviewing}'`,
                NS,
            );
        }
    }

    private async onZdoResponse(clusterId: Zdo.ClusterId, response: ZdoTypes.GenericZdoResponse): Promise<void> {
        logger.debug(
            `Received ZDO response: clusterId=${Zdo.ClusterId[clusterId]}, status=${Zdo.Status[response[0]]}, payload=${JSON.stringify(response[1])}`,
            NS,
        );

        switch (clusterId) {
            case Zdo.ClusterId.NETWORK_ADDRESS_RESPONSE: {
                /* istanbul ignore else */
                if (Zdo.Buffalo.checkStatus<typeof clusterId>(response)) {
                    this.onNetworkAddress(response[1]);
                }
                break;
            }

            case Zdo.ClusterId.IEEE_ADDRESS_RESPONSE: {
                /* istanbul ignore else */
                if (Zdo.Buffalo.checkStatus<typeof clusterId>(response)) {
                    this.onIEEEAddress(response[1]);
                }
                break;
            }

            case Zdo.ClusterId.END_DEVICE_ANNOUNCE: {
                /* istanbul ignore else */
                if (Zdo.Buffalo.checkStatus<typeof clusterId>(response)) {
                    this.onDeviceAnnounce(response[1]);
                }
                break;
            }
        }
    }

    private async onZclPayload(payload: AdapterEvents.ZclPayload): Promise<void> {
        let frame: Zcl.Frame | undefined;
        let device: Device | undefined;

        if (payload.clusterID === Zcl.Clusters.touchlink.ID) {
            // This is handled by touchlink
            return;
        } else if (payload.clusterID === Zcl.Clusters.greenPower.ID) {
            try {
                // Custom clusters are not supported for Green Power since we need to parse the frame to get the device.
                frame = Zcl.Frame.fromBuffer(payload.clusterID, payload.header, payload.data, {});
            } catch (error) {
                logger.debug(`Failed to parse frame green power frame, ignoring it: ${error}`, NS);
                return;
            }

            await this.greenPower.onZclGreenPowerData(payload, frame);

            // lookup encapsulated gpDevice for further processing
            device = Device.byNetworkAddress(frame.payload.srcID & 0xffff);
        } else {
            /**
             * Handling of re-transmitted Xiaomi messages.
             * https://github.com/Koenkk/zigbee2mqtt/issues/1238
             * https://github.com/Koenkk/zigbee2mqtt/issues/3592
             *
             * Some Xiaomi router devices re-transmit messages from Xiaomi end devices.
             * The network address of these message is set to the one of the Xiaomi router.
             * Therefore it looks like if the message came from the Xiaomi router, while in
             * fact it came from the end device.
             * Handling these message would result in false state updates.
             * The group ID attribute of these message defines the network address of the end device.
             */
            device = Device.find(payload.address);

            if (device?.manufacturerName === 'LUMI' && device?.type == 'Router' && payload.groupID) {
                logger.debug(`Handling re-transmitted Xiaomi message ${device.networkAddress} -> ${payload.groupID}`, NS);
                device = Device.byNetworkAddress(payload.groupID);
            }

            try {
                frame = Zcl.Frame.fromBuffer(payload.clusterID, payload.header, payload.data, device ? device.customClusters : {});
            } catch (error) {
                logger.debug(`Failed to parse frame: ${error}`, NS);
            }
        }

        if (!device) {
            if (typeof payload.address === 'number') {
                device = await this.identifyUnknownDevice(payload.address);
            }

            if (!device) {
                logger.debug(`Data is from unknown device with address '${payload.address}', skipping...`, NS);
                return;
            }
        }

        logger.debug(
            `Received payload: clusterID=${payload.clusterID}, address=${payload.address}, groupID=${payload.groupID}, ` +
                `endpoint=${payload.endpoint}, destinationEndpoint=${payload.destinationEndpoint}, wasBroadcast=${payload.wasBroadcast}, ` +
                `linkQuality=${payload.linkquality}, frame=${frame?.toString()}`,
            NS,
        );

        device.updateLastSeen();

        //no implicit checkin for genPollCtrl data because it might interfere with the explicit checkin
        if (!frame?.isCluster('genPollCtrl')) {
            device.implicitCheckin();
        }

        device.linkquality = payload.linkquality;
        let endpoint = device.getEndpoint(payload.endpoint);

        if (!endpoint) {
            logger.debug(
                `Data is from unknown endpoint '${payload.endpoint}' from device with network address '${payload.address}', creating it...`,
                NS,
            );

            endpoint = device.createEndpoint(payload.endpoint);
        }

        // Parse command for event
        let type: Events.MessagePayload['type'] | undefined;
        let data: Events.MessagePayload['data'] = {};
        let clusterName: Events.MessagePayload['cluster'];
        const meta: {
            zclTransactionSequenceNumber?: number;
            manufacturerCode?: number;
            frameControl?: FrameControl;
        } = {};

        if (frame) {
            const command = frame.command;
            clusterName = frame.cluster.name;
            meta.zclTransactionSequenceNumber = frame.header.transactionSequenceNumber;
            meta.manufacturerCode = frame.header.manufacturerCode;
            meta.frameControl = frame.header.frameControl;

            if (frame.header.isGlobal) {
                switch (frame.command.name) {
                    case 'report': {
                        type = 'attributeReport';
                        data = ZclFrameConverter.attributeKeyValue(frame, device.manufacturerID, device.customClusters);
                        break;
                    }

                    case 'read': {
                        type = 'read';
                        data = ZclFrameConverter.attributeList(frame, device.manufacturerID, device.customClusters);
                        break;
                    }

                    case 'write': {
                        type = 'write';
                        data = ZclFrameConverter.attributeKeyValue(frame, device.manufacturerID, device.customClusters);
                        break;
                    }

                    case 'readRsp': {
                        type = 'readResponse';
                        data = ZclFrameConverter.attributeKeyValue(frame, device.manufacturerID, device.customClusters);
                        break;
                    }
                }
            } else {
                /* istanbul ignore else */
                if (frame.header.isSpecific) {
                    type = `command${command.name.charAt(0).toUpperCase()}${command.name.slice(1)}`;
                    data = frame.payload;
                }
            }

            if (type === 'readResponse' || type === 'attributeReport') {
                // Some device report, e.g. it's modelID through a readResponse or attributeReport
                for (const key in data) {
                    const property = Device.ReportablePropertiesMapping[key];

                    if (property && !device[property.key]) {
                        // XXX: data technically can be `KeyValue | (string | number)[]`
                        property.set((data as KeyValue)[key], device);
                    }
                }

                endpoint.saveClusterAttributeKeyValue(frame.cluster.ID, data);
            }
        } else {
            type = 'raw';
            data = payload.data;
            const name = Zcl.Utils.getCluster(payload.clusterID, device.manufacturerID, device.customClusters).name;
            clusterName = Number.isNaN(Number(name)) ? name : Number(name);
        }

        if (type && data) {
            const linkquality = payload.linkquality;
            const groupID = payload.groupID;

            this.selfAndDeviceEmit(device, 'message', {
                type,
                device,
                endpoint,
                data,
                linkquality,
                groupID,
                cluster: clusterName,
                meta,
            });
            this.selfAndDeviceEmit(device, 'lastSeenChanged', {device, reason: 'messageEmitted'});
        } else {
            this.selfAndDeviceEmit(device, 'lastSeenChanged', {device, reason: 'messageNonEmitted'});
        }

        if (frame) {
            await device.onZclData(payload, frame, endpoint);
        }
    }

    private onSourceRoute(data: Events.SrcRouteIndPayload): void {
        this.emit('sourceRoute', data);
    }
}

export default Controller;

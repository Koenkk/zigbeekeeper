import assert from 'node:assert';
import events from 'node:events';
import {accessSync, readFileSync} from 'node:fs';

import * as Models from '../models';
import {BackupUtils} from '../utils';
import {BroadcastAddress} from '../zspec/enums';
import * as Zcl from '../zspec/zcl';
import * as Zdo from '../zspec/zdo';
import * as ZdoTypes from '../zspec/zdo/definition/tstypes';
import {discoverAdapter} from './adapterDiscovery';
import * as AdapterEvents from './events';
import {AdapterOptions, CoordinatorVersion, NetworkOptions, NetworkParameters, SerialPortOptions, StartResult} from './tstype';

interface AdapterEventMap {
    deviceJoined: [payload: AdapterEvents.DeviceJoinedPayload];
    zclPayload: [payload: AdapterEvents.ZclPayload];
    zdoResponse: [clusterId: Zdo.ClusterId, response: ZdoTypes.GenericZdoResponse];
    disconnected: [];
    deviceLeave: [payload: AdapterEvents.DeviceLeavePayload];
}

type AdapterConstructor = new (
    networkOptions: NetworkOptions,
    serialPortOptions: SerialPortOptions,
    backupPath: string,
    adapterOptions: AdapterOptions,
) => Adapter;

export abstract class Adapter extends events.EventEmitter<AdapterEventMap> {
    public hasZdoMessageOverhead: boolean;
    public manufacturerID: Zcl.ManufacturerCode;
    protected networkOptions: NetworkOptions;
    protected adapterOptions: AdapterOptions;
    protected serialPortOptions: SerialPortOptions;
    protected backupPath: string;

    protected constructor(networkOptions: NetworkOptions, serialPortOptions: SerialPortOptions, backupPath: string, adapterOptions: AdapterOptions) {
        super();
        this.hasZdoMessageOverhead = true;
        this.manufacturerID = Zcl.ManufacturerCode.RESERVED_10;
        this.networkOptions = networkOptions;
        this.adapterOptions = adapterOptions;
        this.serialPortOptions = serialPortOptions;
        this.backupPath = backupPath;
    }

    /**
     * Utility
     */

    public static async create(
        networkOptions: NetworkOptions,
        serialPortOptions: SerialPortOptions,
        backupPath: string,
        adapterOptions: AdapterOptions,
    ): Promise<Adapter> {
        const adapterLookup = {
            deconz: ['./deconz/adapter/deconzAdapter', 'DeconzAdapter'],
            ember: ['./ember/adapter/emberAdapter', 'EmberAdapter'],
            ezsp: ['./ezsp/adapter/ezspAdapter', 'EZSPAdapter'],
            zstack: ['./z-stack/adapter/zStackAdapter', 'ZStackAdapter'],
            zboss: ['./zboss/adapter/zbossAdapter', 'ZBOSSAdapter'],
            zigate: ['./zigate/adapter/zigateAdapter', 'ZiGateAdapter'],
        };
        const [adapter, path] = await discoverAdapter(serialPortOptions.adapter, serialPortOptions.path);
        const detectedAdapter = adapterLookup[adapter];

        if (detectedAdapter) {
            serialPortOptions.adapter = adapter;
            serialPortOptions.path = path;

            const adapterModule = await import(detectedAdapter[0]);
            const AdapterCtor = adapterModule[detectedAdapter[1]] as AdapterConstructor;

            return new AdapterCtor(networkOptions, serialPortOptions, backupPath, adapterOptions);
        } else {
            throw new Error(`Adapter '${adapter}' does not exists, possible options: ${Object.keys(adapterLookup).join(', ')}`);
        }
    }

    /**
     * Get the strategy to use during start.
     * - resumed: network in configuration.yaml matches network in adapter, resume operation
     * - reset: network in configuration.yaml does not match network in adapter, no valid backup, form a new network
     * - restored: network in configuration.yaml does not match network in adapter, valid backup, restore from backup
     */
    public async initNetwork(): Promise<StartResult> {
        const enum InitAction {
            DONE,
            /** Config mismatch, must leave network. */
            LEAVE,
            /** Config mismatched, left network. Will evaluate forming from backup or config next. */
            LEFT,
            /** Form the network using config. No backup, or backup mismatch. */
            FORM_CONFIG,
            /** Re-form the network using full backed-up data. */
            FORM_BACKUP,
        }

        const [hasNetwork, panID, extendedPanID] = await this.initHasNetwork();
        const extendedPanIDBuffer = Buffer.from(this.networkOptions.extendedPanID);
        const configNetworkKeyBuffer = Buffer.from(this.networkOptions.networkKey!);
        let action: InitAction = InitAction.DONE;

        if (hasNetwork) {
            // has a network
            if (this.networkOptions.panID === panID && extendedPanIDBuffer.equals(extendedPanID)) {
                // pan matches
                if (!configNetworkKeyBuffer.equals(await this.getNetworkKey())) {
                    // network key does not match
                    action = InitAction.LEAVE;
                }
            } else {
                // pan does not match
                action = InitAction.LEAVE;
            }

            if (action === InitAction.LEAVE) {
                // mismatch, force network leave
                await this.leaveNetwork();

                action = InitAction.LEFT;
            }
        }

        const backup = this.getStoredBackup();

        if (!hasNetwork || action === InitAction.LEFT) {
            // no network
            if (backup !== undefined) {
                // valid backup
                if (
                    this.networkOptions.panID === backup.networkOptions.panId &&
                    extendedPanIDBuffer.equals(backup.networkOptions.extendedPanId) &&
                    this.networkOptions.channelList.includes(backup.logicalChannel) &&
                    configNetworkKeyBuffer.equals(backup.networkOptions.networkKey)
                ) {
                    // config matches backup
                    action = InitAction.FORM_BACKUP;
                } else {
                    // TODO: this should be changed to write config instead, and FORM_BACKUP (i.e. support loading backup from scratch)
                    // config does not match backup
                    action = InitAction.FORM_CONFIG;
                }
            } else {
                // no backup
                action = InitAction.FORM_CONFIG;
            }
        }

        //---- from here on, we assume everything is in place for whatever decision was taken above

        switch (action) {
            case InitAction.FORM_BACKUP: {
                assert(backup);

                const formResult = await this.formNetwork(backup);

                return formResult || 'restored';
            }
            case InitAction.FORM_CONFIG: {
                const formResult = await this.formNetwork();

                return formResult || 'reset';
            }
            case InitAction.DONE: {
                return 'resumed';
            }
        }
    }

    public abstract start(): Promise<StartResult>;

    public abstract stop(): Promise<void>;

    /**
     * Check the network status on the adapter (execute the necessary pre-steps to be able to get it).
     * WARNING: This is a one-off. Should not be called outside of `initNetwork`.
     */
    protected abstract initHasNetwork(): Promise<[true, panID: number, extendedPanID: Buffer] | [false, panID: undefined, extendedPanID: undefined]>;

    public abstract leaveNetwork(): Promise<void>;

    /**
     * If backup is defined, form network from backup, otherwise from config.
     */
    public abstract formNetwork(backup?: Models.Backup): Promise<StartResult | void>;

    public abstract getNetworkKey(): Promise<Buffer>;

    public abstract getCoordinatorIEEE(): Promise<string>;

    public abstract getCoordinatorVersion(): Promise<CoordinatorVersion>;

    public abstract reset(type: 'soft' | 'hard'): Promise<void>;

    public abstract supportsBackup(): Promise<boolean>;

    /**
     * Loads currently stored backup and returns it in internal backup model.
     */
    public getStoredBackup(): Models.Backup | undefined {
        try {
            accessSync(this.backupPath);
        } catch {
            return undefined;
        }

        try {
            const data = JSON.parse(readFileSync(this.backupPath, 'utf8')) as Models.UnifiedBackupStorage | Models.LegacyBackupStorage;

            if ('adapterType' in data) {
                const backup = BackupUtils.fromLegacyBackup(data as Models.LegacyBackupStorage);

                this.checkBackup(backup);

                return backup;
            } else if (data.metadata?.format === 'zigpy/open-coordinator-backup' && data.metadata?.version) {
                if (data.metadata?.version !== 1) {
                    throw new Error(`Unsupported open coordinator backup version (version=${data.metadata?.version})`);
                }

                const backup = BackupUtils.fromUnifiedBackup(data as Models.UnifiedBackupStorage);

                this.checkBackup(backup);

                return backup;
            }
        } catch (error) {
            throw new Error(`Coordinator backup is corrupted (${error})`);
        }

        throw new Error('Unknown backup format');
    }

    public abstract checkBackup(backup: Models.Backup): void;

    public abstract backup(ieeeAddressesInDatabase: string[]): Promise<Models.Backup>;

    public abstract getNetworkParameters(): Promise<NetworkParameters>;

    public abstract addInstallCode(ieeeAddress: string, key: Buffer): Promise<void>;

    public abstract waitFor(
        networkAddress: number | undefined,
        endpoint: number,
        frameType: Zcl.FrameType,
        direction: Zcl.Direction,
        transactionSequenceNumber: number | undefined,
        clusterID: number,
        commandIdentifier: number,
        timeout: number,
    ): {promise: Promise<AdapterEvents.ZclPayload>; cancel: () => void};

    /**
     * ZDO
     */

    public abstract sendZdo(
        ieeeAddress: string,
        networkAddress: number,
        clusterId: Zdo.ClusterId,
        payload: Buffer,
        disableResponse: true,
    ): Promise<void>;
    public abstract sendZdo<K extends keyof ZdoTypes.RequestToResponseMap>(
        ieeeAddress: string,
        networkAddress: number,
        clusterId: K,
        payload: Buffer,
        disableResponse: false,
    ): Promise<ZdoTypes.RequestToResponseMap[K]>;
    public abstract sendZdo<K extends keyof ZdoTypes.RequestToResponseMap>(
        ieeeAddress: string,
        networkAddress: number,
        clusterId: K,
        payload: Buffer,
        disableResponse: boolean,
    ): Promise<ZdoTypes.RequestToResponseMap[K] | void>;

    public abstract permitJoin(seconds: number, networkAddress?: number): Promise<void>;

    /**
     * ZCL
     */

    public abstract sendZclFrameToEndpoint(
        ieeeAddr: string,
        networkAddress: number,
        endpoint: number,
        zclFrame: Zcl.Frame,
        timeout: number,
        disableResponse: boolean,
        disableRecovery: boolean,
        sourceEndpoint?: number,
    ): Promise<AdapterEvents.ZclPayload | void>;

    public abstract sendZclFrameToGroup(groupID: number, zclFrame: Zcl.Frame, sourceEndpoint?: number): Promise<void>;

    public abstract sendZclFrameToAll(endpoint: number, zclFrame: Zcl.Frame, sourceEndpoint: number, destination: BroadcastAddress): Promise<void>;

    /**
     * InterPAN
     */

    public abstract setChannelInterPAN(channel: number): Promise<void>;

    public abstract sendZclFrameInterPANToIeeeAddr(zclFrame: Zcl.Frame, ieeeAddress: string): Promise<void>;

    public abstract sendZclFrameInterPANBroadcast(zclFrame: Zcl.Frame, timeout: number): Promise<AdapterEvents.ZclPayload>;

    public abstract restoreChannelInterPAN(): Promise<void>;
}

export default Adapter;

import * as crypto from 'node:crypto';

import {TsType} from '../../';
import * as Models from '../../../models';
import {wait} from '../../../utils';
import {logger} from '../../../utils/logger';
import * as ZSpec from '../../../zspec';
import * as Zdo from '../../../zspec/zdo';
import {StartResult} from '../../tstype';
import * as ZnpConstants from '../constants';
import {DevStates, NvItemsIds, ZnpCommandStatus} from '../constants/common';
import {StartupOptions} from '../models/startup-options';
import * as Structs from '../structs';
import {Subsystem} from '../unpi/constants';
import * as UnpiConstants from '../unpi/constants';
import * as Utils from '../utils';
import {Znp} from '../znp';
import {AdapterBackup} from './adapter-backup';
import {AdapterNvMemory} from './adapter-nv-memory';
import {Endpoints} from './endpoints';
import {ZnpVersion} from './tstype';
import {ZStackAdapter} from './zStackAdapter';

const NS = 'zh:adapter:zstack:manager';

/**
 * ZNP Adapter Manager is responsible for handling adapter startup, network commissioning,
 * configuration backup and restore.
 */
export class ZnpAdapterManager {
    public nv: AdapterNvMemory;
    public backup: AdapterBackup;

    private znp: Znp;
    private adapter: ZStackAdapter;
    private options: StartupOptions;
    private nwkOptions!: Models.NetworkOptions;

    public constructor(adapter: ZStackAdapter, znp: Znp, options: StartupOptions) {
        this.znp = znp;
        this.adapter = adapter;
        this.options = options;
        this.nv = new AdapterNvMemory(this.znp);
        this.backup = new AdapterBackup(this.znp, this.nv, this.options.backupPath);
    }

    public async initHasNetwork(): Promise<[true, panID: number, extendedPanID: Buffer] | [false, panID: undefined, extendedPanID: undefined]> {
        logger.debug(`beginning znp startup`, NS);
        this.nwkOptions = await this.parseConfigNetworkOptions(this.options.networkOptions);
        await this.nv.init();

        /* acquire data from adapter */
        const hasConfiguredNvId =
            this.options.version === ZnpVersion.zStack12 ? NvItemsIds.ZNP_HAS_CONFIGURED_ZSTACK1 : NvItemsIds.ZNP_HAS_CONFIGURED_ZSTACK3;
        const hasConfigured = await this.nv.readItem(hasConfiguredNvId, 0, Structs.hasConfigured);

        if (hasConfigured && hasConfigured.isConfigured()) {
            const nib = await this.nv.readItem(NvItemsIds.NIB, 0, Structs.nib);

            if (nib) {
                return [true, nib.nwkPanId, nib.extendedPANID];
            }
        }

        return [false, undefined, undefined];
    }

    public async resume(): Promise<void> {
        await this.beginStartup();
    }

    public async restore(backup: Models.Backup): Promise<void> {
        if (this.options.version === ZnpVersion.zStack12) {
            logger.debug(`performing recommissioning instead of restore for z-stack 1.2`, NS);
            await this.leaveNetwork();
            await this.beginCommissioning(this.nwkOptions);
            await this.beginStartup();
        } else {
            await this.beginRestore(backup);
        }
    }

    public async reset(): Promise<StartResult | void> {
        if (this.options.version === ZnpVersion.zStack12) {
            const hasConfigured = await this.nv.readItem(NvItemsIds.ZNP_HAS_CONFIGURED_ZSTACK1, 0, Structs.hasConfigured);
            await this.leaveNetwork();
            await this.beginCommissioning(this.nwkOptions);
            await this.beginStartup();

            // XXX: forces to return `StartResult | void` from `adapter.formNetwork` (used for zstack only)
            return hasConfigured && hasConfigured.isConfigured() ? 'reset' : 'restored';
        } else {
            await this.beginCommissioning(this.nwkOptions);
        }
    }

    public async getNetworkKey(): Promise<Buffer> {
        const preconfiguredKey =
            this.options.version === ZnpVersion.zStack12
                ? Structs.nwkKey(
                      (await this.znp.requestWithReply(Subsystem.SAPI, 'readConfiguration', {configid: NvItemsIds.PRECFGKEY})).payload.value,
                  )
                : await this.nv.readItem(NvItemsIds.PRECFGKEY, 0, Structs.nwkKey);

        return Buffer.from(preconfiguredKey.key);
    }

    public async leaveNetwork(): Promise<void> {
        /* clear and reset the adapter */
        await this.nv.deleteItem(NvItemsIds.NIB);
        await this.clearAdapter();
    }

    /**
     * Internal method to perform regular adapter startup in coordinator mode.
     */
    private async beginStartup(): Promise<void> {
        const deviceInfo = await this.znp.requestWithReply(Subsystem.UTIL, 'getDeviceInfo', {});
        if (deviceInfo.payload.devicestate !== DevStates.ZB_COORD) {
            logger.debug('starting adapter as coordinator', NS);
            const started = this.znp.waitFor(UnpiConstants.Type.AREQ, Subsystem.ZDO, 'stateChangeInd', undefined, undefined, 9, 60000);
            await this.znp.request(Subsystem.ZDO, 'startupFromApp', {startdelay: 100}, undefined, undefined, [
                ZnpCommandStatus.SUCCESS,
                ZnpCommandStatus.FAILURE,
            ]);
            await started.start().promise;
            logger.debug('adapter successfully started in coordinator mode', NS);
        } else {
            logger.debug('adapter is already running in coordinator mode', NS);
        }
    }

    /**
     * Internal method to perform adapter restore.
     */
    private async beginRestore(backup: Models.Backup): Promise<void> {
        /* generate random provisioning network parameters */
        const provisioningNwkOptions: Models.NetworkOptions = {
            panId: 1 + Math.round(Math.random() * 65532),
            extendedPanId: crypto.randomBytes(8),
            channelList: [11 + Math.round(Math.random() * (26 - 11))],
            networkKey: crypto.randomBytes(16),
            networkKeyDistribute: false,
        };

        await this.leaveNetwork();

        /* commission provisioning network */
        logger.debug('commissioning random provisioning network:', NS);
        logger.debug(` - panId: ${provisioningNwkOptions.panId}`, NS);
        logger.debug(` - extendedPanId: ${provisioningNwkOptions.extendedPanId.toString('hex')}`, NS);
        logger.debug(` - channelList: ${provisioningNwkOptions.channelList.join(', ')}`, NS);
        logger.debug(` - networkKey: ${provisioningNwkOptions.networkKey.toString('hex')}`, NS);
        logger.debug(` - networkKeyDistribute: ${provisioningNwkOptions.networkKeyDistribute}`, NS);
        await this.beginCommissioning(provisioningNwkOptions, false, false);

        /* perform NV restore */
        await this.backup.restoreBackup(backup);

        /* update commissioning NV items with desired nwk configuration */
        await this.updateCommissioningNvItems(this.nwkOptions);

        /* settle & reset adapter */
        logger.debug('giving adapter some time to settle', NS);
        await wait(1000);
        await this.resetAdapter();

        /* startup with restored adapter */
        await this.beginStartup();

        /* write configuration flag */
        await this.writeConfigurationFlag();
    }

    /**
     * Internal method to perform new network commissioning. Network commissioning creates a new ZigBee
     * network using the adapter.
     *
     * @param nwkOptions Options to configure the new network with.
     * @param failOnCollision Whether process should throw an error if PAN ID collision is detected.
     * @param writeConfiguredFlag Whether zigbee-herdsman `hasConfigured` flag should be written to NV.
     */
    private async beginCommissioning(nwkOptions: Models.NetworkOptions, failOnCollision = true, writeConfiguredFlag = true): Promise<void> {
        if (nwkOptions.panId === 65535) {
            throw new Error(`network commissioning failed - cannot use pan id 65535`);
        }

        /* commission the network as per parameters */
        await this.updateCommissioningNvItems(nwkOptions);
        logger.debug('beginning network commissioning', NS);
        if ([ZnpVersion.zStack30x, ZnpVersion.zStack3x0].includes(this.options.version)) {
            /* configure channel */
            await this.znp.request(Subsystem.APP_CNF, 'bdbSetChannel', {isPrimary: 0x1, channel: Utils.packChannelList(nwkOptions.channelList)});
            await this.znp.request(Subsystem.APP_CNF, 'bdbSetChannel', {isPrimary: 0x0, channel: 0x0});

            /* perform bdb commissioning */
            const started = this.znp.waitFor(UnpiConstants.Type.AREQ, Subsystem.ZDO, 'stateChangeInd', undefined, undefined, 9, 60000);
            await this.znp.request(Subsystem.APP_CNF, 'bdbStartCommissioning', {mode: 0x04});
            try {
                await started.start().promise;
            } catch (error) {
                throw new Error(
                    `network commissioning timed out - most likely network with the same panId or extendedPanId already exists nearby (${(error as Error).stack})`,
                );
            }
        } else {
            /* Z-Stack 1.2 requires startup to be performed instead of BDB commissioning */
            await this.beginStartup();
        }

        /* wait for NIB to settle (takes different amount of time of different platforms */
        logger.debug('waiting for NIB to settle', NS);
        let reads = 0;
        let nib: ReturnType<typeof Structs.nib>;
        do {
            await wait(3000);
            nib = await this.nv.readItem(NvItemsIds.NIB, 0, Structs.nib);
            reads++;
        } while ((!nib || nib.nwkPanId === 65535 || nib.nwkLogicalChannel === 0) && reads < 10);
        if (!nib || nib.nwkPanId === 65535 || nib.nwkLogicalChannel === 0) {
            throw new Error(`network commissioning failed - timed out waiting for nib to settle`);
        }

        /* validate provisioned PAN ID */
        const extNwkInfo = await this.znp.requestWithReply(Subsystem.ZDO, 'extNwkInfo', {});
        if (extNwkInfo.payload.panid !== nwkOptions.panId && failOnCollision) {
            throw new Error(
                `network commissioning failed - panId collision detected (expected=${nwkOptions.panId}, actual=${extNwkInfo.payload.panid})`,
            );
        }

        logger.debug('network commissioned', NS);

        /* write configuration flag */
        if (writeConfiguredFlag) {
            await this.writeConfigurationFlag();
        }
    }

    /**
     * Updates commissioning NV memory parameters in connected controller. This method should be invoked
     * to configure network commissioning parameters or update the controller after restore.
     *
     * @param options Network options to set in NV memory.
     */
    private async updateCommissioningNvItems(options: Models.NetworkOptions): Promise<void> {
        const nwkPanId = Structs.nwkPanId();
        nwkPanId.panId = options.panId;
        const channelList = Structs.channelList();
        channelList.channelList = Utils.packChannelList(options.channelList);
        const extendedPanIdReversed = Buffer.from(options.extendedPanId).reverse();

        logger.debug(`setting network commissioning parameters`, NS);

        await this.nv.updateItem(NvItemsIds.STARTUP_OPTION, Buffer.from([0x00]));
        await this.nv.updateItem(NvItemsIds.LOGICAL_TYPE, Buffer.from([ZnpConstants.ZDO.deviceLogicalType.COORDINATOR]));
        await this.nv.updateItem(NvItemsIds.ZDO_DIRECT_CB, Buffer.from([0x01]));
        await this.nv.updateItem(NvItemsIds.CHANLIST, channelList.serialize());
        await this.nv.updateItem(NvItemsIds.PANID, nwkPanId.serialize());
        await this.nv.updateItem(NvItemsIds.EXTENDED_PAN_ID, extendedPanIdReversed);
        await this.nv.updateItem(NvItemsIds.APS_USE_EXT_PANID, extendedPanIdReversed);
        /* v8 ignore next */
        await this.nv.updateItem(NvItemsIds.PRECFGKEYS_ENABLE, Buffer.from([options.networkKeyDistribute ? 0x01 : 0x00]));

        if ([ZnpVersion.zStack30x, ZnpVersion.zStack3x0].includes(this.options.version)) {
            await this.nv.updateItem(NvItemsIds.PRECFGKEY, options.networkKey);
        } else {
            await this.znp.request(Subsystem.SAPI, 'writeConfiguration', {
                configid: NvItemsIds.PRECFGKEY,
                len: options.networkKey.length,
                value: options.networkKey,
            });
            await this.nv.writeItem(
                NvItemsIds.LEGACY_TCLK_TABLE_START_12,
                Buffer.from([
                    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x5a, 0x69, 0x67, 0x42, 0x65, 0x65, 0x41, 0x6c, 0x6c, 0x69, 0x61, 0x6e, 0x63,
                    0x65, 0x30, 0x39, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                ]),
            );
        }
    }

    /**
     * Registers endpoints before beginning normal operation.
     */
    public async registerEndpoints(): Promise<void> {
        const clusterId = Zdo.ClusterId.ACTIVE_ENDPOINTS_REQUEST;
        const zdoPayload = Zdo.Buffalo.buildRequest(this.adapter.hasZdoMessageOverhead, clusterId, ZSpec.COORDINATOR_ADDRESS);
        const response = await this.adapter.sendZdo(ZSpec.BLANK_EUI64, ZSpec.COORDINATOR_ADDRESS, clusterId, zdoPayload, false);

        if (Zdo.Buffalo.checkStatus(response)) {
            const activeEndpoints = response[1].endpointList;

            for (const endpoint of Endpoints) {
                if (activeEndpoints.includes(endpoint.endpoint)) {
                    logger.debug(`endpoint '${endpoint.endpoint}' already registered`, NS);
                } else {
                    logger.debug(`registering endpoint '${endpoint.endpoint}'`, NS);
                    await this.znp.request(Subsystem.AF, 'register', endpoint);
                }
            }
        } else {
            throw new Zdo.StatusError(response[0]);
        }
    }

    /**
     * Adds endpoint to group.
     *
     * @param endpoint Endpoint index to add.
     * @param group Target group index.
     */
    public async addToGroup(endpoint: number, group: number): Promise<void> {
        const result = await this.znp.requestWithReply(5, 'extFindGroup', {endpoint, groupid: group}, undefined, undefined, [
            ZnpCommandStatus.SUCCESS,
            ZnpCommandStatus.FAILURE,
        ]);

        if (result.payload.status === ZnpCommandStatus.FAILURE) {
            await this.znp.request(5, 'extAddGroup', {endpoint, groupid: group, namelen: 0, groupname: []});
        }
    }

    /**
     * Internal method to reset the adapter.
     */
    private async resetAdapter(): Promise<void> {
        logger.debug('adapter reset requested', NS);
        await this.znp.request(Subsystem.SYS, 'resetReq', {type: ZnpConstants.SYS.resetType.SOFT});
        logger.debug('adapter reset successful', NS);
    }

    /**
     * Internal method to reset adapter config and data.
     */
    private async clearAdapter(): Promise<void> {
        logger.debug('clearing adapter using startup option 3', NS);
        await this.nv.writeItem(NvItemsIds.STARTUP_OPTION, Buffer.from([0x03]));
        await this.resetAdapter();
        await this.nv.writeItem(NvItemsIds.STARTUP_OPTION, Buffer.from([0x00]));
    }

    /**
     * Transforms Z2M number-based network options to local Buffer-based options.
     *
     * This function also takes care of `dd:dd:dd:dd:dd:dd:dd:dd` extended PAN ID
     * and replaces it with adapter IEEE address.
     *
     * @param options Source Z2M network options.
     */
    private async parseConfigNetworkOptions(options: TsType.NetworkOptions): Promise<Models.NetworkOptions> {
        const channelList = options.channelList;
        channelList.sort((c1, c2) => (c1 < c2 ? -1 : c1 > c2 ? 1 : 0));

        const parsed: Models.NetworkOptions = {
            channelList: channelList,
            panId: options.panID,
            extendedPanId: Buffer.from(options.extendedPanID!),
            networkKey: Buffer.from(options.networkKey!),
            networkKeyDistribute: Boolean(options.networkKeyDistribute),
        };
        if (parsed.extendedPanId.equals(Buffer.alloc(8, 0xdd))) {
            const adapterIeeeAddressResponse = await this.znp.requestWithReply(Subsystem.SYS, 'getExtAddr', {});
            parsed.extendedPanId = Buffer.from(adapterIeeeAddressResponse.payload.extaddress.split('0x')[1], 'hex');
            parsed.hasDefaultExtendedPanId = true;
        }
        return parsed;
    }

    /**
     * Writes ZNP `hasConfigured` flag to NV memory. This flag indicates the adapter has been configured.
     */
    private async writeConfigurationFlag(): Promise<void> {
        logger.debug('writing configuration flag to adapter NV memory', NS);
        await this.nv.writeItem(
            this.options.version === ZnpVersion.zStack12 ? NvItemsIds.ZNP_HAS_CONFIGURED_ZSTACK1 : NvItemsIds.ZNP_HAS_CONFIGURED_ZSTACK3,
            Buffer.from([0x55]),
        );
    }
}

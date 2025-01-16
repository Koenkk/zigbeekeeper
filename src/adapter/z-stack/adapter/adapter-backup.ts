import assert from 'node:assert';

import * as Models from '../../../models';
import {logger} from '../../../utils/logger';
import {NULL_NODE_ID, Utils as ZSpecUtils} from '../../../zspec';
import {NvItemsIds, NvSystemIds} from '../constants/common';
import * as Structs from '../structs';
import {AddressManagerUser, SecurityManagerAuthenticationOption} from '../structs';
import {Subsystem} from '../unpi/constants';
import * as Utils from '../utils';
import {Znp} from '../znp';
import {AdapterNvMemory} from './adapter-nv-memory';
import {ZnpVersion} from './tstype';

const NS = 'zh:zstack:backup';

/**
 * Class providing ZNP adapter backup and restore procedures based mostly on NV memory manipulation.
 */
export class AdapterBackup {
    private znp: Znp;
    private nv: AdapterNvMemory;
    private defaultPath: string;

    public constructor(znp: Znp, nv: AdapterNvMemory, path: string) {
        this.znp = znp;
        this.nv = nv;
        this.defaultPath = path;
    }

    /**
     * Creates a new backup from connected ZNP adapter and returns it in internal backup model format.
     */
    public async createBackup(ieeeAddressesInDatabase: string[], getExistingBackup: () => Models.Backup | undefined): Promise<Models.Backup> {
        logger.debug('creating backup', NS);
        const version: ZnpVersion = await this.getAdapterVersion();

        /* get adapter ieee address */
        const ieeeAddressResponse = await this.znp.requestWithReply(Subsystem.SYS, 'getExtAddr', {});
        if (!ieeeAddressResponse.payload.extaddress || !ieeeAddressResponse.payload.extaddress.startsWith('0x')) {
            throw new Error('Failed to read adapter IEEE address');
        }
        const ieeeAddress = Buffer.from(ieeeAddressResponse.payload.extaddress.split('0x')[1], 'hex');
        logger.debug('fetched adapter ieee address', NS);

        /* get adapter nib */
        const nib = await this.nv.readItem(NvItemsIds.NIB, 0, Structs.nib);
        if (!nib) {
            throw new Error('Cannot backup - adapter not commissioned');
        }
        logger.debug('fetched adapter nib', NS);

        /* get adapter active key information */
        let activeKeyInfo;
        if (version === ZnpVersion.zStack12) {
            const key = Structs.nwkKey(
                (await this.znp.requestWithReply(Subsystem.SAPI, 'readConfiguration', {configid: NvItemsIds.PRECFGKEY})).payload.value,
            );
            activeKeyInfo = Structs.nwkKeyDescriptor();
            activeKeyInfo.key = key.key;
        } else {
            activeKeyInfo = await this.nv.readItem(NvItemsIds.NWK_ACTIVE_KEY_INFO, 0, Structs.nwkKeyDescriptor);
        }

        if (!activeKeyInfo) {
            throw new Error('Cannot backup - missing active key info');
        }
        logger.debug('fetched adapter active key information', NS);

        /* get adapter security data */
        const preconfiguredKeyEnabled = await this.nv.readItem(NvItemsIds.PRECFGKEYS_ENABLE, 0);
        logger.debug('fetched adapter pre-configured key', NS);
        const addressManagerTable = await this.getAddressManagerTable(version);
        logger.debug(
            `fetched adapter address manager table (capacity=${addressManagerTable?.capacity || 0}, used=${addressManagerTable?.usedCount || 0})`,
            NS,
        );
        const securityManagerTable = await this.getSecurityManagerTable();
        logger.debug(
            `fetched adapter security manager table (capacity=${securityManagerTable?.usedCount || 0}, used=${securityManagerTable?.usedCount || 0})`,
            NS,
        );
        const apsLinkKeyDataTable = await this.getApsLinkKeyDataTable(version);
        logger.debug(
            `fetched adapter aps link key data table (capacity=${apsLinkKeyDataTable?.usedCount || 0}, used=${apsLinkKeyDataTable?.usedCount || 0})`,
            NS,
        );
        const tclkSeed = version === ZnpVersion.zStack12 ? null : await this.nv.readItem(NvItemsIds.TCLK_SEED, 0, Structs.nwkKey);
        logger.debug('fetched adapter tclk seed', NS);
        const tclkTable = await this.getTclkTable(version);
        logger.debug(`fetched adapter tclk table (capacity=${tclkTable?.usedCount || 0}, used=${tclkTable?.usedCount || 0})`, NS);
        const secMaterialTable = await this.getNetworkSecurityMaterialTable(version);
        logger.debug(
            `fetched adapter network security material table (capacity=${secMaterialTable?.usedCount || 0}, used=${secMaterialTable?.usedCount || 0})`,
            NS,
        );

        /* examine network security material table */
        const genericExtendedPanId = Buffer.alloc(8, 0xff);
        let secMaterialDescriptor: ReturnType<typeof Structs.nwkSecMaterialDescriptorEntry> | undefined;
        for (const entry of secMaterialTable.used) {
            if (entry.extendedPanID.equals(nib.extendedPANID)) {
                secMaterialDescriptor = entry;
                break;
            } else if (!secMaterialDescriptor && entry.extendedPanID.equals(genericExtendedPanId)) {
                secMaterialDescriptor = entry;
            }
        }

        if (!secMaterialDescriptor) {
            secMaterialDescriptor = Structs.nwkSecMaterialDescriptorEntry();
            secMaterialDescriptor.extendedPanID = nib.extendedPANID;
            secMaterialDescriptor.FrameCounter = version === ZnpVersion.zStack12 ? 0 : 1250;
        }

        /* return backup structure */
        const backup: Models.Backup = {
            znp: {
                version: version,
                trustCenterLinkKeySeed: tclkSeed?.key || undefined,
            },
            networkOptions: {
                panId: nib.nwkPanId,
                extendedPanId: nib.extendedPANID,
                channelList: Utils.unpackChannelList(nib.channelList),
                networkKey: activeKeyInfo.key,
                networkKeyDistribute: preconfiguredKeyEnabled && preconfiguredKeyEnabled[0] === 0x01,
            },
            logicalChannel: nib.nwkLogicalChannel,
            networkKeyInfo: {
                sequenceNumber: activeKeyInfo.keySeqNum,
                frameCounter: secMaterialDescriptor.FrameCounter,
            },
            securityLevel: nib.SecurityLevel,
            networkUpdateId: nib.nwkUpdateId,
            coordinatorIeeeAddress: ieeeAddress,
            devices:
                (addressManagerTable &&
                    addressManagerTable.used
                        .map((ame, ami) => {
                            /* take all entries of assoc and/or security type */
                            /* v8 ignore start */
                            if (!ame.isSet() || (ame.user & (AddressManagerUser.Assoc | AddressManagerUser.Security)) === 0) {
                                return null;
                            }
                            /* v8 ignore stop */
                            let linkKeyInfo: {key: Buffer; rxCounter: number; txCounter: number} | undefined;
                            const sme = securityManagerTable.used.find((e) => e.ami === ami);
                            if (sme) {
                                const apsKeyDataIndex =
                                    version === ZnpVersion.zStack30x ? sme.keyNvId - NvItemsIds.APS_LINK_KEY_DATA_START : sme.keyNvId;
                                /* v8 ignore next */
                                const apsKeyData = apsLinkKeyDataTable.used[apsKeyDataIndex] || null;
                                if (apsKeyData) {
                                    linkKeyInfo = {
                                        key: apsKeyData.key,
                                        rxCounter: apsKeyData.rxFrmCntr,
                                        txCounter: apsKeyData.txFrmCntr,
                                    };
                                }
                            } else {
                                const tclkTableEntry = tclkTable.used.find((e) => e.extAddr.equals(ame.extAddr));
                                if (tclkTableEntry) {
                                    assert(tclkSeed, 'Cannot be undefined because this is only called for ZStack 3');
                                    const rotatedSeed = Buffer.concat([
                                        tclkSeed.key.subarray(tclkTableEntry.SeedShift_IcIndex),
                                        tclkSeed.key.subarray(0, tclkTableEntry.SeedShift_IcIndex),
                                    ]);
                                    const extAddrReversed = Buffer.from(ame.extAddr).reverse();
                                    const extAddrRepeated = Buffer.concat([extAddrReversed, extAddrReversed]);
                                    const derivedKey = Buffer.alloc(16);
                                    for (let i = 0; i < 16; i++) {
                                        derivedKey[i] = rotatedSeed[i] ^ extAddrRepeated[i];
                                    }
                                    linkKeyInfo = {
                                        key: derivedKey,
                                        rxCounter: tclkTableEntry.rxFrmCntr,
                                        txCounter: tclkTableEntry.txFrmCntr,
                                    };
                                }
                            }
                            return {
                                networkAddress: ame.nwkAddr,
                                ieeeAddress: ame.extAddr,
                                isDirectChild: (ame.user & AddressManagerUser.Assoc) > 0,
                                linkKey: !linkKeyInfo ? undefined : linkKeyInfo,
                            };
                        })
                        .filter((e) => e != null)) ||
                [],
        };

        try {
            /**
             * Due to a bug in ZStack, some devices go missing from the backed-up device tables which makes them disappear from the backup.
             * This causes the devices not to be restored when e.g. re-flashing the adapter.
             * If you then try to join a new device via a Zigbee 3.0 router that went missing (those with a linkkey), joining fails as the coordinator
             * does not have the linkKey anymore.
             * Below we don't remove any devices from the backup which have a linkkey and are still in the database (=ieeeAddressesInDatabase)
             */
            const oldBackup = getExistingBackup();
            assert(oldBackup, "Old backup doesn't exist");
            const missing = oldBackup.devices.filter(
                (d) =>
                    d.linkKey &&
                    ieeeAddressesInDatabase.includes(ZSpecUtils.eui64BEBufferToHex(d.ieeeAddress)) &&
                    !backup.devices.find((dd) => d.ieeeAddress.equals(dd.ieeeAddress)),
            );
            const missingStr = missing.map((d) => ZSpecUtils.eui64BEBufferToHex(d.ieeeAddress)).join(', ');
            logger.debug(
                `Following devices with link key are missing from new backup but present in old backup and database, ` +
                    `adding them back: ${missingStr}`,
                NS,
            );
            backup.devices = [...backup.devices, ...missing];
        } catch (error) {
            logger.debug(`Failed to read old backup, not checking for missing routers: ${error}`, NS);
        }

        return backup;
    }

    /**
     * Restores a structure in internal backup format to connected ZNP adapter.
     *
     * @param backup Backup to restore to connected adapter.
     */
    public async restoreBackup(backup: Models.Backup): Promise<void> {
        logger.debug('restoring backup', NS);
        const version: ZnpVersion = await this.getAdapterVersion();
        /* v8 ignore start */
        if (version === ZnpVersion.zStack12) {
            throw new Error('backup cannot be restored on Z-Stack 1.2 adapter');
        }
        /* v8 ignore stop */

        /* fetch provisional NIB */
        const nib = await this.nv.readItem(NvItemsIds.NIB, 0, Structs.nib);

        /* update NIB with desired nwk config */
        nib.nwkPanId = backup.networkOptions.panId;
        nib.channelList = Utils.packChannelList(backup.networkOptions.channelList);
        nib.nwkLogicalChannel = backup.networkOptions.channelList[0];
        nib.extendedPANID = backup.networkOptions.extendedPanId;
        nib.SecurityLevel = backup.securityLevel;
        nib.nwkUpdateId = backup.networkUpdateId;

        /* prepare key info */
        const keyDescriptor = Structs.nwkKeyDescriptor();
        keyDescriptor.keySeqNum = backup.networkKeyInfo.sequenceNumber || 0;
        keyDescriptor.key = backup.networkOptions.networkKey;

        /* determine table sizes */
        const currentAddressManagerTable = await this.getAddressManagerTable(version);
        const currentSecurityManagerTable = await this.getSecurityManagerTable();
        const currentApsLinkKeyDataTable = await this.getApsLinkKeyDataTable(version);
        const currentTclkTable = await this.getTclkTable(version);
        const currentNwkSecMaterialTable = await this.getNetworkSecurityMaterialTable(version);
        logger.debug(`got target adapter table sizes:`, NS);
        logger.debug(` - address manager table: ${currentAddressManagerTable.capacity}`, NS);
        logger.debug(` - security manager table: ${currentSecurityManagerTable.capacity}`, NS);
        logger.debug(` - aps link key data table: ${currentApsLinkKeyDataTable.capacity}`, NS);
        logger.debug(` - tclk table: ${currentTclkTable.capacity}`, NS);
        logger.debug(` - network security material table: ${currentNwkSecMaterialTable.capacity}`, NS);

        /* prepare table structures */
        const addressManagerTable = Structs.addressManagerTable(currentAddressManagerTable.capacity);
        const securityManagerTable = Structs.securityManagerTable(currentSecurityManagerTable.capacity);
        const apsLinkKeyDataTable = Structs.apsLinkKeyDataTable(currentApsLinkKeyDataTable.capacity);
        const tclkTable = Structs.apsTcLinkKeyTable(currentTclkTable.capacity);
        const nwkSecurityMaterialTable = Structs.nwkSecMaterialDescriptorTable(currentNwkSecMaterialTable.capacity);

        /* prepare security material table (nwk frame counters) */
        const mwkSecMaterialEntry = nwkSecurityMaterialTable.entries[0];
        mwkSecMaterialEntry.extendedPanID = backup.networkOptions.extendedPanId;
        mwkSecMaterialEntry.FrameCounter = backup.networkKeyInfo.frameCounter + 2500;
        const genericNwkSecMaterialEntry = nwkSecurityMaterialTable.entries[nwkSecurityMaterialTable.capacity - 1];
        genericNwkSecMaterialEntry.extendedPanID = Buffer.alloc(8, 0xff);
        genericNwkSecMaterialEntry.FrameCounter = backup.networkKeyInfo.frameCounter + 2500;

        /* populate device & security tables and write them */
        for (const device of backup.devices) {
            const ame = addressManagerTable.getNextFree();
            ame.nwkAddr = device.networkAddress != null ? device.networkAddress : NULL_NODE_ID;
            ame.extAddr = device.ieeeAddress;
            ame.user = device.isDirectChild ? AddressManagerUser.Assoc : AddressManagerUser.Default;
            if (device.linkKey) {
                let linkKeyProcessed = false;
                /* attempt to recover tclk seed parameters (if available) */
                if (backup.znp?.trustCenterLinkKeySeed) {
                    const tclkSeed = backup.znp.trustCenterLinkKeySeed;
                    const extAddrReversed = Buffer.from(ame.extAddr).reverse();
                    const extAddrRepeated = Buffer.concat([extAddrReversed, extAddrReversed]);
                    const recoveredKey = Buffer.alloc(16);
                    for (let i = 0; i < 16; i++) {
                        recoveredKey[i] = device.linkKey.key[i] ^ extAddrRepeated[i];
                    }

                    let recoveredSeedShift: number | null = null;
                    for (let i = 0; i < 16; i++) {
                        const rotated = Buffer.concat([
                            recoveredKey.slice(recoveredKey.length - i, recoveredKey.length),
                            recoveredKey.slice(0, recoveredKey.length - i),
                        ]);
                        if (rotated.equals(tclkSeed)) {
                            recoveredSeedShift = i;
                            break;
                        }
                    }

                    if (recoveredSeedShift !== null) {
                        ame.user |= AddressManagerUser.Security;
                        const tclkEntry = tclkTable.getNextFree();
                        if (!tclkEntry) {
                            throw new Error(`target adapter tclk table size insufficient (size=${tclkTable.capacity})`);
                        }
                        tclkEntry.extAddr = ame.extAddr;
                        tclkEntry.SeedShift_IcIndex = recoveredSeedShift;
                        tclkEntry.keyAttributes = 2;
                        tclkEntry.keyType = 0;
                        tclkEntry.rxFrmCntr = device.linkKey.rxCounter;
                        tclkEntry.txFrmCntr = device.linkKey.txCounter + 2500;
                        linkKeyProcessed = true;
                        logger.debug(
                            `successfully recovered link key for ${device.ieeeAddress.toString('hex')} using tclk seed (shift=${recoveredSeedShift})`,
                            NS,
                        );
                    }
                }

                /* attempt to create aps link key data entry */
                if (!linkKeyProcessed) {
                    ame.user |= AddressManagerUser.Security;

                    const apsKeyDataEntry = apsLinkKeyDataTable.getNextFree();
                    if (!apsKeyDataEntry) {
                        throw new Error(`target adapter aps link key data table size insufficient (size=${apsLinkKeyDataTable.capacity})`);
                    }
                    apsKeyDataEntry.key = device.linkKey.key;
                    apsKeyDataEntry.rxFrmCntr = device.linkKey.rxCounter;
                    apsKeyDataEntry.txFrmCntr = device.linkKey.txCounter + 2500;

                    const sme = securityManagerTable.getNextFree();
                    if (!sme) {
                        throw new Error(`target adapter security manager table size insufficient (size=${securityManagerTable.capacity})`);
                    }
                    const ameIndex = addressManagerTable.indexOf(ame);
                    assert(ameIndex != null);
                    sme.ami = ameIndex;

                    const apsKeyDataEntryIndex = apsLinkKeyDataTable.indexOf(apsKeyDataEntry);
                    assert(apsKeyDataEntryIndex != null);
                    sme.keyNvId = version === ZnpVersion.zStack3x0 ? apsKeyDataEntryIndex : NvItemsIds.APS_LINK_KEY_DATA_START + apsKeyDataEntryIndex;
                    sme.authenticationOption = SecurityManagerAuthenticationOption.AuthenticatedCBCK;

                    linkKeyProcessed = true;
                    logger.debug(`successfully recovered link key for ${device.ieeeAddress.toString('hex')} using aps key data table`, NS);
                }
            }
        }

        /* recover coordinator ieee address */
        const reversedAdapterIeee = Buffer.from(backup.coordinatorIeeeAddress).reverse();
        await this.nv.writeItem(NvItemsIds.EXTADDR, reversedAdapterIeee);

        /* write updated nib */
        await this.nv.writeItem(NvItemsIds.NIB, nib);

        /* write network key info */
        await this.nv.updateItem(NvItemsIds.NWK_ACTIVE_KEY_INFO, keyDescriptor.serialize());
        await this.nv.updateItem(NvItemsIds.NWK_ALTERN_KEY_INFO, keyDescriptor.serialize());

        /* write tclk seed if present */
        if (backup.znp?.trustCenterLinkKeySeed) {
            await this.nv.writeItem(NvItemsIds.TCLK_SEED, backup.znp.trustCenterLinkKeySeed);
        }

        /* write network security material table (nwk frame counters) */
        if (version === ZnpVersion.zStack3x0) {
            await this.nv.writeTable('extended', NvSystemIds.ZSTACK, NvItemsIds.EX_NWK_SEC_MATERIAL_TABLE, nwkSecurityMaterialTable);
        } else {
            await this.nv.writeTable('legacy', NvItemsIds.LEGACY_NWK_SEC_MATERIAL_TABLE_START, nwkSecurityMaterialTable);
        }

        /* write address manager table */
        if (version === ZnpVersion.zStack3x0) {
            await this.nv.writeTable('extended', NvSystemIds.ZSTACK, NvItemsIds.ZCD_NV_EX_ADDRMGR, addressManagerTable);
        } else {
            await this.nv.writeItem(NvItemsIds.ADDRMGR, addressManagerTable);
        }

        /* write security manager table */
        await this.nv.writeItem(NvItemsIds.APS_LINK_KEY_TABLE, securityManagerTable);

        /* write aps link key data table */
        if (version === ZnpVersion.zStack3x0) {
            await this.nv.writeTable('extended', NvSystemIds.ZSTACK, NvItemsIds.ZCD_NV_EX_APS_KEY_DATA_TABLE, apsLinkKeyDataTable);
        } else {
            await this.nv.writeTable('legacy', NvItemsIds.APS_LINK_KEY_DATA_START, apsLinkKeyDataTable);
        }

        /* write tclk table */
        if (version === ZnpVersion.zStack3x0) {
            await this.nv.writeTable('extended', NvSystemIds.ZSTACK, NvItemsIds.EX_TCLK_TABLE, tclkTable);
        } else {
            await this.nv.writeTable('legacy', NvItemsIds.LEGACY_TCLK_TABLE_START, tclkTable);
        }
    }

    /**
     * Acquires ZNP version internal to `zigbee-herdsman` from controller.
     *
     * *If Z-Stack 1.2 controller is detected an error is thrown, since Z-Stack 1.2 backup
     * and restore procedures are not supported.*
     */
    private async getAdapterVersion(): Promise<ZnpVersion> {
        const versionResponse = await this.znp.requestWithReply(Subsystem.SYS, 'version', {});
        const version: ZnpVersion = versionResponse.payload.product;
        return version;
    }

    /**
     * Internal method to retrieve address manager table.
     *
     * @param version ZNP stack version the adapter is running.
     */
    private async getAddressManagerTable(version: ZnpVersion): Promise<ReturnType<typeof Structs.addressManagerTable>> {
        if (version === ZnpVersion.zStack3x0) {
            return await this.nv.readTable('extended', NvSystemIds.ZSTACK, NvItemsIds.ZCD_NV_EX_ADDRMGR, undefined, Structs.addressManagerTable);
        } else {
            return await this.nv.readItem(NvItemsIds.ADDRMGR, 0, Structs.addressManagerTable);
        }
    }

    /**
     * Internal method to retrieve security manager table. Also referred to as APS Link Key Table.
     */
    private async getSecurityManagerTable(): Promise<ReturnType<typeof Structs.securityManagerTable>> {
        return await this.nv.readItem(NvItemsIds.APS_LINK_KEY_TABLE, 0, Structs.securityManagerTable);
    }

    /**
     * Internal method to retrieve APS Link Key Data Table containing arbitrary APS link keys.
     *
     * @param version ZNP stack version the adapter is running.
     */
    private async getApsLinkKeyDataTable(version: ZnpVersion): Promise<ReturnType<typeof Structs.apsLinkKeyDataTable>> {
        if (version === ZnpVersion.zStack3x0) {
            return await this.nv.readTable(
                'extended',
                NvSystemIds.ZSTACK,
                NvItemsIds.ZCD_NV_EX_APS_KEY_DATA_TABLE,
                undefined,
                Structs.apsLinkKeyDataTable,
            );
        } else {
            return await this.nv.readTable('legacy', NvItemsIds.APS_LINK_KEY_DATA_START, 255, Structs.apsLinkKeyDataTable);
        }
    }

    /**
     * Internal method to retrieve Trust Center Link Key table which describes seed-based APS link keys for devices.
     *
     * @param version ZNP stack version the adapter is running.
     */
    private async getTclkTable(version: ZnpVersion): Promise<ReturnType<typeof Structs.apsTcLinkKeyTable>> {
        if (version === ZnpVersion.zStack3x0) {
            return await this.nv.readTable('extended', NvSystemIds.ZSTACK, NvItemsIds.EX_TCLK_TABLE, undefined, Structs.apsTcLinkKeyTable);
        } else {
            return await this.nv.readTable('legacy', NvItemsIds.LEGACY_TCLK_TABLE_START, 239, Structs.apsTcLinkKeyTable);
        }
    }

    /**
     * Internal method to retrieve network security material table, which contains network key frame counter.
     *
     * @param version ZNP stack version the adapter is running.
     */
    private async getNetworkSecurityMaterialTable(version: ZnpVersion): Promise<ReturnType<typeof Structs.nwkSecMaterialDescriptorTable>> {
        if (version === ZnpVersion.zStack3x0) {
            return await this.nv.readTable(
                'extended',
                NvSystemIds.ZSTACK,
                NvItemsIds.EX_NWK_SEC_MATERIAL_TABLE,
                undefined,
                Structs.nwkSecMaterialDescriptorTable,
            );
        } else {
            return await this.nv.readTable('legacy', NvItemsIds.LEGACY_NWK_SEC_MATERIAL_TABLE_START, 12, Structs.nwkSecMaterialDescriptorTable);
        }
    }
}

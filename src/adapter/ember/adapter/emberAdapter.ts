import {randomBytes} from 'node:crypto';
import {readFileSync} from 'node:fs';
import path from 'node:path';

import equals from 'fast-deep-equal/es6';

import {Adapter, TsType} from '../..';
import {Backup} from '../../../models';
import {Queue, wait} from '../../../utils';
import {logger} from '../../../utils/logger';
import * as ZSpec from '../../../zspec';
import {EUI64, ExtendedPanId, NodeId, PanId} from '../../../zspec/tstypes';
import * as Zcl from '../../../zspec/zcl';
import * as Zdo from '../../../zspec/zdo';
import * as ZdoTypes from '../../../zspec/zdo/definition/tstypes';
import {DeviceJoinedPayload, DeviceLeavePayload, ZclPayload} from '../../events';
import {
    EMBER_HIGH_RAM_CONCENTRATOR,
    EMBER_LOW_RAM_CONCENTRATOR,
    EMBER_MIN_BROADCAST_ADDRESS,
    INTERPAN_APS_FRAME_TYPE,
    INVALID_RADIO_CHANNEL,
    LONG_DEST_FRAME_CONTROL,
    MAC_ACK_REQUIRED,
    MAXIMUM_INTERPAN_LENGTH,
    SECURITY_LEVEL_Z3,
    SHORT_DEST_FRAME_CONTROL,
    STACK_PROFILE_ZIGBEE_PRO,
    STUB_NWK_FRAME_CONTROL,
    ZIGBEE_PROFILE_INTEROPERABILITY_LINK_KEY,
} from '../consts';
import {
    EmberApsOption,
    EmberDeviceUpdate,
    EmberExtendedSecurityBitmask,
    EmberIncomingMessageType,
    EmberInitialSecurityBitmask,
    EmberInterpanMessageType,
    EmberJoinDecision,
    EmberJoinMethod,
    EmberNetworkInitBitmask,
    EmberNetworkStatus,
    EmberNodeType,
    EmberOutgoingMessageType,
    EmberSourceRouteDiscoveryMode,
    EmberTransmitPriority,
    EmberVersionType,
    EzspStatus,
    IEEE802154CcaMode,
    SecManKeyType,
    SLStatus,
} from '../enums';
import {EzspBuffalo} from '../ezsp/buffalo';
import {EMBER_ENCRYPTION_KEY_SIZE, EZSP_MIN_PROTOCOL_VERSION, EZSP_PROTOCOL_VERSION, EZSP_STACK_TYPE_MESH} from '../ezsp/consts';
import {EzspConfigId, EzspDecisionBitmask, EzspDecisionId, EzspPolicyId, EzspValueId} from '../ezsp/enums';
import {Ezsp} from '../ezsp/ezsp';
import {EzspError} from '../ezspError';
import {
    EmberApsFrame,
    EmberInitialSecurityState,
    EmberKeyData,
    EmberMulticastId,
    EmberMulticastTableEntry,
    EmberNetworkInitStruct,
    EmberNetworkParameters,
    EmberVersion,
    SecManAPSKeyMetadata,
    SecManContext,
    SecManKey,
} from '../types';
import {initNetworkCache, initSecurityManagerContext} from '../utils/initters';
import {lowHighBytes} from '../utils/math';
import {FIXED_ENDPOINTS} from './endpoints';
import {EmberOneWaitress, OneWaitressEvents} from './oneWaitress';

const NS = 'zh:ember';

export type NetworkCache = {
    //-- basic network info
    eui64: EUI64;
    parameters: EmberNetworkParameters;
};

/**
 * Use for a link key backup.
 *
 * Each entry notes the EUI64 of the device it is paired to and the key data.
 *   This key may be hashed and not the actual link key currently in use.
 */
export type LinkKeyBackupData = {
    deviceEui64: EUI64;
    key: EmberKeyData;
    outgoingFrameCounter: number;
    incomingFrameCounter: number;
};

/**
 * Application generated ZDO messages use sequence numbers 0-127, and the stack
 * uses sequence numbers 128-255.  This simplifies life by eliminating the need
 * for coordination between the two entities, and allows both to send ZDO
 * messages with non-conflicting sequence numbers.
 */
const APPLICATION_ZDO_SEQUENCE_MASK = 0x7f;
/* Default radius used for broadcast ZDO requests. uint8_t */
const ZDO_REQUEST_RADIUS = 0xff;
/**
 * 9sec is minimum recommended for `ezspBroadcastNextNetworkKey` to have propagated throughout network.
 * NOTE: This is blocking the request queue, so we shouldn't go crazy high.
 */
const BROADCAST_NETWORK_KEY_SWITCH_WAIT_TIME = 15000;

const QUEUE_MAX_SEND_ATTEMPTS = 3;
const QUEUE_BUSY_DEFER_MSEC = 500;
const QUEUE_NETWORK_DOWN_DEFER_MSEC = 1500;

type StackConfig = {
    CONCENTRATOR_RAM_TYPE: 'high' | 'low';
    /**
     * Minimum Time between broadcasts (in seconds) <1-60>
     * Default: 10
     * The minimum amount of time that must pass between MTORR broadcasts.
     */
    CONCENTRATOR_MIN_TIME: number;
    /**
     * Maximum Time between broadcasts (in seconds) <30-300>
     * Default: 60
     * The maximum amount of time that can pass between MTORR broadcasts.
     */
    CONCENTRATOR_MAX_TIME: number;
    /**
     * Route Error Threshold <1-100>
     * Default: 3
     * The number of route errors that will trigger a re-broadcast of the MTORR.
     */
    CONCENTRATOR_ROUTE_ERROR_THRESHOLD: number;
    /**
     * Delivery Failure Threshold <1-100>
     * Default: 1
     * The number of APS delivery failures that will trigger a re-broadcast of the MTORR.
     */
    CONCENTRATOR_DELIVERY_FAILURE_THRESHOLD: number;
    /**
     * Maximum number of hops for Broadcast <0-30>
     * Default: 0
     * The maximum number of hops that the MTORR broadcast will be allowed to have.
     * A value of 0 will be converted to the EMBER_MAX_HOPS value set by the stack.
     */
    CONCENTRATOR_MAX_HOPS: number;
    /** <6-64> (Default: 6) @see EzspConfigId.MAX_END_DEVICE_CHILDREN */
    MAX_END_DEVICE_CHILDREN: number;
    /** <-> (Default: 10000) @see EzspValueId.TRANSIENT_DEVICE_TIMEOUT */
    TRANSIENT_DEVICE_TIMEOUT: number;
    /** <0-14> (Default: 8) @see EzspConfigId.END_DEVICE_POLL_TIMEOUT */
    END_DEVICE_POLL_TIMEOUT: number;
    /** <0-65535> (Default: 300) @see EzspConfigId.TRANSIENT_KEY_TIMEOUT_S */
    TRANSIENT_KEY_TIMEOUT_S: number;
    /**@see Ezsp.ezspSetRadioIeee802154CcaMode */
    CCA_MODE?: keyof typeof IEEE802154CcaMode;
};

/**
 * Default stack configuration values.
 * @see https://www.silabs.com/documents/public/user-guides/ug100-ezsp-reference-guide.pdf 2.3.1 for descriptions/RAM costs
 *
 * https://github.com/darkxst/silabs-firmware-builder/tree/main/manifests
 * https://github.com/NabuCasa/silabs-firmware/wiki/Zigbee-EmberZNet-NCP-firmware-configuration#skyconnect
 * https://github.com/SiliconLabs/UnifySDK/blob/main/applications/zigbeed/project_files/zigbeed.slcp
 */
export const DEFAULT_STACK_CONFIG: Readonly<StackConfig> = {
    CONCENTRATOR_RAM_TYPE: 'high',
    CONCENTRATOR_MIN_TIME: 5, // zigpc: 10
    CONCENTRATOR_MAX_TIME: 60, // zigpc: 60
    CONCENTRATOR_ROUTE_ERROR_THRESHOLD: 3, // zigpc: 3
    CONCENTRATOR_DELIVERY_FAILURE_THRESHOLD: 1, // zigpc: 1, ZigbeeMinimalHost: 3
    CONCENTRATOR_MAX_HOPS: 0, // zigpc: 0
    MAX_END_DEVICE_CHILDREN: 32, // zigpc: 6, nabucasa: 32, Dongle-E (Sonoff firmware): 32
    TRANSIENT_DEVICE_TIMEOUT: 10000,
    END_DEVICE_POLL_TIMEOUT: 8, // zigpc: 8
    TRANSIENT_KEY_TIMEOUT_S: 300, // zigpc: 65535
    CCA_MODE: undefined, // not set by default
};
/** Default behavior is to disable app key requests */
const ALLOW_APP_KEY_REQUESTS = false;
/** @see EzspConfigId.TRUST_CENTER_ADDRESS_CACHE_SIZE */
const TRUST_CENTER_ADDRESS_CACHE_SIZE = 2;

/**
 * NOTE: This from SDK is currently ignored here because of issues in below links:
 * - BUGZID 12261: Concentrators use MTORRs for route discovery and should not enable route discovery in the APS options.
 * - https://community.silabs.com/s/question/0D58Y00008DRfDCSA1/coordinator-cant-send-unicast-to-sleepy-node-after-reboot
 * - https://community.silabs.com/s/question/0D58Y0000B4nTb7SQE/largedense-network-communication-problem-source-route-table-not-big-enough
 *
 * Removing `ENABLE_ROUTE_DISCOVERY` leads to devices that won't reconnect/go offline, and various other issues. Keeping it for now.
 */
export const DEFAULT_APS_OPTIONS = EmberApsOption.RETRY | EmberApsOption.ENABLE_ROUTE_DISCOVERY | EmberApsOption.ENABLE_ADDRESS_DISCOVERY;
/** Time for a request to get a callback response. ASH is 2400*6 for ACK timeout. */
const DEFAULT_REQUEST_TIMEOUT = 15000; // msec
/** Time for a network-related request to get a response (usually via event). */
const DEFAULT_NETWORK_REQUEST_TIMEOUT = 10000; // nothing on the network to bother requests, should be much faster than this
/** Time between watchdog counters reading/clearing */
const WATCHDOG_COUNTERS_FEED_INTERVAL = 3600000; // every hour...
/** Default manufacturer code reported by coordinator. */
const DEFAULT_MANUFACTURER_CODE = Zcl.ManufacturerCode.SILICON_LABORATORIES;
/**
 * Workaround for devices that require a specific manufacturer code to be reported by coordinator while interviewing...
 * - Lumi/Aqara devices do not work properly otherwise (missing features): https://github.com/Koenkk/zigbee2mqtt/issues/9274
 */
const WORKAROUND_JOIN_MANUF_IEEE_PREFIX_TO_CODE: {[ieeePrefix: string]: Zcl.ManufacturerCode} = {
    // NOTE: Lumi has a new prefix registered since 2021, in case they start using that one with new devices, it might need to be added here too...
    //       "0x18c23c" https://maclookup.app/vendors/lumi-united-technology-co-ltd
    '0x54ef44': Zcl.ManufacturerCode.LUMI_UNITED_TECHOLOGY_LTD_SHENZHEN,
};

/**
 * Relay calls between Z2M and EZSP-layer and handle any error that might occur via queue & waitress.
 *
 * Anything post `start` that requests anything from the EZSP layer must run through the request queue for proper execution flow.
 */
export class EmberAdapter extends Adapter {
    /** Current manufacturer code assigned to the coordinator. Used for join workarounds... */
    private manufacturerCode: Zcl.ManufacturerCode;
    public readonly stackConfig: StackConfig;

    private ezsp: Ezsp;
    private version: {ezsp: number; revision: string} & EmberVersion;

    private readonly queue: Queue;
    private readonly oneWaitress: EmberOneWaitress;
    /** Periodically retrieve counters then clear them. */
    private watchdogCountersHandle?: NodeJS.Timeout;

    /** Sequence number used for ZDO requests. static uint8_t  */
    private zdoRequestSequence: number;

    private interpanLock: boolean;

    /**
     * Cached network params to avoid NCP calls. Prevents frequent EZSP transactions.
     * NOTE: Do not use directly, use getter functions for it that check if valid or need retrieval from NCP.
     */
    private networkCache: NetworkCache;
    private multicastTable: EmberMulticastId[];

    constructor(
        networkOptions: TsType.NetworkOptions,
        serialPortOptions: TsType.SerialPortOptions,
        backupPath: string,
        adapterOptions: TsType.AdapterOptions,
    ) {
        super(networkOptions, serialPortOptions, backupPath, adapterOptions);
        this.hasZdoMessageOverhead = true;
        this.manufacturerID = Zcl.ManufacturerCode.SILICON_LABORATORIES;

        this.version = {
            ezsp: 0,
            revision: 'unknown',
            build: 0,
            major: 0,
            minor: 0,
            patch: 0,
            special: 0,
            type: EmberVersionType.GA,
        };
        this.zdoRequestSequence = 0; // start at 1
        this.interpanLock = false;
        this.networkCache = initNetworkCache();
        this.manufacturerCode = DEFAULT_MANUFACTURER_CODE; // will be set in NCP in initEzsp
        this.multicastTable = [];

        this.stackConfig = this.loadStackConfig();
        this.queue = new Queue(this.adapterOptions.concurrent || 16); // ORed to avoid 0 (not checked in settings/queue constructor)
        this.oneWaitress = new EmberOneWaitress();

        this.ezsp = new Ezsp(serialPortOptions);

        this.ezsp.on('zdoResponse', this.onZDOResponse.bind(this));
        this.ezsp.on('incomingMessage', this.onIncomingMessage.bind(this));
        this.ezsp.on('touchlinkMessage', this.onTouchlinkMessage.bind(this));
        this.ezsp.on('stackStatus', this.onStackStatus.bind(this));
        this.ezsp.on('trustCenterJoin', this.onTrustCenterJoin.bind(this));
        this.ezsp.on('messageSent', this.onMessageSent.bind(this));
        this.ezsp.once('ncpNeedsResetAndInit', this.onNcpNeedsResetAndInit.bind(this));
    }

    private loadStackConfig(): StackConfig {
        // store stack config in same dir as backup
        const configPath = path.join(path.dirname(this.backupPath), 'stack_config.json');

        try {
            const customConfig: StackConfig = JSON.parse(readFileSync(configPath, 'utf8'));
            // set any undefined config to default
            const config: StackConfig = {...DEFAULT_STACK_CONFIG, ...customConfig};

            const inRange = (value: number, min: number, max: number): boolean => (value == undefined || value < min || value > max ? false : true);

            if (!['high', 'low'].includes(config.CONCENTRATOR_RAM_TYPE)) {
                config.CONCENTRATOR_RAM_TYPE = DEFAULT_STACK_CONFIG.CONCENTRATOR_RAM_TYPE;
                logger.error(`[STACK CONFIG] Invalid CONCENTRATOR_RAM_TYPE, using default.`, NS);
            }

            if (!inRange(config.CONCENTRATOR_MIN_TIME, 1, 60) || config.CONCENTRATOR_MIN_TIME >= config.CONCENTRATOR_MAX_TIME) {
                config.CONCENTRATOR_MIN_TIME = DEFAULT_STACK_CONFIG.CONCENTRATOR_MIN_TIME;
                logger.error(`[STACK CONFIG] Invalid CONCENTRATOR_MIN_TIME, using default.`, NS);
            }

            if (!inRange(config.CONCENTRATOR_MAX_TIME, 30, 300) || config.CONCENTRATOR_MAX_TIME <= config.CONCENTRATOR_MIN_TIME) {
                config.CONCENTRATOR_MAX_TIME = DEFAULT_STACK_CONFIG.CONCENTRATOR_MAX_TIME;
                logger.error(`[STACK CONFIG] Invalid CONCENTRATOR_MAX_TIME, using default.`, NS);
            }

            if (!inRange(config.CONCENTRATOR_ROUTE_ERROR_THRESHOLD, 1, 100)) {
                config.CONCENTRATOR_ROUTE_ERROR_THRESHOLD = DEFAULT_STACK_CONFIG.CONCENTRATOR_ROUTE_ERROR_THRESHOLD;
                logger.error(`[STACK CONFIG] Invalid CONCENTRATOR_ROUTE_ERROR_THRESHOLD, using default.`, NS);
            }

            if (!inRange(config.CONCENTRATOR_DELIVERY_FAILURE_THRESHOLD, 1, 100)) {
                config.CONCENTRATOR_DELIVERY_FAILURE_THRESHOLD = DEFAULT_STACK_CONFIG.CONCENTRATOR_DELIVERY_FAILURE_THRESHOLD;
                logger.error(`[STACK CONFIG] Invalid CONCENTRATOR_DELIVERY_FAILURE_THRESHOLD, using default.`, NS);
            }

            if (!inRange(config.CONCENTRATOR_MAX_HOPS, 0, 30)) {
                config.CONCENTRATOR_MAX_HOPS = DEFAULT_STACK_CONFIG.CONCENTRATOR_MAX_HOPS;
                logger.error(`[STACK CONFIG] Invalid CONCENTRATOR_MAX_HOPS, using default.`, NS);
            }

            if (!inRange(config.MAX_END_DEVICE_CHILDREN, 6, 64)) {
                config.MAX_END_DEVICE_CHILDREN = DEFAULT_STACK_CONFIG.MAX_END_DEVICE_CHILDREN;
                logger.error(`[STACK CONFIG] Invalid MAX_END_DEVICE_CHILDREN, using default.`, NS);
            }

            if (!inRange(config.TRANSIENT_DEVICE_TIMEOUT, 0, 65535)) {
                config.TRANSIENT_DEVICE_TIMEOUT = DEFAULT_STACK_CONFIG.TRANSIENT_DEVICE_TIMEOUT;
                logger.error(`[STACK CONFIG] Invalid TRANSIENT_DEVICE_TIMEOUT, using default.`, NS);
            }

            if (!inRange(config.END_DEVICE_POLL_TIMEOUT, 0, 14)) {
                config.END_DEVICE_POLL_TIMEOUT = DEFAULT_STACK_CONFIG.END_DEVICE_POLL_TIMEOUT;
                logger.error(`[STACK CONFIG] Invalid END_DEVICE_POLL_TIMEOUT, using default.`, NS);
            }

            if (!inRange(config.TRANSIENT_KEY_TIMEOUT_S, 0, 65535)) {
                config.TRANSIENT_KEY_TIMEOUT_S = DEFAULT_STACK_CONFIG.TRANSIENT_KEY_TIMEOUT_S;
                logger.error(`[STACK CONFIG] Invalid TRANSIENT_KEY_TIMEOUT_S, using default.`, NS);
            }

            config.CCA_MODE = config.CCA_MODE ?? undefined; // always default to undefined

            if (config.CCA_MODE && IEEE802154CcaMode[config.CCA_MODE] === undefined) {
                config.CCA_MODE = undefined;
                logger.error(`[STACK CONFIG] Invalid CCA_MODE, ignoring.`, NS);
            }

            logger.info(`Using stack config ${JSON.stringify(config)}.`, NS);
            return config;
        } catch {
            /* empty */
        }

        logger.info(`Using default stack config.`, NS);
        return DEFAULT_STACK_CONFIG;
    }

    /**
     * Emitted from @see Ezsp.ezspStackStatusHandler
     * @param status
     */
    private async onStackStatus(status: SLStatus): Promise<void> {
        // to be extra careful, should clear network cache upon receiving this.
        this.clearNetworkCache();

        switch (status) {
            case SLStatus.NETWORK_UP: {
                this.oneWaitress.resolveEvent(OneWaitressEvents.STACK_STATUS_NETWORK_UP);
                logger.info(`[STACK STATUS] Network up.`, NS);
                break;
            }
            case SLStatus.NETWORK_DOWN: {
                this.oneWaitress.resolveEvent(OneWaitressEvents.STACK_STATUS_NETWORK_DOWN);
                logger.info(`[STACK STATUS] Network down.`, NS);
                break;
            }
            case SLStatus.ZIGBEE_NETWORK_OPENED: {
                this.oneWaitress.resolveEvent(OneWaitressEvents.STACK_STATUS_NETWORK_OPENED);
                logger.info(`[STACK STATUS] Network opened.`, NS);
                break;
            }
            case SLStatus.ZIGBEE_NETWORK_CLOSED: {
                this.oneWaitress.resolveEvent(OneWaitressEvents.STACK_STATUS_NETWORK_CLOSED);
                logger.info(`[STACK STATUS] Network closed.`, NS);
                break;
            }
            case SLStatus.ZIGBEE_CHANNEL_CHANGED: {
                // invalidate cache
                this.networkCache.parameters.radioChannel = INVALID_RADIO_CHANNEL;
                logger.info(`[STACK STATUS] Channel changed.`, NS);
                break;
            }
            default: {
                logger.debug(`[STACK STATUS] ${SLStatus[status]}.`, NS);
                break;
            }
        }
    }

    /**
     * Emitted from @see Ezsp.ezspMessageSentHandler
     * WARNING: Cannot rely on `ezspMessageSentHandler` > `ezspIncomingMessageHandler` order, some devices mix it up!
     *
     * @param type
     * @param indexOrDestination
     * @param apsFrame
     * @param messageTag
     * @param status
     */
    private async onMessageSent(
        status: SLStatus,
        type: EmberOutgoingMessageType,
        indexOrDestination: number,
        apsFrame: EmberApsFrame,
        messageTag: number,
    ): Promise<void> {
        switch (status) {
            case SLStatus.ZIGBEE_DELIVERY_FAILED: {
                logger.debug(
                    () =>
                        `~x~> DELIVERY_FAILED [indexOrDestination=${indexOrDestination} apsFrame=${JSON.stringify(apsFrame)} messageTag=${messageTag}]`,
                    NS,
                );

                // no ACK was received from the destination
                switch (type) {
                    case EmberOutgoingMessageType.BROADCAST:
                    case EmberOutgoingMessageType.BROADCAST_WITH_ALIAS:
                    case EmberOutgoingMessageType.MULTICAST:
                    case EmberOutgoingMessageType.MULTICAST_WITH_ALIAS: {
                        // BC/MC not checking for message sent, avoid unnecessary waitress lookups
                        logger.error(`Delivery of ${EmberOutgoingMessageType[type]} failed for '${indexOrDestination}'.`, NS);
                        break;
                    }
                    default: {
                        // reject any waitress early (don't wait for timeout if we know we're gonna get there eventually)
                        this.oneWaitress.deliveryFailedFor(indexOrDestination, apsFrame);
                        break;
                    }
                }

                break;
            }
            case SLStatus.OK: {
                if (
                    type === EmberOutgoingMessageType.MULTICAST &&
                    apsFrame.destinationEndpoint === 0xff &&
                    apsFrame.groupId < EMBER_MIN_BROADCAST_ADDRESS &&
                    !this.multicastTable.includes(apsFrame.groupId)
                ) {
                    // workaround for devices using multicast for state update (coordinator passthrough)
                    const tableIdx = this.multicastTable.length;
                    const multicastEntry: EmberMulticastTableEntry = {
                        multicastId: apsFrame.groupId,
                        endpoint: FIXED_ENDPOINTS[0].endpoint,
                        networkIndex: FIXED_ENDPOINTS[0].networkIndex,
                    };
                    // set immediately to avoid potential race
                    this.multicastTable.push(multicastEntry.multicastId);

                    try {
                        await this.queue.execute<void>(async () => {
                            const status = await this.ezsp.ezspSetMulticastTableEntry(tableIdx, multicastEntry);

                            if (status !== SLStatus.OK) {
                                throw new Error(
                                    `Failed to register group '${multicastEntry.multicastId}' in multicast table with status=${SLStatus[status]}.`,
                                );
                            }

                            logger.debug(() => `Registered multicast table entry (${tableIdx}): ${JSON.stringify(multicastEntry)}.`, NS);
                        });
                    } catch (error) {
                        // remove to allow retry on next occurrence
                        this.multicastTable.splice(tableIdx, 1);
                        logger.error((error as Error).message, NS);
                    }
                }

                break;
            }
        }
        // shouldn't be any other status
    }

    /**
     * Emitted from @see Ezsp.ezspIncomingMessageHandler
     *
     * @param apsFrame The APS frame associated with the response.
     * @param sender The sender of the response. Should match `payload.nodeId` in many responses.
     * @param messageContents The content of the response.
     */
    private async onZDOResponse(apsFrame: EmberApsFrame, sender: NodeId, messageContents: Buffer): Promise<void> {
        const result = Zdo.Buffalo.readResponse(this.hasZdoMessageOverhead, apsFrame.clusterId, messageContents);

        if (apsFrame.clusterId === Zdo.ClusterId.NETWORK_ADDRESS_RESPONSE) {
            // special case to properly resolve a NETWORK_ADDRESS_RESPONSE following a NETWORK_ADDRESS_REQUEST (based on EUI64 from ZDO payload)
            // NOTE: if response has invalid status (no EUI64 available), response waiter will eventually time out
            if (Zdo.Buffalo.checkStatus<Zdo.ClusterId.NETWORK_ADDRESS_RESPONSE>(result)) {
                this.oneWaitress.resolveZDO(result[1].eui64, apsFrame, result);
            }
        } else {
            this.oneWaitress.resolveZDO(sender, apsFrame, result);
        }

        this.emit('zdoResponse', apsFrame.clusterId, result);
    }

    /**
     * Emitted from @see Ezsp.ezspIncomingMessageHandler @see Ezsp.ezspGpepIncomingMessageHandler
     *
     * @param type
     * @param apsFrame
     * @param lastHopLqi
     * @param sender
     * @param messageContents
     */
    private async onIncomingMessage(
        type: EmberIncomingMessageType,
        apsFrame: EmberApsFrame,
        lastHopLqi: number,
        sender: NodeId,
        messageContents: Buffer,
    ): Promise<void> {
        const payload: ZclPayload = {
            clusterID: apsFrame.clusterId,
            header: Zcl.Header.fromBuffer(messageContents),
            address: sender,
            data: messageContents,
            endpoint: apsFrame.sourceEndpoint,
            linkquality: lastHopLqi,
            groupID: apsFrame.groupId,
            wasBroadcast: type === EmberIncomingMessageType.BROADCAST || type === EmberIncomingMessageType.BROADCAST_LOOPBACK,
            destinationEndpoint: apsFrame.destinationEndpoint,
        };

        this.oneWaitress.resolveZCL(payload);
        this.emit('zclPayload', payload);
    }

    /**
     * Emitted from @see Ezsp.ezspMacFilterMatchMessageHandler when the message is a valid InterPAN touchlink message.
     *
     * @param sourcePanId
     * @param sourceAddress
     * @param groupId
     * @param lastHopLqi
     * @param messageContents
     */
    private async onTouchlinkMessage(
        sourcePanId: PanId,
        sourceAddress: EUI64,
        groupId: number,
        lastHopLqi: number,
        messageContents: Buffer,
    ): Promise<void> {
        const endpoint = FIXED_ENDPOINTS[0].endpoint;
        const payload: ZclPayload = {
            clusterID: Zcl.Clusters.touchlink.ID,
            data: messageContents,
            header: Zcl.Header.fromBuffer(messageContents),
            address: sourceAddress,
            endpoint: endpoint, // arbitrary since not sent over-the-air
            linkquality: lastHopLqi,
            groupID: groupId,
            wasBroadcast: true, // XXX: since always sent broadcast atm...
            destinationEndpoint: endpoint,
        };

        this.oneWaitress.resolveZCL(payload);
        this.emit('zclPayload', payload);
    }

    /**
     * Emitted from @see Ezsp.ezspTrustCenterJoinHandler
     * Also from @see Ezsp.ezspIdConflictHandler as a DEVICE_LEFT
     *
     * @param newNodeId
     * @param newNodeEui64
     * @param status
     * @param policyDecision
     * @param parentOfNewNodeId
     */
    private async onTrustCenterJoin(
        newNodeId: NodeId,
        newNodeEui64: EUI64,
        status: EmberDeviceUpdate,
        policyDecision: EmberJoinDecision,
        parentOfNewNodeId: NodeId,
    ): Promise<void> {
        if (status === EmberDeviceUpdate.DEVICE_LEFT) {
            const payload: DeviceLeavePayload = {
                networkAddress: newNodeId,
                ieeeAddr: newNodeEui64,
            };

            this.emit('deviceLeave', payload);
        } else {
            if (policyDecision !== EmberJoinDecision.DENY_JOIN) {
                const payload: DeviceJoinedPayload = {
                    networkAddress: newNodeId,
                    ieeeAddr: newNodeEui64,
                };

                // set workaround manuf code if necessary, or revert to default if previous joined device required workaround and new one does not
                const joinManufCode = WORKAROUND_JOIN_MANUF_IEEE_PREFIX_TO_CODE[newNodeEui64.substring(0, 8)] ?? DEFAULT_MANUFACTURER_CODE;

                if (this.manufacturerCode !== joinManufCode) {
                    await this.queue.execute<void>(async () => {
                        logger.debug(`[WORKAROUND] Setting coordinator manufacturer code to ${Zcl.ManufacturerCode[joinManufCode]}.`, NS);
                        await this.ezsp.ezspSetManufacturerCode(joinManufCode);

                        this.manufacturerCode = joinManufCode;

                        this.emit('deviceJoined', payload);
                    });
                } else {
                    this.emit('deviceJoined', payload);
                }
            } else {
                logger.warning(`[TRUST CENTER] Device ${newNodeId}:${newNodeEui64} was denied joining via ${parentOfNewNodeId}.`, NS);
            }
        }
    }

    private async watchdogCounters(): Promise<void> {
        await this.queue.execute<void>(async () => {
            // listed as per EmberCounterType
            const ncpCounters = await this.ezsp.ezspReadAndClearCounters();

            logger.info(`[NCP COUNTERS] ${ncpCounters.join(',')}`, NS);

            const ashCounters = this.ezsp.ash.readAndClearCounters();

            logger.info(`[ASH COUNTERS] ${ashCounters.join(',')}`, NS);
        });
    }

    /**
     * Proceed to execute the long list of commands required to setup comms between Host<>NCP.
     * This is called by start and on internal reset.
     */
    private async initEzsp(): Promise<TsType.StartResult> {
        let result: TsType.StartResult = 'resumed';

        // NOTE: something deep in this call can throw too
        const startResult = await this.ezsp.start();

        if (startResult !== EzspStatus.SUCCESS) {
            throw new Error(`Failed to start EZSP layer with status=${EzspStatus[startResult]}.`);
        }

        // call before any other command, else fails
        await this.emberVersion();

        /** The address cache needs to be initialized and used with the source routing code for the trust center to operate properly. */
        await this.emberSetEzspConfigValue(EzspConfigId.TRUST_CENTER_ADDRESS_CACHE_SIZE, TRUST_CENTER_ADDRESS_CACHE_SIZE);
        /** MAC indirect timeout should be 7.68 secs (STACK_PROFILE_ZIGBEE_PRO) */
        await this.emberSetEzspConfigValue(EzspConfigId.INDIRECT_TRANSMISSION_TIMEOUT, 7680);
        /** Max hops should be 2 * nwkMaxDepth, where nwkMaxDepth is 15 (STACK_PROFILE_ZIGBEE_PRO) */
        await this.emberSetEzspConfigValue(EzspConfigId.MAX_HOPS, 30);
        await this.emberSetEzspConfigValue(EzspConfigId.SUPPORTED_NETWORKS, 1);
        // allow other devices to modify the binding table
        await this.emberSetEzspPolicy(
            EzspPolicyId.BINDING_MODIFICATION_POLICY,
            EzspDecisionId.CHECK_BINDING_MODIFICATIONS_ARE_VALID_ENDPOINT_CLUSTERS,
        );
        // return message tag only in ezspMessageSentHandler()
        await this.emberSetEzspPolicy(EzspPolicyId.MESSAGE_CONTENTS_IN_CALLBACK_POLICY, EzspDecisionId.MESSAGE_TAG_ONLY_IN_CALLBACK);
        await this.emberSetEzspValue(EzspValueId.TRANSIENT_DEVICE_TIMEOUT, 2, lowHighBytes(this.stackConfig.TRANSIENT_DEVICE_TIMEOUT));
        await this.ezsp.ezspSetManufacturerCode(this.manufacturerCode);
        // network security init
        await this.emberSetEzspConfigValue(EzspConfigId.STACK_PROFILE, STACK_PROFILE_ZIGBEE_PRO);
        await this.emberSetEzspConfigValue(EzspConfigId.SECURITY_LEVEL, SECURITY_LEVEL_Z3);
        // common configs
        await this.emberSetEzspConfigValue(EzspConfigId.MAX_END_DEVICE_CHILDREN, this.stackConfig.MAX_END_DEVICE_CHILDREN);
        await this.emberSetEzspConfigValue(EzspConfigId.END_DEVICE_POLL_TIMEOUT, this.stackConfig.END_DEVICE_POLL_TIMEOUT);
        await this.emberSetEzspConfigValue(EzspConfigId.TRANSIENT_KEY_TIMEOUT_S, this.stackConfig.TRANSIENT_KEY_TIMEOUT_S);
        // XXX: temp-fix: forces a side-effect in the firmware that prevents broadcast issues in environments with unusual interferences
        await this.emberSetEzspValue(EzspValueId.CCA_THRESHOLD, 1, [0]);

        if (this.stackConfig.CCA_MODE) {
            // validated in `loadStackConfig`
            await this.ezsp.ezspSetRadioIeee802154CcaMode(IEEE802154CcaMode[this.stackConfig.CCA_MODE]);
        }

        // WARNING: From here on EZSP commands that affect memory allocation on the NCP should no longer be called (like resizing tables)

        await this.registerFixedEndpoints();
        this.clearNetworkCache();

        await this.initTrustCenter();
        result = await this.initNetwork();

        // after network UP, as per SDK, ensures clean slate
        await this.initNCPConcentrator();

        // populate network cache info
        const [status, , parameters] = await this.ezsp.ezspGetNetworkParameters();

        if (status !== SLStatus.OK) {
            throw new Error(`Failed to get network parameters with status=${SLStatus[status]}.`);
        }

        if (this.adapterOptions.transmitPower != undefined && parameters.radioTxPower !== this.adapterOptions.transmitPower) {
            const status = await this.ezsp.ezspSetRadioPower(this.adapterOptions.transmitPower);

            if (status !== SLStatus.OK) {
                // soft-fail, don't prevent start
                logger.error(`Failed to set transmit power to ${this.adapterOptions.transmitPower} status=${SLStatus[status]}.`, NS);
            }
        }

        this.networkCache.parameters = parameters;
        this.networkCache.eui64 = await this.ezsp.ezspGetEui64();

        logger.debug(() => `[INIT] Network Ready! ${JSON.stringify(this.networkCache)}`, NS);

        this.watchdogCountersHandle = setInterval(this.watchdogCounters.bind(this), WATCHDOG_COUNTERS_FEED_INTERVAL);

        return result;
    }

    /**
     * NCP concentrator init. Also enables source route discovery mode with RESCHEDULE.
     *
     * From AN1233:
     * To function correctly in a Zigbee PRO network, a trust center also requires that:
     *
     * 1. The trust center application must act as a concentrator (either high or low RAM).
     * 2. The trust center application must have support for source routing.
     *    It must record the source routes and properly handle requests by the stack for a particular source route.
     * 3. The trust center application must use an address cache for security, in order to maintain a mapping of IEEE address to short ID.
     *
     * Failure to satisfy all of the above requirements may result in failures when joining/rejoining devices to the network across multiple hops
     * (through a target node that is neither the trust center nor one of its neighboring routers.)
     */
    private async initNCPConcentrator(): Promise<void> {
        const status = await this.ezsp.ezspSetConcentrator(
            true,
            this.stackConfig.CONCENTRATOR_RAM_TYPE === 'low' ? EMBER_LOW_RAM_CONCENTRATOR : EMBER_HIGH_RAM_CONCENTRATOR,
            this.stackConfig.CONCENTRATOR_MIN_TIME,
            this.stackConfig.CONCENTRATOR_MAX_TIME,
            this.stackConfig.CONCENTRATOR_ROUTE_ERROR_THRESHOLD,
            this.stackConfig.CONCENTRATOR_DELIVERY_FAILURE_THRESHOLD,
            this.stackConfig.CONCENTRATOR_MAX_HOPS,
        );

        if (status !== SLStatus.OK) {
            throw new Error(`[CONCENTRATOR] Failed to set concentrator with status=${SLStatus[status]}.`);
        }

        const remainTilMTORR = await this.ezsp.ezspSetSourceRouteDiscoveryMode(EmberSourceRouteDiscoveryMode.RESCHEDULE);

        logger.info(`[CONCENTRATOR] Started source route discovery. ${remainTilMTORR}ms until next broadcast.`, NS);
    }

    /**
     * Register fixed endpoints and set any related multicast entries that need to be.
     */
    private async registerFixedEndpoints(): Promise<void> {
        for (const ep of FIXED_ENDPOINTS) {
            const [epStatus] = await this.ezsp.ezspGetEndpointFlags(ep.endpoint);

            // endpoint not already registered
            if (epStatus !== SLStatus.OK) {
                // check to see if ezspAddEndpoint needs to be called
                // if ezspInit is called without NCP reset, ezspAddEndpoint is not necessary and will return an error
                const status = await this.ezsp.ezspAddEndpoint(
                    ep.endpoint,
                    ep.profileId,
                    ep.deviceId,
                    ep.deviceVersion,
                    ep.inClusterList.slice(), // copy
                    ep.outClusterList.slice(), // copy
                );

                if (status === SLStatus.OK) {
                    logger.debug(`Registered endpoint '${ep.endpoint}'.`, NS);
                } else {
                    throw new Error(`Failed to register endpoint '${ep.endpoint}' with status=${SLStatus[status]}.`);
                }
            } else {
                logger.debug(`Endpoint '${ep.endpoint}' already registered.`, NS);
            }

            for (const multicastId of ep.multicastIds) {
                const multicastEntry: EmberMulticastTableEntry = {
                    multicastId,
                    endpoint: ep.endpoint,
                    networkIndex: ep.networkIndex,
                };

                const status = await this.ezsp.ezspSetMulticastTableEntry(this.multicastTable.length, multicastEntry);

                if (status !== SLStatus.OK) {
                    throw new Error(`Failed to register group '${multicastId}' in multicast table with status=${SLStatus[status]}.`);
                }

                logger.debug(() => `Registered multicast table entry (${this.multicastTable.length}): ${JSON.stringify(multicastEntry)}.`, NS);
                this.multicastTable.push(multicastEntry.multicastId);
            }
        }
    }

    private async initTrustCenter(): Promise<void> {
        // init TC policies
        let status = await this.emberSetEzspPolicy(EzspPolicyId.TC_KEY_REQUEST_POLICY, EzspDecisionId.ALLOW_TC_KEY_REQUESTS_AND_SEND_CURRENT_KEY);

        if (status !== SLStatus.OK) {
            throw new Error(
                `[INIT TC] Failed to set EzspPolicyId TC_KEY_REQUEST_POLICY to ALLOW_TC_KEY_REQUESTS_AND_SEND_CURRENT_KEY with status=${SLStatus[status]}.`,
            );
        }

        /* v8 ignore next */
        const appKeyRequestsPolicy = ALLOW_APP_KEY_REQUESTS ? EzspDecisionId.ALLOW_APP_KEY_REQUESTS : EzspDecisionId.DENY_APP_KEY_REQUESTS;
        status = await this.emberSetEzspPolicy(EzspPolicyId.APP_KEY_REQUEST_POLICY, appKeyRequestsPolicy);

        if (status !== SLStatus.OK) {
            throw new Error(
                `[INIT TC] Failed to set EzspPolicyId APP_KEY_REQUEST_POLICY to ${EzspDecisionId[appKeyRequestsPolicy]} with status=${SLStatus[status]}.`,
            );
        }

        status = await this.emberSetJoinPolicy(EmberJoinDecision.USE_PRECONFIGURED_KEY);

        if (status !== SLStatus.OK) {
            throw new Error(`[INIT TC] Failed to set join policy to USE_PRECONFIGURED_KEY with status=${SLStatus[status]}.`);
        }
    }

    /**
     * Form a network using given parameters.
     */
    private async formNetworkInternal(
        fromBackup: boolean,
        networkKey: Buffer,
        networkKeySequenceNumber: number,
        networkKeyFrameCounter: number,
        panId: PanId,
        extendedPanId: ExtendedPanId,
        radioChannel: number,
        tcLinkKey: Buffer,
    ): Promise<void> {
        const state: EmberInitialSecurityState = {
            bitmask:
                EmberInitialSecurityBitmask.TRUST_CENTER_GLOBAL_LINK_KEY |
                EmberInitialSecurityBitmask.HAVE_PRECONFIGURED_KEY |
                EmberInitialSecurityBitmask.HAVE_NETWORK_KEY |
                EmberInitialSecurityBitmask.TRUST_CENTER_USES_HASHED_LINK_KEY |
                EmberInitialSecurityBitmask.REQUIRE_ENCRYPTED_KEY,
            preconfiguredKey: {contents: tcLinkKey},
            networkKey: {contents: networkKey},
            networkKeySequenceNumber: networkKeySequenceNumber,
            preconfiguredTrustCenterEui64: ZSpec.BLANK_EUI64,
        };

        if (fromBackup) {
            state.bitmask |= EmberInitialSecurityBitmask.NO_FRAME_COUNTER_RESET;

            const status = await this.ezsp.ezspSetNWKFrameCounter(networkKeyFrameCounter);

            if (status !== SLStatus.OK) {
                throw new Error(`[INIT FORM] Failed to set NWK frame counter with status=${SLStatus[status]}.`);
            }

            // status = await this.ezsp.ezspSetAPSFrameCounter(tcLinkKeyFrameCounter);

            // if (status !== SLStatus.OK) {
            //     throw new Error(`[INIT FORM] Failed to set TC APS frame counter with status=${SLStatus[status]}.`);
            // }
        }

        let status = await this.ezsp.ezspSetInitialSecurityState(state);

        if (status !== SLStatus.OK) {
            throw new Error(`[INIT FORM] Failed to set initial security state with status=${SLStatus[status]}.`);
        }

        const extended: EmberExtendedSecurityBitmask =
            EmberExtendedSecurityBitmask.JOINER_GLOBAL_LINK_KEY | EmberExtendedSecurityBitmask.NWK_LEAVE_REQUEST_NOT_ALLOWED;
        status = await this.ezsp.ezspSetExtendedSecurityBitmask(extended);

        if (status !== SLStatus.OK) {
            throw new Error(`[INIT FORM] Failed to set extended security bitmask to ${extended} with status=${SLStatus[status]}.`);
        }

        if (!fromBackup) {
            status = await this.ezsp.ezspClearKeyTable();

            if (status !== SLStatus.OK) {
                logger.error(`[INIT FORM] Failed to clear key table with status=${SLStatus[status]}.`, NS);
            }
        }

        const netParams: EmberNetworkParameters = {
            panId,
            extendedPanId,
            radioTxPower: this.adapterOptions.transmitPower || 5,
            radioChannel,
            joinMethod: EmberJoinMethod.MAC_ASSOCIATION,
            nwkManagerId: ZSpec.COORDINATOR_ADDRESS,
            nwkUpdateId: 0,
            channels: ZSpec.ALL_802_15_4_CHANNELS_MASK,
        };

        logger.info(() => `[INIT FORM] Forming new network with: ${JSON.stringify(netParams)}`, NS);

        status = await this.ezsp.ezspFormNetwork(netParams);

        if (status !== SLStatus.OK) {
            throw new Error(`[INIT FORM] Failed form network request with status=${SLStatus[status]}.`);
        }

        await this.oneWaitress.startWaitingForEvent(
            {eventName: OneWaitressEvents.STACK_STATUS_NETWORK_UP},
            DEFAULT_NETWORK_REQUEST_TIMEOUT,
            '[INIT FORM] Form network',
        );

        status = await this.ezsp.ezspStartWritingStackTokens();

        logger.debug(`[INIT FORM] Start writing stack tokens status=${SLStatus[status]}.`, NS);
        logger.info(`[INIT FORM] New network formed!`, NS);
    }

    /**
     * Export link keys for backup.
     *
     * @return List of keys data with AES hashed keys
     */
    public async exportLinkKeys(): Promise<LinkKeyBackupData[]> {
        const [confStatus, keyTableSize] = await this.ezsp.ezspGetConfigurationValue(EzspConfigId.KEY_TABLE_SIZE);

        if (confStatus !== SLStatus.OK) {
            throw new Error(`[BACKUP] Failed to retrieve key table size from NCP with status=${SLStatus[confStatus]}.`);
        }

        let context: SecManContext;
        let plaintextKey: SecManKey;
        let apsKeyMeta: SecManAPSKeyMetadata;
        let status: SLStatus;
        const keyList: LinkKeyBackupData[] = [];

        for (let i = 0; i < keyTableSize; i++) {
            [status, context, plaintextKey, apsKeyMeta] = await this.ezsp.ezspExportLinkKeyByIndex(i);
            logger.debug(`[BACKUP] Export link key at index ${i}, status=${SLStatus[status]}.`, NS);

            // only include key if we could retrieve one at index and hash it properly
            if (status === SLStatus.OK) {
                // Rather than give the real link key, the backup contains a hashed version of the key.
                // This is done to prevent a compromise of the backup data from compromising the current link keys.
                // This is per the Smart Energy spec.
                const hashedKey = ZSpec.Utils.aes128MmoHash(plaintextKey.contents);

                keyList.push({
                    deviceEui64: context.eui64,
                    key: {contents: hashedKey},
                    outgoingFrameCounter: apsKeyMeta.outgoingFrameCounter,
                    incomingFrameCounter: apsKeyMeta.incomingFrameCounter,
                });
            }
        }

        logger.info(`[BACKUP] Retrieved ${keyList.length} link keys.`, NS);

        return keyList;
    }

    /**
     * Import link keys from backup.
     *
     * @param backupData
     */
    public async importLinkKeys(backupData: LinkKeyBackupData[]): Promise<void> {
        if (!backupData?.length) {
            return;
        }

        const [confStatus, keyTableSize] = await this.ezsp.ezspGetConfigurationValue(EzspConfigId.KEY_TABLE_SIZE);

        if (confStatus !== SLStatus.OK) {
            throw new Error(`[BACKUP] Failed to retrieve key table size from NCP with status=${SLStatus[confStatus]}.`);
        }

        if (backupData.length > keyTableSize) {
            throw new Error(`[BACKUP] Current key table of ${keyTableSize} is too small to import backup of ${backupData.length}!`);
        }

        const networkStatus = await this.ezsp.ezspNetworkState();

        if (networkStatus !== EmberNetworkStatus.NO_NETWORK) {
            throw new Error(`[BACKUP] Cannot import TC data while network is up, networkStatus=${EmberNetworkStatus[networkStatus]}.`);
        }

        let status: SLStatus;

        for (let i = 0; i < keyTableSize; i++) {
            // erase any key index not present in backup but available on the NCP
            status =
                i >= backupData.length
                    ? await this.ezsp.ezspEraseKeyTableEntry(i)
                    : await this.ezsp.ezspImportLinkKey(i, backupData[i].deviceEui64, backupData[i].key);

            if (status !== SLStatus.OK) {
                throw new Error(
                    `[BACKUP] Failed to ${i >= backupData.length ? 'erase' : 'set'} key table entry at index ${i} with status=${SLStatus[status]}.`,
                );
            }
        }

        logger.info(`[BACKUP] Imported ${backupData.length} keys.`, NS);
    }

    /**
     * Routine to update the network key and broadcast the update to the network after a set time.
     * NOTE: This should run at a large interval, but before the uint32_t of the frame counter is able to reach all Fs (can't wrap to 0).
     *       This may disrupt sleepy end devices that miss the update, but they should be able to TC rejoin (in most cases...).
     *       On the other hand, the more often this runs, the more secure the network is...
     */
    public async broadcastNetworkKeyUpdate(): Promise<void> {
        return await this.queue.execute<void>(async () => {
            logger.warning(`[TRUST CENTER] Performing a network key update. This might take a while and disrupt normal operation.`, NS);

            // zero-filled = let stack generate new random network key
            let status = await this.ezsp.ezspBroadcastNextNetworkKey({contents: Buffer.alloc(EMBER_ENCRYPTION_KEY_SIZE)});

            if (status !== SLStatus.OK) {
                throw new Error(`[TRUST CENTER] Failed to broadcast next network key with status=${SLStatus[status]}.`);
            }

            // XXX: this will block other requests for a while, but should ensure the key propagates without interference?
            //      could also stop dispatching entirely and do this outside the queue if necessary/better
            await wait(BROADCAST_NETWORK_KEY_SWITCH_WAIT_TIME);

            status = await this.ezsp.ezspBroadcastNetworkKeySwitch();

            if (status !== SLStatus.OK) {
                // XXX: Not sure how likely this is, but this is bad, probably should hard fail?
                throw new Error(`[TRUST CENTER] Failed to broadcast network key switch with status=${SLStatus[status]}.`);
            }
        });
    }

    /**
     * Received when EZSP layer alerts of a problem that needs the NCP to be reset.
     * @param status
     */
    private async onNcpNeedsResetAndInit(status: EzspStatus): Promise<void> {
        logger.error(`Adapter fatal error: ${EzspStatus[status]}`, NS);
        this.emit('disconnected');
    }

    //---- START Events

    //---- END Events

    //---- START Cache-enabled EZSP wrappers

    /**
     * Clear the cached network values (set to invalid values).
     */
    public clearNetworkCache(): void {
        this.networkCache = initNetworkCache();
    }

    /**
     * Return the EUI 64 of the local node
     * This call caches the results on the host to prevent frequent EZSP transactions.
     * Check against BLANK_EUI64 for validity.
     */
    public async emberGetEui64(): Promise<EUI64> {
        if (this.networkCache.eui64 === ZSpec.BLANK_EUI64) {
            this.networkCache.eui64 = await this.ezsp.ezspGetEui64();
        }

        return this.networkCache.eui64;
    }

    /**
     * Return the PAN ID of the local node.
     * This call caches the results on the host to prevent frequent EZSP transactions.
     * Check against INVALID_PAN_ID for validity.
     */
    public async emberGetPanId(): Promise<PanId> {
        if (this.networkCache.parameters.panId === ZSpec.INVALID_PAN_ID) {
            const [status, , parameters] = await this.ezsp.ezspGetNetworkParameters();

            if (status === SLStatus.OK) {
                this.networkCache.parameters = parameters;
            } else {
                throw new Error(`Failed to get PAN ID (via network parameters) with status=${SLStatus[status]}.`);
            }
        }

        return this.networkCache.parameters.panId;
    }

    /**
     * Return the Extended PAN ID of the local node.
     * This call caches the results on the host to prevent frequent EZSP transactions.
     * Check against BLANK_EXTENDED_PAN_ID for validity.
     */
    public async emberGetExtendedPanId(): Promise<ExtendedPanId> {
        if (equals(this.networkCache.parameters.extendedPanId, ZSpec.BLANK_EXTENDED_PAN_ID)) {
            const [status, , parameters] = await this.ezsp.ezspGetNetworkParameters();

            if (status === SLStatus.OK) {
                this.networkCache.parameters = parameters;
            } else {
                throw new Error(`Failed to get Extended PAN ID (via network parameters) with status=${SLStatus[status]}.`);
            }
        }

        return this.networkCache.parameters.extendedPanId;
    }

    /**
     * Return the radio channel (uint8_t) of the current network.
     * This call caches the results on the host to prevent frequent EZSP transactions.
     * Check against INVALID_RADIO_CHANNEL for validity.
     */
    public async emberGetRadioChannel(): Promise<number> {
        if (this.networkCache.parameters.radioChannel === INVALID_RADIO_CHANNEL) {
            const [status, , parameters] = await this.ezsp.ezspGetNetworkParameters();

            if (status === SLStatus.OK) {
                this.networkCache.parameters = parameters;
            } else {
                throw new Error(`Failed to get radio channel (via network parameters) with status=${SLStatus[status]}.`);
            }
        }

        return this.networkCache.parameters.radioChannel;
    }

    //---- END Cache-enabled EZSP wrappers

    //---- START EZSP wrappers

    /**
     * Ensure the Host & NCP are aligned on protocols using version.
     * Cache the retrieved information.
     *
     * NOTE: currently throws on mismatch until support for lower versions is implemented (not planned atm)
     *
     * Does nothing if ncpNeedsResetAndInit == true.
     */
    private async emberVersion(): Promise<void> {
        // send the Host version number to the NCP.
        // The NCP returns the EZSP version that the NCP is running along with the stackType and stackVersion
        let [ncpEzspProtocolVer, ncpStackType, ncpStackVer] = await this.ezsp.ezspVersion(EZSP_PROTOCOL_VERSION);

        // verify that the stack type is what is expected
        if (ncpStackType !== EZSP_STACK_TYPE_MESH) {
            throw new Error(`Stack type ${ncpStackType} is not expected!`);
        }

        if (ncpEzspProtocolVer === EZSP_PROTOCOL_VERSION) {
            logger.debug(`Adapter EZSP protocol version (${ncpEzspProtocolVer}) matches Host.`, NS);
        } else if (ncpEzspProtocolVer < EZSP_PROTOCOL_VERSION && ncpEzspProtocolVer >= EZSP_MIN_PROTOCOL_VERSION) {
            [ncpEzspProtocolVer, ncpStackType, ncpStackVer] = await this.ezsp.ezspVersion(ncpEzspProtocolVer);

            logger.info(`Adapter EZSP protocol version (${ncpEzspProtocolVer}) lower than Host. Switched.`, NS);
        } else {
            throw new Error(
                `Adapter EZSP protocol version (${ncpEzspProtocolVer}) is not supported by Host [${EZSP_MIN_PROTOCOL_VERSION}-${EZSP_PROTOCOL_VERSION}].`,
            );
        }

        this.ezsp.setProtocolVersion(ncpEzspProtocolVer);
        logger.debug(`Adapter info: EZSPVersion=${ncpEzspProtocolVer} StackType=${ncpStackType} StackVersion=${ncpStackVer}`, NS);

        const [status, versionStruct] = await this.ezsp.ezspGetVersionStruct();

        if (status !== SLStatus.OK) {
            // Should never happen with support of only EZSP v13+
            throw new Error(`NCP has old-style version number. Not supported.`);
        }

        this.version = {
            ezsp: ncpEzspProtocolVer,
            revision: `${versionStruct.major}.${versionStruct.minor}.${versionStruct.patch} [${EmberVersionType[versionStruct.type]}]`,
            ...versionStruct,
        };

        if (versionStruct.type !== EmberVersionType.GA) {
            logger.warning(`Adapter is running a non-GA version (${EmberVersionType[versionStruct.type]}).`, NS);
        }

        logger.info(() => `Adapter version info: ${JSON.stringify(this.version)}`, NS);
    }

    /**
     * This function sets an EZSP config value.
     * WARNING: Do not call for values that cannot be set after init without first resetting NCP (like table sizes).
     *          To avoid an extra NCP call, this does not check for it.
     * @param configId
     * @param value uint16_t
     * @returns
     */
    private async emberSetEzspConfigValue(configId: EzspConfigId, value: number): Promise<SLStatus> {
        const status = await this.ezsp.ezspSetConfigurationValue(configId, value);

        logger.debug(`[EzspConfigId] SET '${EzspConfigId[configId]}' TO '${value}' with status=${SLStatus[status]}.`, NS);

        if (status !== SLStatus.OK) {
            logger.info(
                `[EzspConfigId] Failed to SET '${EzspConfigId[configId]}' TO '${value}' with status=${SLStatus[status]}. Firmware value will be used instead.`,
                NS,
            );
        }

        return status;
    }

    /**
     * This function sets an EZSP value.
     * @param valueId
     * @param valueLength uint8_t
     * @param value uint8_t *
     * @returns
     */
    private async emberSetEzspValue(valueId: EzspValueId, valueLength: number, value: number[]): Promise<SLStatus> {
        const status = await this.ezsp.ezspSetValue(valueId, valueLength, value);

        logger.debug(`[EzspValueId] SET '${EzspValueId[valueId]}' TO '${value}' with status=${SLStatus[status]}.`, NS);

        return status;
    }

    /**
     * This function sets an EZSP policy.
     * @param policyId
     * @param decisionId Can be bitop
     * @returns
     */
    private async emberSetEzspPolicy(policyId: EzspPolicyId, decisionId: number): Promise<SLStatus> {
        const status = await this.ezsp.ezspSetPolicy(policyId, decisionId);

        logger.debug(`[EzspPolicyId] SET '${EzspPolicyId[policyId]}' TO '${decisionId}' with status=${SLStatus[status]}.`, NS);

        return status;
    }

    /**
     * Set the trust center policy bitmask using decision.
     * @param decision
     * @returns
     */
    private async emberSetJoinPolicy(decision: EmberJoinDecision): Promise<SLStatus> {
        let policy: number = EzspDecisionBitmask.DEFAULT_CONFIGURATION;

        switch (decision) {
            case EmberJoinDecision.USE_PRECONFIGURED_KEY: {
                policy = EzspDecisionBitmask.ALLOW_JOINS | EzspDecisionBitmask.ALLOW_UNSECURED_REJOINS;
                break;
            }
            case EmberJoinDecision.ALLOW_REJOINS_ONLY: {
                policy = EzspDecisionBitmask.ALLOW_UNSECURED_REJOINS;
                break;
            }
            /*case EmberJoinDecision.SEND_KEY_IN_THE_CLEAR: {
                policy = EzspDecisionBitmask.ALLOW_JOINS | EzspDecisionBitmask.ALLOW_UNSECURED_REJOINS | EzspDecisionBitmask.SEND_KEY_IN_CLEAR;
                break;
            }*/
        }

        return await this.emberSetEzspPolicy(EzspPolicyId.TRUST_CENTER_POLICY, policy);
    }

    //---- END EZSP wrappers

    //---- START Ember ZDO

    /**
     * ZDO
     * Get the next device request sequence number.
     *
     * Requests have sequence numbers so that they can be matched up with the
     * responses. To avoid complexities, the library uses numbers with the high
     * bit clear and the stack uses numbers with the high bit set.
     *
     * @return uint8_t The next device request sequence number
     */
    private nextZDORequestSequence(): number {
        return (this.zdoRequestSequence = ++this.zdoRequestSequence & APPLICATION_ZDO_SEQUENCE_MASK);
    }

    //---- END Ember ZDO

    //-- START Adapter implementation

    public async start(): Promise<TsType.StartResult> {
        logger.info(`======== Ember Adapter Starting ========`, NS);
        const result = await this.initEzsp();

        return result;
    }

    public async stop(): Promise<void> {
        clearInterval(this.watchdogCountersHandle);
        await this.ezsp.stop();
        this.ezsp.removeAllListeners();

        logger.info(`======== Ember Adapter Stopped ========`, NS);
    }

    /**
     * Check the network status on the adapter (execute the necessary pre-steps to be able to get it).
     * WARNING: This is a one-off. Should not be called outside of `initNetwork`.
     */
    protected async initHasNetwork(): Promise<[true, panID: number, extendedPanID: Buffer] | [false, panID: undefined, extendedPanID: undefined]> {
        const networkInitStruct: EmberNetworkInitStruct = {
            bitmask: EmberNetworkInitBitmask.PARENT_INFO_IN_TOKEN | EmberNetworkInitBitmask.END_DEVICE_REJOIN_ON_REBOOT,
        };
        const initStatus = await this.ezsp.ezspNetworkInit(networkInitStruct);

        logger.debug(`Network init status=${SLStatus[initStatus]}.`, NS);

        if (initStatus !== SLStatus.OK && initStatus !== SLStatus.NOT_JOINED) {
            throw new Error(`Failed network init request with status=${SLStatus[initStatus]}.`);
        }

        if (initStatus === SLStatus.OK) {
            await this.oneWaitress.startWaitingForEvent(
                {eventName: OneWaitressEvents.STACK_STATUS_NETWORK_UP},
                DEFAULT_NETWORK_REQUEST_TIMEOUT,
                'Network init',
            );

            const [npStatus, nodeType, netParams] = await this.ezsp.ezspGetNetworkParameters();

            if (npStatus !== SLStatus.OK) {
                throw new Error(`Failed to get network parameters with status=${SLStatus[npStatus]}.`);
            }

            logger.debug(() => `Current adapter network: nodeType=${EmberNodeType[nodeType]} params=${JSON.stringify(netParams)}`, NS);

            // force forming in case current network is `ROUTER` type
            if (nodeType !== EmberNodeType.COORDINATOR) {
                return [false, undefined, undefined];
            }

            return [true, netParams.panId, Buffer.from(netParams.extendedPanId)];
        }

        return [false, undefined, undefined];
    }

    public async leaveNetwork(): Promise<void> {
        const leaveStatus = await this.ezsp.ezspLeaveNetwork();

        if (leaveStatus !== SLStatus.OK) {
            throw new Error(`Failed leave network request with status=${SLStatus[leaveStatus]}.`);
        }

        await this.oneWaitress.startWaitingForEvent(
            {eventName: OneWaitressEvents.STACK_STATUS_NETWORK_DOWN},
            DEFAULT_NETWORK_REQUEST_TIMEOUT,
            'Leave network',
        );

        await wait(200); // settle down
    }

    public async formNetwork(backup?: Backup): Promise<void> {
        if (backup) {
            logger.info(`[INIT FORM] Forming from backup.`, NS);
            // `backup` valid in this `action` path (not detected by TS)
            /* v8 ignore start */
            const keyList: LinkKeyBackupData[] = backup!.devices.map((device) => ({
                deviceEui64: ZSpec.Utils.eui64BEBufferToHex(device.ieeeAddress),
                key: {contents: device.linkKey!.key},
                outgoingFrameCounter: device.linkKey!.txCounter,
                incomingFrameCounter: device.linkKey!.rxCounter,
            }));
            /* v8 ignore stop */

            // before forming
            await this.importLinkKeys(keyList);

            await this.formNetworkInternal(
                true /*from backup*/,
                backup.networkOptions.networkKey,
                backup.networkKeyInfo.sequenceNumber,
                backup.networkKeyInfo.frameCounter,
                backup.networkOptions.panId,
                Array.from(backup.networkOptions.extendedPanId),
                backup.logicalChannel,
                backup.ezsp!.hashed_tclk!, // valid from checkBackup
            );
        } else {
            logger.info(`[INIT FORM] Forming from config.`, NS);
            await this.formNetworkInternal(
                false /*from config*/,
                Buffer.from(this.networkOptions.networkKey),
                0,
                0,
                this.networkOptions.panID,
                this.networkOptions.extendedPanID,
                this.networkOptions.channelList[0],
                randomBytes(EMBER_ENCRYPTION_KEY_SIZE), // rnd TC link key
            );
        }
    }

    public async getNetworkKey(): Promise<Buffer> {
        // config matches adapter so far, no error, we can check the network key
        const context = initSecurityManagerContext();
        context.coreKeyType = SecManKeyType.NETWORK;
        context.keyIndex = 0;
        const [nkStatus, networkKey] = await this.ezsp.ezspExportKey(context);

        if (nkStatus !== SLStatus.OK) {
            throw new Error(`Failed to export Network Key with status=${SLStatus[nkStatus]}.`);
        }

        return networkKey.contents;
    }

    public async getCoordinatorIEEE(): Promise<string> {
        return await this.queue.execute(async () => {
            this.checkInterpanLock();

            // in all likelihood this will be retrieved from cache
            return await this.emberGetEui64();
        });
    }

    public async getCoordinatorVersion(): Promise<TsType.CoordinatorVersion> {
        return {type: `EmberZNet`, meta: this.version};
    }

    // queued
    public async reset(type: 'soft' | 'hard'): Promise<void> {
        throw new Error(`Not supported '${type}'.`);
        // NOTE: although this function is legacy atm, a couple of new untested EZSP functions that could also prove useful:
        // this.ezsp.ezspTokenFactoryReset(true/*excludeOutgoingFC*/, true/*excludeBootCounter*/);
        // this.ezsp.ezspResetNode()
    }

    public async supportsBackup(): Promise<boolean> {
        return true;
    }

    public checkBackup(backup: Backup): void {
        if (!backup.ezsp?.hashed_tclk) {
            throw new Error(`[BACKUP] Current backup file is not for EmberZNet stack.`);
        }
    }

    // queued
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async backup(ieeeAddressesInDatabase: string[]): Promise<Backup> {
        return await this.queue.execute<Backup>(async () => {
            // grab fresh version here, bypass cache
            const [netStatus, , netParams] = await this.ezsp.ezspGetNetworkParameters();

            if (netStatus !== SLStatus.OK) {
                throw new Error(`[BACKUP] Failed to get network parameters with status=${SLStatus[netStatus]}.`);
            }

            // update cache
            this.networkCache.parameters = netParams;
            this.networkCache.eui64 = await this.ezsp.ezspGetEui64();

            const [netKeyStatus, netKeyInfo] = await this.ezsp.ezspGetNetworkKeyInfo();

            if (netKeyStatus !== SLStatus.OK) {
                throw new Error(`[BACKUP] Failed to get network keys info with status=${SLStatus[netKeyStatus]}.`);
            }

            if (!netKeyInfo.networkKeySet) {
                throw new Error(`[BACKUP] No network key set.`);
            }

            /* v8 ignore next */
            const keyList: LinkKeyBackupData[] = ALLOW_APP_KEY_REQUESTS ? await this.exportLinkKeys() : [];

            let context: SecManContext = initSecurityManagerContext();
            context.coreKeyType = SecManKeyType.TC_LINK;
            const [tclkStatus, tcLinkKey] = await this.ezsp.ezspExportKey(context);

            if (tclkStatus !== SLStatus.OK) {
                throw new Error(`[BACKUP] Failed to export TC Link Key with status=${SLStatus[tclkStatus]}.`);
            }

            // const [tcKeyStatus, tcKeyInfo] = await this.ezsp.ezspGetApsKeyInfo(context);

            // if (tcKeyStatus !== SLStatus.OK) {
            //     throw new Error(`[BACKUP] Failed to get TC APS key info with status=${SLStatus[tcKeyStatus]}.`);
            // }

            context = initSecurityManagerContext(); // make sure it's back to zeroes
            context.coreKeyType = SecManKeyType.NETWORK;
            context.keyIndex = 0;
            const [nkStatus, networkKey] = await this.ezsp.ezspExportKey(context);

            if (nkStatus !== SLStatus.OK) {
                throw new Error(`[BACKUP] Failed to export Network Key with status=${SLStatus[nkStatus]}.`);
            }

            return {
                networkOptions: {
                    panId: netParams.panId, // uint16_t
                    extendedPanId: Buffer.from(netParams.extendedPanId),
                    channelList: ZSpec.Utils.uint32MaskToChannels(netParams.channels),
                    networkKey: networkKey.contents,
                    networkKeyDistribute: false,
                },
                logicalChannel: netParams.radioChannel,
                networkKeyInfo: {
                    sequenceNumber: netKeyInfo.networkKeySequenceNumber,
                    frameCounter: netKeyInfo.networkKeyFrameCounter,
                },
                // tcLinkKeyInfo: {
                //     incomingFrameCounter: tcKeyInfo.bitmask & EmberKeyStructBitmask.HAS_INCOMING_FRAME_COUNTER ? tcKeyInfo.incomingFrameCounter : 0,
                //     outgoingFrameCounter: tcKeyInfo.bitmask & EmberKeyStructBitmask.HAS_OUTGOING_FRAME_COUNTER ? tcKeyInfo.outgoingFrameCounter : 0,
                // },
                securityLevel: SECURITY_LEVEL_Z3,
                networkUpdateId: netParams.nwkUpdateId,
                coordinatorIeeeAddress: Buffer.from(this.networkCache.eui64.substring(2) /*take out 0x*/, 'hex').reverse(),
                devices: keyList.map(
                    /* v8 ignore start */
                    (key) => ({
                        networkAddress: null, // not used for restore, no reason to make NCP calls for nothing
                        ieeeAddress: Buffer.from(key.deviceEui64.substring(2) /*take out 0x*/, 'hex').reverse(),
                        isDirectChild: false, // not used
                        linkKey: {
                            key: key.key.contents,
                            rxCounter: key.incomingFrameCounter,
                            txCounter: key.outgoingFrameCounter,
                        },
                    }),
                    /* v8 ignore stop */
                ),
                ezsp: {
                    version: this.version.ezsp,
                    hashed_tclk: tcLinkKey.contents,
                    // tokens: tokensBuf.toString('hex'),
                    // altNetworkKey: altNetworkKey.contents,
                },
            };
        });
    }

    // queued, non-InterPAN
    public async getNetworkParameters(): Promise<TsType.NetworkParameters> {
        return await this.queue.execute<TsType.NetworkParameters>(async () => {
            this.checkInterpanLock();

            // first call will cache for the others, but in all likelihood, it will all be from freshly cached after init
            // since Controller caches this also.
            const channel = await this.emberGetRadioChannel();
            const panID = await this.emberGetPanId();
            const extendedPanID = await this.emberGetExtendedPanId();

            return {
                panID,
                extendedPanID: ZSpec.Utils.eui64LEBufferToHex(Buffer.from(extendedPanID)),
                channel,
            };
        });
    }

    // queued
    public async addInstallCode(ieeeAddress: string, key: Buffer): Promise<void> {
        return await this.queue.execute<void>(async () => {
            // Add the key to the transient key table.
            // This will be used while the DUT joins.
            const impStatus = await this.ezsp.ezspImportTransientKey(ieeeAddress as EUI64, {contents: ZSpec.Utils.aes128MmoHash(key)});

            if (impStatus == SLStatus.OK) {
                logger.debug(`[ADD INSTALL CODE] Success for '${ieeeAddress}'.`, NS);
            } else {
                throw new Error(`[ADD INSTALL CODE] Failed for '${ieeeAddress}' with status=${SLStatus[impStatus]}.`);
            }
        });
    }

    /** WARNING: Adapter impl. Starts timer immediately upon returning */
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
        const sourceEndpointInfo = FIXED_ENDPOINTS[0];
        const waiter = this.oneWaitress.waitFor<ZclPayload>(
            {
                target: networkAddress,
                apsFrame: {
                    clusterId: clusterID,
                    profileId: sourceEndpointInfo.profileId, // XXX: only used by OTA upstream
                    sequence: 0, // set by stack
                    sourceEndpoint: sourceEndpointInfo.endpoint,
                    destinationEndpoint: endpoint,
                    groupId: 0,
                    options: EmberApsOption.NONE,
                },
                zclSequence: transactionSequenceNumber,
                commandIdentifier,
            },
            timeout,
        );

        return {
            cancel: (): void => this.oneWaitress.remove(waiter.id),
            promise: waiter.start().promise,
        };
    }

    //---- ZDO

    // queued, non-InterPAN
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
            const messageTag = this.nextZDORequestSequence();
            payload[0] = messageTag;
            const apsFrame: EmberApsFrame = {
                profileId: Zdo.ZDO_PROFILE_ID,
                clusterId,
                sourceEndpoint: Zdo.ZDO_ENDPOINT,
                destinationEndpoint: Zdo.ZDO_ENDPOINT,
                options: DEFAULT_APS_OPTIONS,
                groupId: 0,
                sequence: 0, // set by stack
            };
            let status: SLStatus | undefined;
            let apsSequence: number | undefined;

            if (ZSpec.Utils.isBroadcastAddress(networkAddress)) {
                logger.debug(
                    () => `~~~> [ZDO ${clusterName} BROADCAST to=${networkAddress} messageTag=${messageTag} payload=${payload.toString('hex')}]`,
                    NS,
                );

                [status, apsSequence] = await this.ezsp.ezspSendBroadcast(
                    ZSpec.NULL_NODE_ID, // alias
                    networkAddress,
                    0, // nwkSequence
                    apsFrame,
                    ZDO_REQUEST_RADIUS,
                    messageTag,
                    payload,
                );

                apsFrame.sequence = apsSequence;

                logger.debug(`~~~> [SENT ZDO BROADCAST messageTag=${messageTag} apsSequence=${apsSequence} status=${SLStatus[status]}]`, NS);

                if (status !== SLStatus.OK) {
                    throw new Error(
                        `~x~> [ZDO ${clusterName} BROADCAST to=${networkAddress} messageTag=${messageTag}] Failed to send request with status=${SLStatus[status]}.`,
                    );
                }
            } else {
                logger.debug(
                    () =>
                        `~~~> [ZDO ${clusterName} UNICAST to=${ieeeAddress}:${networkAddress} messageTag=${messageTag} payload=${payload.toString('hex')}]`,
                    NS,
                );

                [status, apsSequence] = await this.ezsp.ezspSendUnicast(
                    EmberOutgoingMessageType.DIRECT,
                    networkAddress,
                    apsFrame,
                    messageTag,
                    payload,
                );
                apsFrame.sequence = apsSequence;

                logger.debug(`~~~> [SENT ZDO UNICAST messageTag=${messageTag} apsSequence=${apsSequence} status=${SLStatus[status]}]`, NS);

                if (status !== SLStatus.OK) {
                    throw new Error(
                        `~x~> [ZDO ${clusterName} UNICAST to=${ieeeAddress}:${networkAddress} messageTag=${messageTag}] Failed to send request with status=${SLStatus[status]}.`,
                    );
                }
            }

            if (!disableResponse) {
                const responseClusterId = Zdo.Utils.getResponseClusterId(clusterId);

                if (responseClusterId) {
                    return await this.oneWaitress.startWaitingFor(
                        {
                            target: responseClusterId === Zdo.ClusterId.NETWORK_ADDRESS_RESPONSE ? (ieeeAddress as EUI64) : networkAddress,
                            apsFrame,
                            zdoResponseClusterId: responseClusterId,
                        },
                        DEFAULT_REQUEST_TIMEOUT,
                    );
                }
            }
        }, networkAddress);
    }

    // queued, non-InterPAN
    public async permitJoin(seconds: number, networkAddress?: number): Promise<void> {
        const clusterId = Zdo.ClusterId.PERMIT_JOINING_REQUEST;
        const preJoining = async (): Promise<void> => {
            if (seconds) {
                const plaintextKey: SecManKey = {contents: Buffer.from(ZIGBEE_PROFILE_INTEROPERABILITY_LINK_KEY)};
                const impKeyStatus = await this.ezsp.ezspImportTransientKey(ZSpec.BLANK_EUI64, plaintextKey);

                if (impKeyStatus !== SLStatus.OK) {
                    throw new Error(`[ZDO] Failed import transient key with status=${SLStatus[impKeyStatus]}.`);
                }

                const setJPstatus = await this.emberSetJoinPolicy(EmberJoinDecision.USE_PRECONFIGURED_KEY);

                if (setJPstatus !== SLStatus.OK) {
                    throw new Error(`[ZDO] Failed set join policy with status=${SLStatus[setJPstatus]}.`);
                }
            } else {
                if (this.manufacturerCode !== DEFAULT_MANUFACTURER_CODE) {
                    logger.debug(`[WORKAROUND] Reverting coordinator manufacturer code to default.`, NS);
                    await this.ezsp.ezspSetManufacturerCode(DEFAULT_MANUFACTURER_CODE);

                    this.manufacturerCode = DEFAULT_MANUFACTURER_CODE;
                }

                await this.ezsp.ezspClearTransientLinkKeys();

                const setJPstatus = await this.emberSetJoinPolicy(EmberJoinDecision.ALLOW_REJOINS_ONLY);

                if (setJPstatus !== SLStatus.OK) {
                    throw new Error(`[ZDO] Failed set join policy with status=${SLStatus[setJPstatus]}.`);
                }
            }
        };

        if (networkAddress) {
            // specific device that is not `Coordinator`
            await this.queue.execute<void>(async () => {
                this.checkInterpanLock();
                await preJoining();
            });

            // `authentication`: TC significance always 1 (zb specs)
            const zdoPayload = Zdo.Buffalo.buildRequest(this.hasZdoMessageOverhead, clusterId, seconds, 1, []);

            const result = await this.sendZdo(ZSpec.BLANK_EUI64, networkAddress, clusterId, zdoPayload, false);

            /* v8 ignore start */
            if (!Zdo.Buffalo.checkStatus(result)) {
                // TODO: will disappear once moved upstream
                throw new Zdo.StatusError(result[0]);
            }
            /* v8 ignore stop */
        } else {
            // coordinator-only (0), or all
            await this.queue.execute<void>(async () => {
                this.checkInterpanLock();
                await preJoining();
            });

            const status = await this.ezsp.ezspPermitJoining(seconds);

            if (status !== SLStatus.OK) {
                throw new Error(`[ZDO] Failed coordinator permit joining request with status=${SLStatus[status]}.`);
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

    //---- ZCL

    // queued, non-InterPAN
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
        const sourceEndpointInfo = (sourceEndpoint && FIXED_ENDPOINTS.find((epi) => epi.endpoint === sourceEndpoint)) || FIXED_ENDPOINTS[0];
        const command = zclFrame.command;
        let commandResponseId: number | undefined;

        if (command.response !== undefined && disableResponse === false) {
            commandResponseId = command.response;
        } else if (!zclFrame.header.frameControl.disableDefaultResponse) {
            commandResponseId = Zcl.Foundation.defaultRsp.ID;
        }

        const apsFrame: EmberApsFrame = {
            profileId: sourceEndpointInfo.profileId,
            clusterId: zclFrame.cluster.ID,
            sourceEndpoint: sourceEndpoint || FIXED_ENDPOINTS[0].endpoint,
            destinationEndpoint: endpoint,
            options: DEFAULT_APS_OPTIONS,
            groupId: 0,
            sequence: 0, // set by stack
        };

        // don't RETRY if no response expected
        if (commandResponseId === undefined) {
            apsFrame.options &= ~EmberApsOption.RETRY;
        }

        const data = zclFrame.toBuffer();

        return await this.queue.execute<ZclPayload | void>(async () => {
            this.checkInterpanLock();

            logger.debug(
                () => `~~~> [ZCL to=${ieeeAddr}:${networkAddress} apsFrame=${JSON.stringify(apsFrame)} header=${JSON.stringify(zclFrame.header)}]`,
                NS,
            );

            for (let i = 1; i <= QUEUE_MAX_SEND_ATTEMPTS; i++) {
                let status: SLStatus = SLStatus.FAIL;

                try {
                    [status] = await this.ezsp.send(
                        EmberOutgoingMessageType.DIRECT,
                        networkAddress,
                        apsFrame,
                        data,
                        0, // alias
                        0, // alias seq
                    );
                } catch (error) {
                    if (error instanceof EzspError) {
                        switch (error.code) {
                            case EzspStatus.NO_TX_SPACE: {
                                status = SLStatus.BUSY;
                                break;
                            }
                            case EzspStatus.NOT_CONNECTED: {
                                status = SLStatus.NETWORK_DOWN;
                                break;
                            }
                        }
                    }
                }

                // `else if` order matters
                if (status === SLStatus.OK) {
                    break;
                } else if (disableRecovery || i == QUEUE_MAX_SEND_ATTEMPTS) {
                    throw new Error(
                        `~x~> [ZCL to=${ieeeAddr}:${networkAddress} apsFrame=${JSON.stringify(apsFrame)}] Failed to send request with status=${SLStatus[status]}.`,
                    );
                } else if (status === SLStatus.ZIGBEE_MAX_MESSAGE_LIMIT_REACHED || status === SLStatus.BUSY) {
                    await wait(QUEUE_BUSY_DEFER_MSEC);
                } else if (status === SLStatus.NETWORK_DOWN) {
                    await wait(QUEUE_NETWORK_DOWN_DEFER_MSEC);
                } else {
                    throw new Error(
                        `~x~> [ZCL to=${ieeeAddr}:${networkAddress} apsFrame=${JSON.stringify(apsFrame)}] Failed to send request with status=${SLStatus[status]}.`,
                    );
                }

                logger.debug(
                    `~x~> [ZCL to=${ieeeAddr}:${networkAddress}] Failed to send request attempt ${i}/${QUEUE_MAX_SEND_ATTEMPTS} with status=${SLStatus[status]}.`,
                    NS,
                );
            }

            if (commandResponseId !== undefined) {
                // NOTE: aps sequence number will have been set by send function
                const result = await this.oneWaitress.startWaitingFor<ZclPayload>(
                    {
                        target: networkAddress,
                        apsFrame,
                        zclSequence: zclFrame.header.transactionSequenceNumber,
                        commandIdentifier: commandResponseId,
                    },
                    timeout,
                );

                return result;
            }
        }, networkAddress);
    }

    // queued, non-InterPAN
    public async sendZclFrameToGroup(groupID: number, zclFrame: Zcl.Frame, sourceEndpoint?: number): Promise<void> {
        const sourceEndpointInfo = (sourceEndpoint && FIXED_ENDPOINTS.find((epi) => epi.endpoint === sourceEndpoint)) || FIXED_ENDPOINTS[0];
        const apsFrame: EmberApsFrame = {
            profileId: sourceEndpointInfo.profileId,
            clusterId: zclFrame.cluster.ID,
            sourceEndpoint: sourceEndpoint || FIXED_ENDPOINTS[0].endpoint,
            destinationEndpoint: 0xff,
            options: DEFAULT_APS_OPTIONS,
            groupId: groupID,
            sequence: 0, // set by stack
        };
        const data = zclFrame.toBuffer();

        return await this.queue.execute<void>(async () => {
            this.checkInterpanLock();

            logger.debug(() => `~~~> [ZCL GROUP apsFrame=${JSON.stringify(apsFrame)} header=${JSON.stringify(zclFrame.header)}]`, NS);

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const [status, messageTag] = await this.ezsp.send(
                EmberOutgoingMessageType.MULTICAST,
                groupID, // not used with MULTICAST
                apsFrame,
                data,
                0, // alias
                0, // alias seq
            );

            if (status !== SLStatus.OK) {
                throw new Error(`~x~> [ZCL GROUP groupId=${groupID}] Failed to send with status=${SLStatus[status]}.`);
            }

            // NOTE: since ezspMessageSentHandler could take a while here, we don't block, it'll just be logged if the delivery failed
            await wait(QUEUE_BUSY_DEFER_MSEC);
        });
    }

    // queued, non-InterPAN
    public async sendZclFrameToAll(
        endpoint: number,
        zclFrame: Zcl.Frame,
        sourceEndpoint: number,
        destination: ZSpec.BroadcastAddress,
    ): Promise<void> {
        const sourceEndpointInfo = FIXED_ENDPOINTS.find((epi) => epi.endpoint === sourceEndpoint) ?? FIXED_ENDPOINTS[0];
        const apsFrame: EmberApsFrame = {
            profileId: sourceEndpointInfo.profileId,
            clusterId: zclFrame.cluster.ID,
            sourceEndpoint,
            destinationEndpoint: endpoint,
            options: DEFAULT_APS_OPTIONS,
            groupId: destination,
            sequence: 0, // set by stack
        };
        const data = zclFrame.toBuffer();

        return await this.queue.execute<void>(async () => {
            this.checkInterpanLock();

            logger.debug(() => `~~~> [ZCL BROADCAST apsFrame=${JSON.stringify(apsFrame)} header=${JSON.stringify(zclFrame.header)}]`, NS);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const [status, messageTag] = await this.ezsp.send(
                EmberOutgoingMessageType.BROADCAST,
                destination,
                apsFrame,
                data,
                0, // alias
                0, // alias seq
            );

            if (status !== SLStatus.OK) {
                throw new Error(`~x~> [ZCL BROADCAST destination=${destination}] Failed to send with status=${SLStatus[status]}.`);
            }

            // NOTE: since ezspMessageSentHandler could take a while here, we don't block, it'll just be logged if the delivery failed
            await wait(QUEUE_BUSY_DEFER_MSEC);
        });
    }

    //---- InterPAN for Touchlink
    // XXX: There might be a better way to handle touchlink with ZLL ezsp functions, but I don't have any device to test so, didn't look into it...
    // TODO: check all this touchlink/interpan stuff

    // queued
    public async setChannelInterPAN(channel: number): Promise<void> {
        return await this.queue.execute<void>(async () => {
            this.interpanLock = true;
            const status = await this.ezsp.ezspSetLogicalAndRadioChannel(channel);

            if (status !== SLStatus.OK) {
                this.interpanLock = false; // XXX: ok?
                throw new Error(`Failed to set InterPAN channel to '${channel}' with status=${SLStatus[status]}.`);
            }
        });
    }

    // queued
    public async sendZclFrameInterPANToIeeeAddr(zclFrame: Zcl.Frame, ieeeAddress: string): Promise<void> {
        return await this.queue.execute<void>(async () => {
            const msgBuffalo = new EzspBuffalo(Buffer.alloc(MAXIMUM_INTERPAN_LENGTH));

            // cache-enabled getters
            const sourcePanId = await this.emberGetPanId();
            const sourceEui64 = await this.emberGetEui64();

            msgBuffalo.writeUInt16(LONG_DEST_FRAME_CONTROL | MAC_ACK_REQUIRED); // macFrameControl
            msgBuffalo.writeUInt8(0); // sequence Skip Sequence number, stack sets the sequence number.
            msgBuffalo.writeUInt16(ZSpec.INVALID_PAN_ID); // destPanId
            msgBuffalo.writeIeeeAddr(ieeeAddress); // destAddress (longAddress)
            msgBuffalo.writeUInt16(sourcePanId); // sourcePanId
            msgBuffalo.writeIeeeAddr(sourceEui64); // sourceAddress
            msgBuffalo.writeUInt16(STUB_NWK_FRAME_CONTROL); // nwkFrameControl
            msgBuffalo.writeUInt8(EmberInterpanMessageType.UNICAST | INTERPAN_APS_FRAME_TYPE); // apsFrameControl
            msgBuffalo.writeUInt16(zclFrame.cluster.ID);
            msgBuffalo.writeUInt16(ZSpec.TOUCHLINK_PROFILE_ID);

            logger.debug(() => `~~~> [ZCL TOUCHLINK to=${ieeeAddress} header=${JSON.stringify(zclFrame.header)}]`, NS);
            const status = await this.ezsp.ezspSendRawMessage(
                Buffer.concat([msgBuffalo.getWritten(), zclFrame.toBuffer()]),
                EmberTransmitPriority.NORMAL,
                true,
            );

            if (status !== SLStatus.OK) {
                throw new Error(`~x~> [ZCL TOUCHLINK to=${ieeeAddress}] Failed to send with status=${SLStatus[status]}.`);
            }

            // NOTE: can use ezspRawTransmitCompleteHandler if needed here
        });
    }

    // queued
    public async sendZclFrameInterPANBroadcast(zclFrame: Zcl.Frame, timeout: number): Promise<ZclPayload> {
        const command = zclFrame.command;

        if (command.response === undefined) {
            throw new Error(`Command '${command.name}' has no response, cannot wait for response.`);
        }

        const endpoint = FIXED_ENDPOINTS[0].endpoint;
        // just for waitress
        const apsFrame: EmberApsFrame = {
            profileId: ZSpec.TOUCHLINK_PROFILE_ID,
            clusterId: zclFrame.cluster.ID,
            sourceEndpoint: endpoint, // arbitrary since not sent over-the-air
            destinationEndpoint: endpoint,
            options: EmberApsOption.NONE,
            groupId: ZSpec.BroadcastAddress.SLEEPY,
            sequence: 0, // set by stack
        };

        return await this.queue.execute<ZclPayload>(async () => {
            const msgBuffalo = new EzspBuffalo(Buffer.alloc(MAXIMUM_INTERPAN_LENGTH));

            // cache-enabled getters
            const sourcePanId = await this.emberGetPanId();
            const sourceEui64 = await this.emberGetEui64();

            msgBuffalo.writeUInt16(SHORT_DEST_FRAME_CONTROL); // macFrameControl
            msgBuffalo.writeUInt8(0); // sequence Skip Sequence number, stack sets the sequence number.
            msgBuffalo.writeUInt16(ZSpec.INVALID_PAN_ID); // destPanId
            msgBuffalo.writeUInt16(apsFrame.groupId); // destAddress (longAddress)
            msgBuffalo.writeUInt16(sourcePanId); // sourcePanId
            msgBuffalo.writeIeeeAddr(sourceEui64); // sourceAddress
            msgBuffalo.writeUInt16(STUB_NWK_FRAME_CONTROL); // nwkFrameControl
            msgBuffalo.writeUInt8(EmberInterpanMessageType.BROADCAST | INTERPAN_APS_FRAME_TYPE); // apsFrameControl
            msgBuffalo.writeUInt16(apsFrame.clusterId);
            msgBuffalo.writeUInt16(apsFrame.profileId);

            const data = Buffer.concat([msgBuffalo.getWritten(), zclFrame.toBuffer()]);

            logger.debug(() => `~~~> [ZCL TOUCHLINK BROADCAST header=${JSON.stringify(zclFrame.header)}]`, NS);
            const status = await this.ezsp.ezspSendRawMessage(data, EmberTransmitPriority.NORMAL, true);

            if (status !== SLStatus.OK) {
                throw new Error(`~x~> [ZCL TOUCHLINK BROADCAST] Failed to send with status=${SLStatus[status]}.`);
            }

            // NOTE: can use ezspRawTransmitCompleteHandler if needed here

            const result = await this.oneWaitress.startWaitingFor<ZclPayload>(
                {
                    target: undefined,
                    apsFrame: apsFrame,
                    zclSequence: zclFrame.header.transactionSequenceNumber,
                    commandIdentifier: command.response,
                },
                timeout,
            );

            return result;
        });
    }

    // queued
    public async restoreChannelInterPAN(): Promise<void> {
        return await this.queue.execute<void>(async () => {
            const status = await this.ezsp.ezspSetLogicalAndRadioChannel(this.networkOptions.channelList[0]);

            if (status !== SLStatus.OK) {
                throw new Error(`Failed to restore InterPAN channel to '${this.networkOptions.channelList[0]}' with status=${SLStatus[status]}.`);
            }

            // let adapter settle down
            await wait(QUEUE_NETWORK_DOWN_DEFER_MSEC);

            this.interpanLock = false;
        });
    }

    //-- END Adapter implementation

    private checkInterpanLock(): void {
        if (this.interpanLock) {
            throw new Error(`[INTERPAN MODE] Cannot execute non-InterPAN commands.`);
        }
    }
}

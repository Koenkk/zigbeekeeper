import {EUI64, ExtendedPanId, NodeId, PanId} from '../../zspec/tstypes';
import {
    EmberApsOption,
    EmberBindingType,
    EmberCurrentSecurityBitmask,
    EmberGpApplicationId,
    EmberGpProxyTableEntryStatus,
    EmberGpSinkTableEntryStatus,
    EmberGpSinkType,
    EmberJoinMethod,
    EmberKeyStructBitmask,
    EmberNetworkInitBitmask,
    EmberNodeType,
    EmberVersionType,
    EmberZllKeyIndex,
    EmberZllState,
    SecManDerivedKeyType,
    SecManFlag,
    SecManKeyType,
} from './enums';

/** 16-bit ZigBee multicast group identifier. uint16_t */
export type EmberMulticastId = number;
/**
 * The percent of duty cycle for a limit.
 *
 * Duty cycle, limits, and thresholds are reported in units of
 * percent * 100 (i.e., 10000 = 100.00%, 1 = 0.01%).
 * uint16_t
 */
export type EmberDutyCycleHectoPct = number;
/** Refer to the Zigbee application profile ID. uint16_t */
export type ProfileId = number;
/** Refer to the ZCL cluster ID. uint16_t */
export type ClusterId = number;

/** A version structure containing all version information. */
export type EmberVersion = {
    /**
     * A unique build number generated by Silicon Labs' internal build engineering process
     *
     * uint16_t
     */
    build: number;
    /**
     * Major version number
     * (used to indicate major architectural changes or significant supported platform changes).
     *
     * A.b.c.d
     * uint8_t
     */
    major: number;
    /**
     * Minor version number
     * (used to indicate significant new features, API changes; not always code-compatible with previous minor versions).
     *
     * a.B.c.d
     * uint8_t
     */
    minor: number;
    /**
     * Patch (sub-minor) version number
     * (used to indicate bug fixes or minor features that don't affect code-compatibility with previous application code).
     *
     * a.b.C.d
     * uint8_t
     */
    patch: number;
    /**
     * Special version number
     * (used to indicate superficial changes that don't require re-certification of the stack as a ZigBee-Compliant Platform,
     * such as changes that only affect installer packaging, documentation, or comments in the code)
     *
     * a.b.c.D
     * uint8_t
     */
    special: number;
    /**
     * Corresponding to an enum value from EmberVersionType.
     *
     * Pre-release, Alpha, Beta, GA
     */
    type: EmberVersionType;
};

/** Defines the network initialization configuration that should be used when ::emberNetworkInit() is called by the application. */
export type EmberNetworkInitStruct = {
    bitmask: EmberNetworkInitBitmask;
};

/**
 * Holds network parameters.
 *
 * For information about power settings and radio channels, see the technical specification for the RF communication module in your Developer Kit.
 */
export type EmberNetworkParameters = {
    /** The network's extended PAN identifier. int8_t[EXTENDED_PAN_ID_SIZE] */
    extendedPanId: ExtendedPanId;
    /** The network's PAN identifier. uint16_t*/
    panId: PanId;
    /** A power setting, in dBm. int8_t*/
    radioTxPower: number;
    /** A radio channel. Be sure to specify a channel supported by the radio. uint8_t */
    radioChannel: number;
    /**
     * Join method: The protocol messages used to establish an initial parent.
     * It is ignored when forming a ZigBee network, or when querying the stack for its network parameters.
     */
    joinMethod: EmberJoinMethod;
    /**
     * NWK Manager ID.  The ID of the network manager in the current network.
     * This may only be set at joining when using EMBER_USE_CONFIGURED_NWK_STATE as the join method.
     */
    nwkManagerId: NodeId;
    /**
     * An NWK Update ID.  The value of the ZigBee nwkUpdateId known by the stack.
     * It is used to determine the newest instance of the network after a PAN
     * ID or channel change.  This may only be set at joining when using
     * EMBER_USE_CONFIGURED_NWK_STATE as the join method.
     * uint8_t
     */
    nwkUpdateId: number;
    /**
     * The NWK channel mask. The list of preferred channels that the NWK manager
     * has told this device to use when searching for the network.
     * This may only be set at joining when using EMBER_USE_CONFIGURED_NWK_STATE as the join method.
     * uint32_t
     */
    channels: number;
};

/** Defines a beacon entry that is processed when scanning, joining, or rejoining. */
export type EmberBeaconData = {
    panId: PanId;
    sender: NodeId;
    /** uint8_t */
    channel: number;
    /** uint8_t */
    lqi: number;
    /** int8_t */
    rssi: number;
    /** uint8_t */
    depth: number;
    /** uint8_t */
    nwkUpdateId: number;
    /** Only valid if enhanced beacon. int8_t */
    power: number;
    /** TC connectivity and long uptime from capacity field. int8_t */
    parentPriority: number;
    /** uint8_t */
    supportedKeyNegotiationMethods: number;
    extended_beacon: boolean;
    /** Enhanced or regular beacon. default true */
    enhanced: boolean;
    /** default true */
    permitJoin: boolean;
    /** default true */
    hasCapacity: boolean;
    /** default true */
    tcConnectivity: boolean;
    /** default true */
    longUptime: boolean;
    /** default true */
    preferParent: boolean;
    /** default true */
    macDataPollKeepalive: boolean;
    /** default true */
    endDeviceKeepalive: boolean;
    /** uint8_t[EXTENDED_PAN_ID_SIZE] */
    extendedPanId: ExtendedPanId;
};

/**
 * Holds radio parameters.
 *
 * This is mainly useful for dual PHY and switched radio device (2.4 GHz or SubGHz) to retrieve radio parameters.
 */
export type EmberMultiPhyRadioParameters = {
    /** int8_t */
    radioTxPower: number;
    /** uint8_t */
    radioPage: number;
    /** uint8_t */
    radioChannel: number;
};

/** This structure contains information about child nodes. */
export type EmberChildData = {
    /**  */
    eui64: EUI64;
    /**  */
    type: EmberNodeType;
    /**  */
    id: NodeId;
    /** uint8_t */
    phy: number;
    /** uint8_t */
    power: number;
    /** uint8_t */
    timeout: number;
    /** uint32_t */
    remainingTimeout: number;
};

/**
 * Defines an entry in the neighbor table.
 *
 * A neighbor table entry stores information about the
 * reliability of RF links to and from neighboring nodes.
 */
export type EmberNeighborTableEntry = {
    /** The neighbor's two-byte network ID. uint16_t */
    shortId: number;
    /** Filtered Link Quality indicator. uint8_t */
    averageLqi: number;
    /**
     * The incoming cost for this neighbor, computed from the average LQI.
     * Values range from 1 for a good link to 7 for a bad link.
     * uint8_t
     */
    inCost: number;
    /** The outgoing cost for this neighbor, obtained from the most recently
     *  received neighbor exchange message from the neighbor.  A value of zero
     *  means that a neighbor exchange message from the neighbor has not been
     *  received recently enough, or that our ID was not present in the most
     *  recently received one.  EmberZNet Pro only.
     * uint8_t
     */
    outCost: number;
    /** In EmberZNet Pro, the number of aging periods elapsed since a neighbor
     *  exchange message was last received from this neighbor.  In stack profile 1,
     *  the number of aging periods since any packet was received.
     *  An entry with an age greater than 6 is considered stale and may be
     *  reclaimed. In case the entry is used by a routing table entry it is
     *  considered stale with an age of 8. The aging period is 16 seconds.
     *  On receiving an incoming packet from the neighbor, the age is set to 3.
     * uint8_t
     * */
    age: number;
    /** The 8 byte EUI64 of the neighbor. */
    longId: EUI64;
};

/**
 * Defines an entry in the route table.
 *
 * A route table entry stores information about the next
 * hop along the route to the destination.
 */
export type EmberRouteTableEntry = {
    /** The short ID of the destination. uint16_t */
    destination: number;
    /** The short ID of the next hop to this destination. uint16_t */
    nextHop: number;
    /** Indicates whether this entry is active (0), being discovered (1), or unused (3). uint8_t */
    status: number;
    /** The number of seconds since this route entry was last used to send a packet. uint8_t */
    age: number;
    /** Indicates whether this destination is a High-RAM Concentrator (2), a Low-RAM Concentrator (1), or not a concentrator (0). uint8_t */
    concentratorType: number;
    /**
     * For a High-RAM Concentrator, indicates whether a route record
     * is needed (2), has been sent (1), or is no long needed (0) because
     * a source routed message from the concentrator has been received.
     * uint8_t
     */
    routeRecordState: number;
};

/**
 * A structure containing duty cycle limit configurations.
 *
 * All limits are absolute and are required to be as follows: suspLimit > critThresh > limitThresh
 * For example:  suspLimit = 250 (2.5%), critThresh = 180 (1.8%), limitThresh 100 (1.00%).
 */
export type EmberDutyCycleLimits = {
    /** The Limited Threshold in % * 100. */
    limitThresh: EmberDutyCycleHectoPct;
    /** The Critical Threshold in % * 100. */
    critThresh: EmberDutyCycleHectoPct;
    /** The Suspended Limit (LBT) in % * 100. */
    suspLimit: EmberDutyCycleHectoPct;
};

/** A structure containing, per device, overall duty cycle consumed (up to the suspend limit). */
export type EmberPerDeviceDutyCycle = {
    /** Node ID of the device whose duty cycle is reported. */
    nodeId: NodeId;
    /** The amount of overall duty cycle consumed (up to suspend limit). */
    dutyCycleConsumed: EmberDutyCycleHectoPct;
};

/** Defines a iterator used to loop over cached beacons. Fields denoted with a private comment should not be written to. */
export type EmberBeaconIterator = {
    /** Public fields */
    beacon: EmberBeaconData;
    /** Private fields - Do not write to these variables. uint8_t */
    index: number;
};

/**
 * Defines an entry in the binding table.
 *
 * A binding entry specifies a local endpoint, a remote endpoint, a
 * cluster ID and either the destination EUI64 (for unicast bindings) or the
 * 64-bit group address (for multicast bindings).
 */
export type EmberBindingTableEntry = {
    /** The type of binding. */
    type: EmberBindingType;
    /** The endpoint on the local node. uint8_t */
    local: number;
    /**
     * A cluster ID that matches one from the local endpoint's simple descriptor.
     * This cluster ID is set by the provisioning application to indicate which part an endpoint's functionality is bound
     * to this particular remote node and is used to distinguish between unicast and multicast bindings.
     * Note that a binding can be used to to send messages with any cluster ID, not just that listed in the binding.
     * uint16_t
     */
    clusterId: number;
    /** The endpoint on the remote node (specified by identifier). uint8_t */
    remote: number;
    /**
     * A 64-bit identifier. This is either:
     * - The destination EUI64, for unicasts.
     * - A 16-bit multicast group address, for multicasts.
     */
    identifier: EUI64;
    /** The index of the network the binding belongs to. uint8_t */
    networkIndex: number;
};

/** An in-memory representation of a ZigBee APS frame of an incoming or outgoing message. */
export type EmberApsFrame = {
    /** The application profile ID that describes the format of the message. uint16_t */
    profileId: number;
    /** The cluster ID for this message. uint16_t */
    clusterId: number;
    /** The source endpoint. uint8_t */
    sourceEndpoint: number;
    /** The destination endpoint. uint8_t */
    destinationEndpoint: number;
    /** A bitmask of options from the enumeration above. */
    options: EmberApsOption;
    /** The group ID for this message, if it is multicast mode. uint16_t */
    groupId: number;
    /** The sequence number. uint8_t */
    sequence: number;
    /** uint8_t */
    radius?: number; // XXX: marked optional since doesn't appear to be used
};

/**
 * Defines an entry in the multicast table.
 *
 * A multicast table entry indicates that a particular endpoint is a member of a particular multicast group.
 * Only devices with an endpoint in a multicast group will receive messages sent to that multicast group.
 */
export type EmberMulticastTableEntry = {
    /** The multicast group ID. */
    multicastId: EmberMulticastId;
    /** The endpoint that is a member, or 0 if this entry is not in use (the ZDO is not a member of any multicast groups). uint8_t */
    endpoint: number;
    /** The network index of the network the entry is related to. uint8_t */
    networkIndex: number;
};

export type EmberBeaconClassificationParams = {
    /** int8_t */
    minRssiForReceivingPkts: number;
    /** uint16_t */
    beaconClassificationMask: number;
};

/** This data structure contains the key data that is passed into various other functions. */
export type EmberKeyData = {
    /** This is the key byte data. uint8_t[EMBER_ENCRYPTION_KEY_SIZE] */
    contents: Buffer;
};

/** This describes the Initial Security features and requirements that will be used when forming or joining the network.  */
export type EmberInitialSecurityState = {
    /**
     * This bitmask enumerates which security features should be used and the presence of valid data within other elements of the
     * ::EmberInitialSecurityState data structure.  For more details, see the ::EmberInitialSecurityBitmask.
     * uint16_t
     */
    bitmask: number;
    /**
     * This is the pre-configured key that can be used by devices when joining the network if the Trust Center does not send
     * the initial security data in-the-clear.
     * For the Trust Center, it will be the global link key and <b>must</b> be set regardless of whether joining devices are
     * expected to have a pre-configured Link Key. This parameter will only be used if the EmberInitialSecurityState::bitmask
     * sets the bit indicating ::EMBER_HAVE_PRECONFIGURED_KEY.
     */
    preconfiguredKey: EmberKeyData;
    /**
     * This is the Network Key used when initially forming the network.
     * It must be set on the Trust Center and is not needed for devices joining the network.
     * This parameter will only be used if the EmberInitialSecurityState::bitmask sets the bit indicating ::EMBER_HAVE_NETWORK_KEY.
     */
    networkKey: EmberKeyData;
    /**
     * This is the sequence number associated with the network key. It must be set if the Network Key is set and is used to indicate
     * a particular of the network key for updating and switching.
     * This parameter will only be used if the ::EMBER_HAVE_NETWORK_KEY is set.
     * Generally, it should be set to 0 when forming the network; joining devices can ignore this value.
     * uint8_t
     * */
    networkKeySequenceNumber: number;
    /**
     * This is the long address of the trust center on the network that will be joined.
     * It is usually NOT set prior to joining the network and is learned during the joining message exchange.
     * This field is only examined if ::EMBER_HAVE_TRUST_CENTER_EUI64 is set in the EmberInitialSecurityState::bitmask.
     * Most devices should clear that bit and leave this field alone.
     * This field must be set when using commissioning mode.
     * It is required to be in little-endian format.
     */
    preconfiguredTrustCenterEui64: EUI64;
};

/** This describes the security features used by the stack for a joined device. */
export type EmberCurrentSecurityState = {
    /** This bitmask indicates the security features currently in use on this node. */
    bitmask: EmberCurrentSecurityBitmask;
    /**
     * This indicates the EUI64 of the Trust Center.
     * It will be all zeroes if the Trust Center Address is not known (i.e., the device is in a Distributed Trust Center network).
     */
    trustCenterLongAddress: EUI64;
};

/**
 * This data structure houses the context when interacting with the Zigbee
 * Security Manager APIs. For example, when importing a key into storage, the various
 * fields of this structure are used to determine which type of key is being stored.
 * */
export type SecManContext = {
    coreKeyType: SecManKeyType;
    /** uint8_t */
    keyIndex: number;
    derivedType: SecManDerivedKeyType;
    eui64: EUI64;
    /** uint8_t */
    multiNetworkIndex: number;
    flags: SecManFlag;
    /**
     * Unused for classic key storage.
     * The algorithm type should be brought in by psa/crypto_types.h.
     * Zigbee Security Manager uses PSA_ALG_ECB_NO_PADDING for keys with AES-ECB encryption,
     * and defines ZB_PSA_ALG as AES-CCM with a 4-byte tag, used as this field's default value otherwise.
     * uint32_t
     */
    psaKeyAlgPermission: number;
};

/** This data structure contains the metadata pertaining to an network key */
export type SecManNetworkKeyInfo = {
    networkKeySet: boolean;
    alternateNetworkKeySet: boolean;
    /** uint8_t */
    networkKeySequenceNumber: number;
    /** uint8_t */
    altNetworkKeySequenceNumber: number;
    /** uint32_t */
    networkKeyFrameCounter: number;
};

/** This data structure contains the metadata pertaining to an APS key */
export type SecManAPSKeyMetadata = {
    bitmask: EmberKeyStructBitmask;
    /** valid only if bitmask & EMBER_KEY_HAS_OUTGOING_FRAME_COUNTER uint32_t */
    outgoingFrameCounter: number;
    /** valid only if bitmask & EMBER_KEY_HAS_INCOMING_FRAME_COUNTER uint32_t */
    incomingFrameCounter: number;
    /** valid only if core_key_type == SL_ZB_SEC_MAN_KEY_TYPE_TC_LINK_WITH_TIMEOUT uint16_t */
    ttlInSeconds: number; //
};

/** This data structure contains the key data that is passed into various other functions. */
export type SecManKey = EmberKeyData;

/** This data structure contains the context data when calculating an AES MMO hash (message digest). */
export type EmberAesMmoHashContext = {
    /** uint8_t[EMBER_AES_HASH_BLOCK_SIZE] */
    result: Buffer;
    /** uint32_t */
    length: number;
};

/** This data structure contains the public key data that is used for Certificate Based Key Exchange (CBKE). */
export type EmberPublicKeyData = {
    /** uint8_t[EMBER_PUBLIC_KEY_SIZE] */
    contents: Buffer;
};

/** This data structure contains the certificate data that is used for Certificate Based Key Exchange (CBKE). */
export type EmberCertificateData = {
    /** uint8_t[EMBER_CERTIFICATE_SIZE] */
    contents: Buffer;
};

/** This data structure contains the Shared Message Authentication Code SMAC) data that is used for Certificate Based Key Exchange (CBKE). */
export type EmberSmacData = {
    /** uint8_t[EMBER_SMAC_SIZE] */
    contents: Buffer;
};

/** This data structure contains the public key data that is used for Certificate Based Key Exchange (CBKE) in SECT283k1 Elliptical Cryptography. */
export type EmberPublicKey283k1Data = {
    /** uint8_t[EMBER_PUBLIC_KEY_283K1_SIZE] */
    contents: Buffer;
};

/** This data structure contains the private key data that is used for Certificate Based Key Exchange (CBKE) in SECT283k1 Elliptical Cryptography. */
export type EmberPrivateKey283k1Data = {
    /** uint8_t[EMBER_PRIVATE_KEY_283K1_SIZE] */
    contents: Buffer;
};

/** This data structure contains the certificate data that is used for Certificate Based Key Exchange (CBKE) in SECT283k1 Elliptical Cryptography. */
export type EmberCertificate283k1Data = {
    /* This is the certificate byte data. uint8_t[EMBER_CERTIFICATE_283K1_SIZE] */
    contents: Buffer;
};

/** This data structure contains an AES-MMO Hash (the message digest). */
export type EmberMessageDigest = {
    /** uint8_t[EMBER_AES_HASH_BLOCK_SIZE] */
    contents: Buffer;
};

/** This data structure contains a DSA signature. It is the bit concatenation of the 'r' and 's' components of the signature. */
export type EmberSignatureData = {
    /** uint8_t[EMBER_SIGNATURE_SIZE] */
    contents: Buffer;
};

/**
 * This data structure contains a DSA signature used in SECT283k1 Elliptical Cryptography.
 * It is the bit concatenation of the 'r' and 's' components of the signature.
 */
export type EmberSignature283k1Data = {
    /** uint8_t[EMBER_SIGNATURE_283K1_SIZE] */
    contents: Buffer;
};

/** This data structure contains the private key data that is used for Certificate Based Key Exchange (CBKE). */
export type EmberPrivateKeyData = {
    /** uint8_t[EMBER_PRIVATE_KEY_SIZE] */
    contents: Buffer;
};

/** Defines a ZigBee network and the associated parameters. */
export type EmberZigbeeNetwork = {
    /** uint16_t */
    panId: PanId;
    /** uint8_t */
    channel: number;
    /** bool */
    allowingJoin: boolean;
    /** uint8_t[EXTENDED_PAN_ID_SIZE] */
    extendedPanId: ExtendedPanId;
    /** uint8_t */
    stackProfile: number;
    /** uint8_t */
    nwkUpdateId: number;
};

/** Information about the ZLL security state and how to transmit the network key to the device securely. */
export type EmberZllSecurityAlgorithmData = {
    /** uint32_t */
    transactionId: number;
    /** uint32_t */
    responseId: number;
    /** uint16_t */
    bitmask: number;
};

/** Information about the ZLL network and specific device that responded to a ZLL scan request. */
export type EmberZllNetwork = {
    zigbeeNetwork: EmberZigbeeNetwork;
    securityAlgorithm: EmberZllSecurityAlgorithmData;
    eui64: EUI64;
    nodeId: NodeId;
    state: EmberZllState;
    nodeType: EmberNodeType;
    /** uint8_t */
    numberSubDevices: number;
    /** uint8_t */
    totalGroupIdentifiers: number;
    /** uint8_t */
    rssiCorrection: number;
};

/** Describe the Initial Security features and requirements that will be used when forming or joining ZigBee Light Link networks. */
export type EmberZllInitialSecurityState = {
    /** This bitmask is unused.  All values are reserved for future use. uint32_t */
    bitmask: number;
    /** The key encryption algorithm advertised by the application. */
    keyIndex: EmberZllKeyIndex;
    /** The encryption key for use by algorithms that require it. */
    encryptionKey: EmberKeyData;
    /** The pre-configured link key used during classical ZigBee commissioning. */
    preconfiguredKey: EmberKeyData;
};

/** Information discovered during a ZLL scan about the ZLL device's endpoint information. */
export type EmberZllDeviceInfoRecord = {
    ieeeAddress: EUI64;
    /** uint8_t */
    endpointId: number;
    /** uint16_t */
    profileId: number;
    /** uint16_t */
    deviceId: number;
    /** uint8_t */
    version: number;
    /** uint8_t */
    groupIdCount: number;
};

/** Network and group address assignment information. */
export type EmberZllAddressAssignment = {
    nodeId: NodeId;
    freeNodeIdMin: NodeId;
    freeNodeIdMax: NodeId;
    groupIdMin: EmberMulticastId;
    groupIdMax: EmberMulticastId;
    freeGroupIdMin: EmberMulticastId;
    freeGroupIdMax: EmberMulticastId;
};

export type EmberTokTypeStackZllData = {
    /** uint32_t */
    bitmask: number;
    /** uint16_t */
    freeNodeIdMin: number;
    /** uint16_t */
    freeNodeIdMax: number;
    /** uint16_t */
    myGroupIdMin: number;
    /** uint16_t */
    freeGroupIdMin: number;
    /** uint16_t */
    freeGroupIdMax: number;
    /** uint8_t */
    rssiCorrection: number;
};

export type EmberTokTypeStackZllSecurity = {
    /** uint32_t */
    bitmask: number;
    /** uint8_t */
    keyIndex: number;
    /** uint8_t[EMBER_ENCRYPTION_KEY_SIZE] */
    encryptionKey: Buffer;
    /** uint8_t[EMBER_ENCRYPTION_KEY_SIZE] */
    preconfiguredKey: Buffer;
};

/** 32-bit GPD source identifier uint32_t */
export type EmberGpSourceId = number;

/**
 * GPD Address for sending and receiving a GPDF.
 * EmberGpAddress_gpdIeeeAddress | EmberGpAddress_sourceId;
 */
export type EmberGpAddress = {
    // union {
    /** The IEEE address is used when the application identifier is ::EMBER_GP_APPLICATION_IEEE_ADDRESS. */
    gpdIeeeAddress?: EUI64;
    /** The 32-bit source identifier is used when the application identifier is ::EMBER_GP_APPLICATION_SOURCE_ID. */
    sourceId?: EmberGpSourceId;
    // } id;
    /** Application identifier of the GPD. */
    applicationId: EmberGpApplicationId;
    /** Application endpoint , only used when application identifier is ::EMBER_GP_APPLICATION_IEEE_ADDRESS. uint8_t */
    endpoint: number;
};

/** 32-bit security frame counter uint32_t */
export type EmberGpSecurityFrameCounter = number;

/** The internal representation of a proxy table entry. */
export type EmberGpProxyTableEntry = {
    /** Internal status. Defines if the entry is unused or used as a proxy entry */
    status: EmberGpProxyTableEntryStatus;
    /** The tunneling options (this contains both options and extendedOptions from the spec). uint32_t */
    options: number;
    /** The addressing info of the GPD */
    gpd: EmberGpAddress;
    /** The assigned alias for the GPD */
    assignedAlias: NodeId;
    /** The security options field. uint8_t */
    securityOptions: number;
    /** The SFC of the GPD */
    gpdSecurityFrameCounter: EmberGpSecurityFrameCounter;
    /** The key for the GPD. */
    gpdKey: EmberKeyData;
    /** The list of sinks; hardcoded to 2, which is the spec minimum. EmberGpSinkListEntry[GP_SINK_LIST_ENTRIES] */
    sinkList: EmberGpSinkListEntry[];
    /** The groupcast radius. uint8_t */
    groupcastRadius: number;
    /** The search counter. uint8_t */
    searchCounter: number;
};

/** GP Sink Address. */
export type EmberGpSinkAddress = {
    /** EUI64 or long address of the sink */
    sinkEUI: EUI64;
    /** Node ID or network address of the sink */
    sinkNodeId: NodeId;
};

/** GP Sink Group. */
export type EmberGpSinkGroup = {
    /** Group ID of the sink. uint16_t */
    groupID: number;
    /** Alias ID of the sink. uint16_t */
    alias: number;
};

/** GP Sink List Entry. */
export type EmberGpSinkListEntry = {
    /** Sink Type */
    type: EmberGpSinkType;
    // union {
    unicast?: EmberGpSinkAddress;
    groupcast?: EmberGpSinkGroup;
    /** Entry for Sink Group List */
    groupList?: EmberGpSinkGroup;
    // } target;
};

/** The internal representation of a sink table entry. */
export type EmberGpSinkTableEntry = {
    /** Internal status. Defines if the entry is unused or used as a sink table entry */
    status: EmberGpSinkTableEntryStatus;
    /** The tunneling options (this contains both options and extendedOptions from the spec). uint16_t */
    options: number;
    /** The addressing info of the GPD */
    gpd: EmberGpAddress;
    /** The device ID for the GPD. uint8_t */
    deviceId: number;
    /** The list of sinks; hardcoded to 2, which is the spec minimum. EmberGpSinkListEntry[GP_SINK_LIST_ENTRIES] */
    sinkList: EmberGpSinkListEntry[];
    /** The assigned alias for the GPD */
    assignedAlias: NodeId;
    /** The groupcast radius. uint8_t */
    groupcastRadius: number;
    /** The security options field. uint8_t */
    securityOptions: number;
    /** The SFC of the GPD */
    gpdSecurityFrameCounter: EmberGpSecurityFrameCounter;
    /** The GPD key associated with this entry. */
    gpdKey: EmberKeyData;
};

/** A structure containing the information of a token. */
export type EmberTokenInfo = {
    /** NVM3 token key. uint32_t */
    nvm3Key: number;
    /** The token is a counter token type. */
    isCnt: boolean;
    /** The token is an indexed token type. */
    isIdx: boolean;
    /** Size of the object of the token. uint8_t */
    size: number;
    /** The array size for the token when it is an indexed token. uint8_t */
    arraySize: number;
};

/** A structure containing the information of a token data. */
export type EmberTokenData = {
    /** The size of the token data in number of bytes. uint32_t */
    size: number;
    /** A data pointer pointing to the storage for the token data of above size. void * */
    data: Buffer;
};

/** This data structure contains the transient key data that is used during Zigbee 3.0 joining. */
export type EmberTransientKeyData = {
    eui64: EUI64;
    /** uint32_t */
    incomingFrameCounter: number;
    bitmask: EmberKeyStructBitmask;
    /** uint16_t */
    remainingTimeSeconds: number;
    /** uint8_t */
    networkIndex: number;
    // union {
    /** valid only if bitmask & EMBER_KEY_HAS_KEY_DATA (on some parts, keys are stored in secure storage and not RAM) */
    keyData?: EmberKeyData;
    /** valid only if bitmask & EMBER_KEY_HAS_PSA_ID (on some parts, keys are stored in secure storage and not RAM). uint32_t */
    psa_id?: number;
    // },
};

/**
 * Endpoint information (a ZigBee Simple Descriptor).
 *
 * This is a ZigBee Simple Descriptor and contains information about an endpoint.
 * This information is shared with other nodes in the network by the ZDO.
 */
export type EmberEndpointDescription = {
    /** Identifies the endpoint's application profile. uint16_t */
    profileId: number;
    /** The endpoint's device ID within the application profile. uint16_t */
    deviceId: number;
    /** The endpoint's device version. uint8_t */
    deviceVersion: number;
    /** The number of input clusters. uint8_t */
    inputClusterCount: number;
    /** The number of output clusters. uint8_t */
    outputClusterCount: number;
};

export type EmberMultiprotocolPriorities = {
    /** The priority of a Zigbee RX operation while not receiving a packet. uint8_t */
    backgroundRx: number;
    /** The priority of a Zigbee TX operation. uint8_t */
    tx: number;
    /** The priority of a Zigbee RX operation while receiving a packet. uint8_t */
    activeRx: number;
};

/** @brief Received packet information.
 *
 * Contains information about the incoming packet.
 */
export type EmberRxPacketInfo = {
    /** Short ID of the sender of the message */
    senderShortId: NodeId;
    /**
     * EUI64 of the sender of the message if the sender chose to include this information in the message.
     * The ::SL_ZIGBEE_APS_OPTION_SOURCE_EUI64 bit in the options field of the APS frame of the incoming message indicates that
     * the EUI64 is present in the message.
     * Also, when not set, the sender long ID is set to all zeros
     */
    senderLongId: EUI64;
    /**
     * The index of the entry in the binding table that matches the sender of the message or 0xFF if there is no matching entry.
     * A binding matches the message if:
     *   - The binding's source endpoint is the same as the message's destination endpoint
     *   - The binding's destination endpoint is the same as the message's source endpoint
     *   - The source of the message has been previously identified as the binding's remote node by a successful address discovery
     *     or by the application via a call to either ::sl_zigbee_set_reply_binding() or ::sl_zigbee_note_senders_binding().
     * uint8_t
     */
    bindingIndex: number;
    /** The index of the entry in the address table that matches the sender of the message or 0xFF if there is no matching entry. uint8_t */
    addressIndex: number;
    /** Link quality of the node that last relayed the current message. uint8_t */
    lastHopLqi: number;
    /** Received signal strength indicator (RSSI) of the node that last relayed the message. int8_t */
    lastHopRssi: number;
    /* Timestamp of the moment when Start Frame Delimiter (SFD) was received. uint32_t */
    lastHopTimestamp: number;
};

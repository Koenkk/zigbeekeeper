
export enum AddressMode {
    ADDR_NOT_PRESENT = 0,
    ADDR_GROUP = 1,
    ADDR_16BIT = 2,
    ADDR_64BIT = 3,
    ADDR_BROADCAST = 15
}

export enum DevStates {
    HOLD = 0,
    INIT = 1,
    NWK_DISC = 2,
    NWK_JOINING = 3,
    NWK_REJOIN = 4,
    END_DEVICE_UNAUTH = 5,
    END_DEVICE = 6,
    ROUTER = 7,
    COORD_STARTING = 8,
    ZB_COORD = 9,
    NWK_ORPHAN = 10,
    INVALID_REQTYPE = 128,
    DEVICE_NOT_FOUND = 129,
    INVALID_EP = 130,
    NOT_ACTIVE = 131,
    NOT_SUPPORTED = 132,
    TIMEOUT = 133,
    NO_MATCH = 134,
    NO_ENTRY = 136,
    NO_DESCRIPTOR = 137,
    INSUFFICIENT_SPACE = 138,
    NOT_PERMITTED = 139,
    TABLE_FULL = 140,
    NOT_AUTHORIZED = 141,
    BINDING_TABLE_FULL = 142
}

export enum NvItemsIds {
    EXTADDR = 1,
    BOOTCOUNTER = 2,
    STARTUP_OPTION = 3,
    START_DELAY = 4,
    NIB = 33,
    DEVICE_LIST = 34,
    ADDRMGR = 35,
    POLL_RATE = 36,
    QUEUED_POLL_RATE = 37,
    RESPONSE_POLL_RATE = 38,
    REJOIN_POLL_RATE = 39,
    DATA_RETRIES = 40,
    POLL_FAILURE_RETRIES = 41,
    STACK_PROFILE = 42,
    INDIRECT_MSG_TIMEOUT = 43,
    ROUTE_EXPIRY_TIME = 44,
    EXTENDED_PAN_ID = 45,
    BCAST_RETRIES = 46,
    PASSIVE_ACK_TIMEOUT = 47,
    BCAST_DELIVERY_TIME = 48,
    NWK_MODE = 49,
    CONCENTRATOR_ENABLE = 50,
    CONCENTRATOR_DISCOVERY = 51,
    CONCENTRATOR_RADIUS = 52,
    CONCENTRATOR_RC = 54,
    NWK_MGR_MODE = 55,
    SRC_RTG_EXPIRY_TIME = 56,
    ROUTE_DISCOVERY_TIME = 57,
    NWK_ACTIVE_KEY_INFO = 58,
    NWK_ALTERN_KEY_INFO = 59,
    ROUTER_OFF_ASSOC_CLEANUP = 60,
    NWK_LEAVE_REQ_ALLOWED = 61,
    NWK_CHILD_AGE_ENABLE = 62,
    DEVICE_LIST_KA_TIMEOUT = 63,
    BINDING_TABLE = 65,
    GROUP_TABLE = 66,
    APS_FRAME_RETRIES = 67,
    APS_ACK_WAIT_DURATION = 68,
    APS_ACK_WAIT_MULTIPLIER = 69,
    BINDING_TIME = 70,
    APS_USE_EXT_PANID = 71,
    APS_USE_INSECURE_JOIN = 72,
    COMMISSIONED_NWK_ADDR = 73,
    APS_NONMEMBER_RADIUS = 75,
    APS_LINK_KEY_TABLE = 76,
    APS_DUPREJ_TIMEOUT_INC = 77,
    APS_DUPREJ_TIMEOUT_COUNT = 78,
    APS_DUPREJ_TABLE_SIZE = 79,
    DIAGNOSTIC_STATS = 80,
    BDBNODEISONANETWORK = 85,
    SECURITY_LEVEL = 97,
    PRECFGKEY = 98,
    PRECFGKEYS_ENABLE = 99,
    SECURITY_MODE = 100,
    SECURE_PERMIT_JOIN = 101,
    APS_LINK_KEY_TYPE = 102,
    APS_ALLOW_R19_SECURITY = 103,
    IMPLICIT_CERTIFICATE = 105,
    DEVICE_PRIVATE_KEY = 106,
    CA_PUBLIC_KEY = 107,
    KE_MAX_DEVICES = 108,
    USE_DEFAULT_TCLK = 109,
    RNG_COUNTER = 111,
    RANDOM_SEED = 112,
    TRUSTCENTER_ADDR = 113,
    LEGACY_NWK_SEC_MATERIAL_TABLE_START = 117, // Valid for <= Z-Stack 3.0.x
    EX_NWK_SEC_MATERIAL_TABLE = 7, // Valid for >= Z-Stack 3.x.0
    USERDESC = 129,
    NWKKEY = 130,
    PANID = 131,
    CHANLIST = 132,
    LEAVE_CTRL = 133,
    SCAN_DURATION = 134,
    LOGICAL_TYPE = 135,
    NWKMGR_MIN_TX = 136,
    NWKMGR_ADDR = 137,
    ZDO_DIRECT_CB = 143,
    SCENE_TABLE = 145,
    MIN_FREE_NWK_ADDR = 146,
    MAX_FREE_NWK_ADDR = 147,
    MIN_FREE_GRP_ID = 148,
    MAX_FREE_GRP_ID = 149,
    MIN_GRP_IDS = 150,
    MAX_GRP_IDS = 151,
    OTA_BLOCK_REQ_DELAY = 152,
    SAPI_ENDPOINT = 161,
    SAS_SHORT_ADDR = 177,
    SAS_EXT_PANID = 178,
    SAS_PANID = 179,
    SAS_CHANNEL_MASK = 180,
    SAS_PROTOCOL_VER = 181,
    SAS_STACK_PROFILE = 182,
    SAS_STARTUP_CTRL = 183,
    SAS_TC_ADDR = 193,
    SAS_TC_MASTER_KEY = 194,
    SAS_NWK_KEY = 195,
    SAS_USE_INSEC_JOIN = 196,
    SAS_PRECFG_LINK_KEY = 197,
    SAS_NWK_KEY_SEQ_NUM = 198,
    SAS_NWK_KEY_TYPE = 199,
    SAS_NWK_MGR_ADDR = 200,
    SAS_CURR_TC_MASTER_KEY = 209,
    SAS_CURR_NWK_KEY = 210,
    SAS_CURR_PRECFG_LINK_KEY = 211,
    TCLK_SEED = 257,
    LEGACY_TCLK_TABLE_START_12 = 257, // Keep it for Legacy 1.2 stack
    LEGACY_TCLK_TABLE_START = 273, // Valid for <= Z-Stack 3.0.x
    EX_TCLK_TABLE = 4, // Valid for >= Z-Stack 3.0.x
    APS_LINK_KEY_DATA_START = 513,
    APS_LINK_KEY_DATA_END = 767,
    DUPLICATE_BINDING_TABLE = 768,
    DUPLICATE_DEVICE_LIST = 769,
    DUPLICATE_DEVICE_LIST_KA_TIMEOUT = 770,
    ZNP_HAS_CONFIGURED_ZSTACK1 = 3840,
    ZNP_HAS_CONFIGURED_ZSTACK3 = 96,
    ZCD_NV_EX_APS_KEY_DATA_TABLE = 6,
    ZCD_NV_EX_ADDRMGR = 1
}

export enum NvSystemIds {
    ZSTACK = 1,
}

export enum ZnpCommandStatus {
    SUCCESS = 0x00,
    FAILURE = 0x01,
    INVALID_PARAM = 0x02,
    NV_ITEM_INITIALIZED = 0x09,
    NV_OPER_FAILED = 0x0a,
    NV_BAD_ITEM_LEN = 0x0c,
    MEM_ERROR = 0x10,
    BUFFER_FULL = 0x11,
    UNSUPPORTED_MODE = 0x12,
    MAC_MEM_ERROR = 0x13,
    MAC_UNSUPPORTED_NOT_SPOORT = 0x18,
    MAC_BAD_STATE = 0x19,
    MAC_NO_RESOURCES = 0x1a,
    MAC_ACK_PENDING = 0x1b,
    MAC_NO_TIME = 0x1c,
    MAC_TX_ABORTED = 0x1d,
    SAPI_IN_PROGRESS = 0x20,
    SAPI_TIMEOUT = 0x21,
    SAPI_INIT = 0x22,
    NOT_AUTHORIZED = 0x7e,
    MALFORMED_CMD = 0x80,
    UNSUP_CLUSTER_CMD = 0x81,
    OTA_ABORT = 0x95,
    OTA_IMAGE_INVALID = 0x96,
    OTA_WAIT_FOR_DATA = 0x97,
    OTA_NO_IMAGE_AVAILABLE = 0x98,
    OTA_REQUIRE_MORE_IMAGE = 0x99,
    APS_FAIL = 0xb1,
    APS_TABLE_FULL = 0xb2,
    APS_ILLEGAL_REQUEST = 0xb3,
    APS_INVALID_BINDING = 0xb4,
    APS_UNSUPPORTED_ATTRIB = 0xb5,
    APS_NOT_SUPPORTED = 0xb6,
    APS_NO_ACK = 0xb7,
    APS_DUPLICATE_ENTRY = 0xb8,
    APS_NO_BOUND_DEVICE = 0xb9,
    APS_NOT_ALLOWED = 0xba,
    APS_NOT_AUTHENTICATED = 0xbb,
    SEC_NO_KEY = 0xa1,
    SEC_OLD_FRM_COUNT = 0xa2,
    SEC_MAX_FRM_COUNT = 0xa3,
    SEC_CCM_FAIL = 0xa4,
    NWK_INVALID_PARAM = 0xc1,
    NWK_INVALID_REQUEST = 0xc2,
    NWK_NOT_PERMITTED = 0xc3,
    NWK_STARTUP_FAILURE = 0xc4,
    NWK_ALREADY_PRESENT = 0xc5,
    NWK_SYNC_FAILURE = 0xc6,
    NWK_TABLE_FULL = 0xc7,
    NWK_UNKNOWN_DEVICE = 0xc8,
    NWK_UNSUPPORTED_ATTRIBUTE = 0xc9,
    NWK_NO_NETWORKS = 0xca,
    NWK_LEAVE_UNCONFIRMED = 0xcb,
    NWK_NO_ACK = 0xcc,
    NWK_NO_ROUTE = 0xcd,
    MAC_BEACON_LOSS = 0xe0,
    MAC_CHANNEL_ACCESS_FAILURE = 0xe1,
    MAC_DENIED = 0xe2,
    MAC_DISABLE_TRX_FAILURE = 0xe3,
    MAC_FAILED_SECURITY_CHECK = 0xe4,
    MAC_FRAME_TOO_LONG = 0xe5,
    MAC_INVALID_GTS = 0xe6,
    MAC_INVALID_HANDLE = 0xe7,
    MAC_INVALID_PARAMETER = 0xe8,
    MAC_NO_ACK = 0xe9,
    MAC_NO_BEACON = 0xea,
    MAC_NO_DATA = 0xeb,
    MAC_NO_SHORT_ADDR = 0xec,
    MAC_OUT_OF_CAP = 0xed,
    MAC_PANID_CONFLICT = 0xee,
    MAC_REALIGNMENT = 0xef,
    MAC_TRANSACTION_EXPIRED = 0xf0,
    MAC_TRANSACTION_OVERFLOW = 0xf1,
    MAC_TX_ACTIVE = 0xf2,
    MAC_UNAVAILABLE_KEY = 0xf3,
    MAC_UNSUPPORTED_ATTRIBUTE = 0xf4,
    MAC_UNSUPPORTED = 0xf5,
    MAC_ON_TIME_TOO_LING = 0xf6,
    MAC_PAST_TIME = 0xf7,
    MAC_TRACKING_OFF = 0xf8,
    MAC_SCAN_IN_PROGRESS = 0xfc,
    MAC_SRC_MATCH_INVALID_INDEX = 0xff
}

export enum CapabInfoMask {
    ALTPANCOORD = 1,
    DEVICETYPE_FFD = 2,
    POWER_AC = 4,
    RCVR_ON_IDLE = 8,
    SECURITY_CAPABLE = 64,
    ALLOC_ADDR = 128
}

export enum SecurityLevel {
    NONE = 0,
    MIC_32 = 1,
    MIC_64 = 2,
    MIC_128 = 3,
    ENC = 4,
    ENC_MIC_32 = 5,
    ENC_MIC_64 = 6,
    ENC_MIC_128 = 7
}

export enum ScanDuration {
    CH_CHANGE_REQ = 254,
    CH_MASK_CHANGE_REQ = 255,
    T_NO_BEACONS = 15,
    T_4_MINUTES = 14,
    T_2_MINUTES = 13,
    T_1_MINUTE = 12,
    T_31_SECONDS = 11,
    T_15_SECONDS = 10,
    T_7_5_SECONDS = 9,
    T_4_SECONDS = 8,
    T_2_SECONDS = 7,
    T_1_SECOND = 6,
    T_480_MSEC = 5,
    T_240_MSEC = 4,
    T_120_MSEC = 3,
    T_60_MSEC = 2,
    T_30_MSEC = 1,
    T_15_MSEC = 0
}

enum ParameterType {
    UINT8 = 0,
    UINT16 = 1,
    UINT32 = 2,
    IEEEADDR = 3,

    BUFFER = 4,
    BUFFER8 = 5,
    BUFFER16 = 6,
    BUFFER18 = 7,
    BUFFER32 = 8,
    BUFFER42 = 9,
    BUFFER100 = 10,

    LIST_UINT8 = 11,
    LIST_UINT16 = 12,
    LIST_ROUTING_TABLE = 13,
    LIST_BIND_TABLE = 14,
    LIST_NEIGHBOR_LQI = 15,
    LIST_NETWORK = 16,
    LIST_ASSOC_DEV = 17,

    INT8 = 18,
}

export default ParameterType;

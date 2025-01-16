export type Adapter = 'deconz' | 'ember' | 'zstack' | 'zboss' | 'zigate' | 'ezsp';
export type DiscoverableUSBAdapter = 'deconz' | 'ember' | 'zstack' | 'zboss' | 'zigate';

export type USBAdapterFingerprint = {
    vendorId: string;
    productId: string;
    manufacturer?: string;
    pathRegex: string;
};

export interface NetworkOptions {
    panID: number;
    extendedPanID: number[];
    channelList: number[];
    networkKey: number[];
    networkKeyDistribute: boolean;
}

export interface SerialPortOptions {
    baudRate?: number;
    rtscts?: boolean;
    path?: string;
    adapter?: Adapter;
}

export interface AdapterOptions {
    concurrent?: number;
    delay?: number;
    disableLED: boolean;
    transmitPower?: number;
    forceStartWithInconsistentAdapterConfiguration?: boolean;
}

export interface CoordinatorVersion {
    type: string;
    meta: {[s: string]: number | string};
}

export type DeviceType = 'Coordinator' | 'EndDevice' | 'Router' | 'Unknown';

export type StartResult = 'resumed' | 'reset' | 'restored';

export interface LQINeighbor {
    ieeeAddr: string;
    networkAddress: number;
    linkquality: number;
    relationship: number;
    depth: number;
}

export interface LQI {
    neighbors: LQINeighbor[];
}

export interface RoutingTableEntry {
    destinationAddress: number;
    status: string;
    nextHop: number;
}

export interface RoutingTable {
    table: RoutingTableEntry[];
}

export interface Backup {
    adapterType: 'zStack';
    time: string;
    meta: {[s: string]: number};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any;
}

export interface NetworkParameters {
    panID: number;
    extendedPanID: string; // `0x${string}` same as IEEE address
    channel: number;
}

import type {MockInstance} from 'vitest';

import fs from 'node:fs';
import path from 'node:path';

import Bonjour, {Browser, BrowserConfig, Service} from 'bonjour-service';
import equals from 'fast-deep-equal/es6';

import {Adapter} from '../src/adapter';
import {ZStackAdapter} from '../src/adapter/z-stack/adapter/zStackAdapter';
import {Controller} from '../src/controller';
import * as Events from '../src/controller/events';
import Request from '../src/controller/helpers/request';
import zclTransactionSequenceNumber from '../src/controller/helpers/zclTransactionSequenceNumber';
import ZclTransactionSequenceNumber from '../src/controller/helpers/zclTransactionSequenceNumber';
import {Device, Endpoint, Group} from '../src/controller/model';
import * as Models from '../src/models';
import {wait} from '../src/utils';
import * as Utils from '../src/utils';
import {setLogger} from '../src/utils/logger';
import * as ZSpec from '../src/zspec';
import {BroadcastAddress} from '../src/zspec/enums';
import * as Zcl from '../src/zspec/zcl';
import * as Zdo from '../src/zspec/zdo';
import {IEEEAddressResponse, NetworkAddressResponse} from '../src/zspec/zdo/definition/tstypes';
import {DEFAULT_184_CHECKIN_INTERVAL, LQI_TABLE_ENTRY_DEFAULTS, MOCK_DEVICES, ROUTING_TABLE_ENTRY_DEFAULTS} from './mockDevices';

const globalSetImmediate = setImmediate;
const flushPromises = () => new Promise(globalSetImmediate);

const mockLogger = {
    debug: vi.fn((messageOrLambda) => {
        if (typeof messageOrLambda === 'function') messageOrLambda();
    }),
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
};

const mockDummyBackup: Models.Backup = {
    networkOptions: {
        panId: 6755,
        extendedPanId: Buffer.from('deadbeef01020304', 'hex'),
        channelList: [11],
        networkKey: Buffer.from('a1a2a3a4a5a6a7a8b1b2b3b4b5b6b7b8', 'hex'),
        networkKeyDistribute: false,
    },
    coordinatorIeeeAddress: Buffer.from('0102030405060708', 'hex'),
    logicalChannel: 11,
    networkUpdateId: 0,
    securityLevel: 5,
    znp: {
        version: 1,
    },
    networkKeyInfo: {
        sequenceNumber: 0,
        frameCounter: 10000,
    },
    devices: [
        {
            networkAddress: 1001,
            ieeeAddress: Buffer.from('c1c2c3c4c5c6c7c8', 'hex'),
            isDirectChild: false,
        },
        {
            networkAddress: 1002,
            ieeeAddress: Buffer.from('d1d2d3d4d5d6d7d8', 'hex'),
            isDirectChild: false,
            linkKey: {
                key: Buffer.from('f8f7f6f5f4f3f2f1e1e2e3e4e5e6e7e8', 'hex'),
                rxCounter: 10000,
                txCounter: 5000,
            },
        },
    ],
};

const mockAdapterEvents = {};
const mockAdapterWaitFor = vi.fn();
const mockAdapterSupportsDiscoverRoute = vi.fn();
const mockSetChannelInterPAN = vi.fn();
const mocksendZclFrameInterPANToIeeeAddr = vi.fn();
const mocksendZclFrameInterPANBroadcast = vi.fn();
const mockRestoreChannelInterPAN = vi.fn();
const mockAdapterPermitJoin = vi.fn();
const mockDiscoverRoute = vi.fn();
const mockAdapterSupportsBackup = vi.fn().mockReturnValue(true);
const mockAdapterReset = vi.fn();
const mockAdapterStop = vi.fn();
const mockAdapterStart = vi.fn().mockReturnValue('resumed');
const mockAdapterGetCoordinatorIEEE = vi.fn().mockReturnValue('0x0000012300000000');
const mockAdapterGetNetworkParameters = vi.fn().mockReturnValue({panID: 1, extendedPanID: '0x64c5fd698daf0c00', channel: 15});
const mocksendZclFrameToGroup = vi.fn();
const mocksendZclFrameToAll = vi.fn();
const mockAddInstallCode = vi.fn();
const mocksendZclFrameToEndpoint = vi.fn();
const mockApaterBackup = vi.fn(() => Promise.resolve(mockDummyBackup));
let sendZdoResponseStatus = Zdo.Status.SUCCESS;
const mockAdapterSendZdo = vi
    .fn()
    .mockImplementation(async (ieeeAddress: string, networkAddress: number, clusterId: Zdo.ClusterId, payload: Buffer, disableResponse: true) => {
        if (sendZdoResponseStatus !== Zdo.Status.SUCCESS) {
            return [sendZdoResponseStatus, undefined];
        }

        if (ZSpec.BroadcastAddress[networkAddress]) {
            // TODO
        } else {
            const device = MOCK_DEVICES[networkAddress];

            if (!device) {
                throw new Error(`Mock device ${networkAddress} not found`);
            }

            switch (clusterId) {
                case Zdo.ClusterId.NODE_DESCRIPTOR_REQUEST: {
                    if (device.key === 'xiaomi') {
                        const frame = Zcl.Frame.create(
                            0,
                            1,
                            true,
                            undefined,
                            10,
                            'readRsp',
                            0,
                            [{attrId: 5, status: 0, dataType: 66, attrData: 'lumi.occupancy'}],
                            {},
                        );
                        await mockAdapterEvents['zclPayload']({
                            wasBroadcast: false,
                            address: networkAddress,
                            clusterID: frame.cluster.ID,
                            data: frame.toBuffer(),
                            header: frame.header,
                            endpoint: 1,
                            linkquality: 50,
                            groupID: 1,
                        });
                    }

                    if (!device.nodeDescriptor) {
                        throw new Error('NODE_DESCRIPTOR_REQUEST timeout');
                    } else {
                        return device.nodeDescriptor;
                    }
                }

                case Zdo.ClusterId.ACTIVE_ENDPOINTS_REQUEST: {
                    if (!device.activeEndpoints) {
                        throw new Error('ACTIVE_ENDPOINTS_REQUEST timeout');
                    } else {
                        return device.activeEndpoints;
                    }
                }

                case Zdo.ClusterId.SIMPLE_DESCRIPTOR_REQUEST: {
                    if (!device.simpleDescriptor) {
                        throw new Error('SIMPLE_DESCRIPTOR_REQUEST timeout');
                    }

                    // XXX: only valid if hasZdoMessageOverhead === false
                    const endpoint = payload[2];

                    if (device.simpleDescriptor[endpoint] === undefined) {
                        throw new Error(`SIMPLE_DESCRIPTOR_REQUEST(${endpoint}) timeout`);
                    }

                    return device.simpleDescriptor[endpoint];
                }

                case Zdo.ClusterId.LQI_TABLE_REQUEST: {
                    if (!device.lqiTable) {
                        throw new Error('LQI_TABLE_REQUEST timeout');
                    } else {
                        return device.lqiTable;
                    }
                }

                case Zdo.ClusterId.ROUTING_TABLE_REQUEST: {
                    if (!device.routingTable) {
                        throw new Error('ROUTING_TABLE_REQUEST timeout');
                    } else {
                        return device.routingTable;
                    }
                }

                default: {
                    // Zdo.ClusterId.LEAVE_REQUEST, Zdo.ClusterId.BIND_REQUEST, Zdo.ClusterId.UNBIND_REQUEST
                    return [Zdo.Status.SUCCESS, undefined];
                }
            }
        }
    });

let iasZoneReadState170Count = 0;
let enroll170 = true;
let configureReportStatus = 0;
let configureReportDefaultRsp = false;

const restoreMocksendZclFrameToEndpoint = () => {
    mocksendZclFrameToEndpoint.mockImplementation((ieeeAddr, networkAddress, endpoint, frame: Zcl.Frame) => {
        if (
            frame.header.isGlobal &&
            frame.isCommand('read') &&
            (frame.isCluster('genBasic') || frame.isCluster('ssIasZone') || frame.isCluster('genPollCtrl') || frame.isCluster('hvacThermostat'))
        ) {
            const payload: {[key: string]: unknown}[] = [];
            const cluster = frame.cluster;
            for (const item of frame.payload) {
                if (item.attrId !== 65314) {
                    const attribute = cluster.getAttribute(item.attrId);
                    if (frame.isCluster('ssIasZone') && item.attrId === 0) {
                        iasZoneReadState170Count++;
                        payload.push({
                            attrId: item.attrId,
                            dataType: attribute.type,
                            attrData: iasZoneReadState170Count === 2 && enroll170 ? 1 : 0,
                            status: 0,
                        });
                    } else {
                        payload.push({
                            attrId: item.attrId,
                            dataType: attribute.type,
                            attrData: MOCK_DEVICES[networkAddress]!.attributes![endpoint][attribute.name],
                            status: 0,
                        });
                    }
                }
            }

            const responseFrame = Zcl.Frame.create(0, 1, true, undefined, 10, 'readRsp', frame.cluster.ID, payload, {});
            return {clusterID: responseFrame.cluster.ID, header: responseFrame.header, data: responseFrame.toBuffer()};
        }

        if (frame.header.isSpecific && (frame.isCommand('add') || frame.isCommand('remove')) && frame.isCluster('genGroups')) {
            const responseFrame = Zcl.Frame.create(
                1,
                1,
                true,
                undefined,
                10,
                frame.command.name + 'Rsp',
                frame.cluster.ID,
                {status: 0, groupid: 1},
                {},
            );
            return {clusterID: frame.cluster.ID, header: responseFrame.header, data: responseFrame.toBuffer()};
        }

        if (
            networkAddress === 170 &&
            frame.header.isGlobal &&
            frame.isCluster('ssIasZone') &&
            frame.isCommand('write') &&
            frame.payload[0].attrId === 16
        ) {
            // Write of ias cie address
            const response = Zcl.Frame.create(
                Zcl.FrameType.SPECIFIC,
                Zcl.Direction.SERVER_TO_CLIENT,
                false,
                undefined,
                1,
                'enrollReq',
                Zcl.Utils.getCluster('ssIasZone', undefined, {}).ID,
                {zonetype: 0, manucode: 1},
                {},
            );

            mockAdapterEvents['zclPayload']({
                wasBroadcast: false,
                address: 170,
                clusterID: response.cluster.ID,
                data: response.toBuffer(),
                header: response.header,
                endpoint: 1,
                linkquality: 50,
                groupID: 1,
            });
        }

        if (frame.header.isGlobal && frame.isCommand('write')) {
            const payload: {[key: string]: unknown}[] = [];
            for (const item of frame.payload) {
                payload.push({attrId: item.attrId, status: 0});
            }

            const responseFrame = Zcl.Frame.create(0, 1, true, undefined, 10, 'writeRsp', 0, payload, {});
            return {clusterID: responseFrame.cluster.ID, header: responseFrame.header, data: responseFrame.toBuffer()};
        }

        if (frame.header.isGlobal && frame.isCommand('configReport')) {
            let payload;
            let cmd;
            if (configureReportDefaultRsp) {
                payload = {cmdId: 1, statusCode: configureReportStatus};
                cmd = 'defaultRsp';
            } else {
                payload = [];
                cmd = 'configReportRsp';
                for (const item of frame.payload) {
                    payload.push({attrId: item.attrId, status: configureReportStatus, direction: 1});
                }
            }

            const responseFrame = Zcl.Frame.create(0, 1, true, undefined, 10, cmd, 0, payload, {});
            return {clusterID: responseFrame.cluster.ID, header: responseFrame.header, data: responseFrame.toBuffer()};
        }
    });
};

const mocksClear = [
    mockAdapterStart,
    mocksendZclFrameToEndpoint,
    mockAdapterReset,
    mocksendZclFrameToGroup,
    mockSetChannelInterPAN,
    mocksendZclFrameInterPANToIeeeAddr,
    mocksendZclFrameInterPANBroadcast,
    mockRestoreChannelInterPAN,
    mockAddInstallCode,
    mockAdapterGetNetworkParameters,
    mockAdapterSendZdo,
    mockLogger.debug,
    mockLogger.info,
    mockLogger.warning,
    mockLogger.error,
];
const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

const equalsPartial = (object, expected) => {
    for (const [key, value] of Object.entries(expected)) {
        if (!equals(object[key], value)) {
            return false;
        }
    }

    return true;
};

vi.mock('../src/utils/wait', () => ({
    wait: vi.fn(() => {
        return new Promise<void>((resolve) => resolve());
    }),
}));

const getCluster = (key) => {
    const cluster = Zcl.Utils.getCluster(key, undefined, {});
    // @ts-expect-error mock
    delete cluster.getAttribute;
    // @ts-expect-error mock
    delete cluster.getCommand;
    // @ts-expect-error mock
    delete cluster.hasAttribute;
    // @ts-expect-error mock
    delete cluster.getCommandResponse;
    return cluster;
};

let dummyBackup;

vi.mock('../src/adapter/z-stack/adapter/zStackAdapter', () => ({
    ZStackAdapter: vi.fn(() => ({
        hasZdoMessageOverhead: false,
        manufacturerID: 0x0007,
        on: (event, handler) => (mockAdapterEvents[event] = handler),
        removeAllListeners: (event) => delete mockAdapterEvents[event],
        start: mockAdapterStart,
        getCoordinatorIEEE: mockAdapterGetCoordinatorIEEE,
        reset: mockAdapterReset,
        supportsBackup: mockAdapterSupportsBackup,
        backup: mockApaterBackup,
        getCoordinatorVersion: () => {
            return {type: 'zStack', meta: {version: 1}};
        },
        getNetworkParameters: mockAdapterGetNetworkParameters,
        waitFor: mockAdapterWaitFor,
        sendZclFrameToEndpoint: mocksendZclFrameToEndpoint,
        sendZclFrameToGroup: mocksendZclFrameToGroup,
        sendZclFrameToAll: mocksendZclFrameToAll,
        addInstallCode: mockAddInstallCode,
        permitJoin: mockAdapterPermitJoin,
        supportsDiscoverRoute: mockAdapterSupportsDiscoverRoute,
        discoverRoute: mockDiscoverRoute,
        stop: mockAdapterStop,
        setChannelInterPAN: mockSetChannelInterPAN,
        sendZclFrameInterPANToIeeeAddr: mocksendZclFrameInterPANToIeeeAddr,
        sendZclFrameInterPANBroadcast: mocksendZclFrameInterPANBroadcast,
        restoreChannelInterPAN: mockRestoreChannelInterPAN,
        sendZdo: mockAdapterSendZdo,
    })),
}));

const TEMP_PATH = path.resolve('temp');

const getTempFile = (filename: string): string => {
    if (!fs.existsSync(TEMP_PATH)) {
        fs.mkdirSync(TEMP_PATH);
    }

    return path.join(TEMP_PATH, filename);
};

const mocksRestore = [mockAdapterPermitJoin, mockAdapterStop, mocksendZclFrameToAll];

const events: {
    deviceJoined: Events.DeviceJoinedPayload[];
    deviceInterview: Events.DeviceInterviewPayload[];
    adapterDisconnected: number[];
    deviceAnnounce: Events.DeviceAnnouncePayload[];
    deviceLeave: Events.DeviceLeavePayload[];
    message: Events.MessagePayload[];
    permitJoinChanged: Events.PermitJoinChangedPayload[];
    lastSeenChanged: Events.LastSeenChangedPayload[];
    deviceNetworkAddressChanged: Events.DeviceNetworkAddressChangedPayload[];
} = {
    deviceJoined: [],
    deviceInterview: [],
    adapterDisconnected: [],
    deviceAnnounce: [],
    deviceLeave: [],
    message: [],
    permitJoinChanged: [],
    lastSeenChanged: [],
    deviceNetworkAddressChanged: [],
};

const backupPath = getTempFile('backup');

const mockAcceptJoiningDeviceHandler = vi.fn((ieeeAddr: string): Promise<boolean> => Promise.resolve(true));
const options = {
    network: {
        panID: 0x1a63,
        channelList: [15],
    },
    serialPort: {
        baudRate: 115200,
        rtscts: true,
        path: '/dev/ttyUSB0',
        adapter: 'zstack' as const,
    },
    adapter: {
        disableLED: false,
    },
    databasePath: getTempFile('database.db'),
    databaseBackupPath: getTempFile('database.db.backup'),
    backupPath,
    acceptJoiningDeviceHandler: mockAcceptJoiningDeviceHandler,
};

const databaseContents = () => fs.readFileSync(options.databasePath).toString();

describe('Controller', () => {
    let controller: Controller;
    let mockedDate: Date;

    beforeAll(async () => {
        mockedDate = new Date();

        vi.useFakeTimers();
        vi.setSystemTime(mockedDate);
        setLogger(mockLogger);
        dummyBackup = await Utils.BackupUtils.toUnifiedBackup(mockDummyBackup);
    });

    afterAll(async () => {
        vi.useRealTimers();
        fs.rmSync(TEMP_PATH, {recursive: true, force: true});
    });

    beforeEach(async () => {
        vi.setSystemTime(mockedDate);
        sendZdoResponseStatus = Zdo.Status.SUCCESS;
        mocksRestore.forEach((m) => m.mockRestore());
        mocksClear.forEach((m) => m.mockClear());
        MOCK_DEVICES[174]!.attributes![1].checkinInterval = DEFAULT_184_CHECKIN_INTERVAL;
        // @ts-expect-error mock
        zclTransactionSequenceNumber.number = 1;
        iasZoneReadState170Count = 0;
        configureReportStatus = 0;
        configureReportDefaultRsp = false;
        enroll170 = true;
        options.network.channelList = [15];

        for (const event in events) {
            events[event] = [];
        }

        Device.resetCache();
        Group.resetCache();

        if (fs.existsSync(options.databasePath)) {
            fs.unlinkSync(options.databasePath);
        }
        controller = new Controller(options);
        controller.on('permitJoinChanged', (data) => events.permitJoinChanged.push(data));
        controller.on('deviceJoined', (data) => events.deviceJoined.push(data));
        controller.on('deviceInterview', (data) => events.deviceInterview.push(deepClone(data)));
        controller.on('adapterDisconnected', () => events.adapterDisconnected.push(1));
        controller.on('deviceAnnounce', (data) => events.deviceAnnounce.push(data));
        controller.on('deviceLeave', (data) => events.deviceLeave.push(data));
        controller.on('message', (data) => events.message.push(data));
        controller.on('lastSeenChanged', (data) => events.lastSeenChanged.push(data));
        controller.on('deviceNetworkAddressChanged', (data) => events.deviceNetworkAddressChanged.push(data));
        restoreMocksendZclFrameToEndpoint();
    });

    it('Call controller constructor options mixed with default options', async () => {
        await controller.start();
        expect(ZStackAdapter).toHaveBeenCalledWith(
            {
                networkKeyDistribute: false,
                networkKey: [1, 3, 5, 7, 9, 11, 13, 15, 0, 2, 4, 6, 8, 10, 12, 13],
                panID: 6755,
                extendedPanID: [221, 221, 221, 221, 221, 221, 221, 221],
                channelList: [15],
            },
            {baudRate: 115200, path: '/dev/ttyUSB0', rtscts: true, adapter: 'zstack'},
            backupPath,
            {disableLED: false},
        );
    }, 10000); // randomly times out for some reason

    it('Call controller constructor error on invalid channel', async () => {
        options.network.channelList = [10];
        expect(() => {
            new Controller(options);
        }).toThrowError("'10' is an invalid channel, use a channel between 11 - 26.");
    });

    it('Call controller constructor error when network key too small', async () => {
        const newOptions = deepClone(options);
        newOptions.network.networkKey = [1, 2, 3];
        expect(() => {
            new Controller(newOptions);
        }).toThrowError(`Network key must be a 16 digits long array, got ${newOptions.network.networkKey}.`);
    });

    it('Call controller constructor error when extendedPanID is too long', async () => {
        const newOptions = deepClone(options);
        newOptions.network.extendedPanID = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
        expect(() => {
            new Controller(newOptions);
        }).toThrowError(`ExtendedPanID must be an 8 digits long array, got ${newOptions.network.extendedPanID}.`);
    });

    it('Call controller constructor error with invalid panID', async () => {
        const newOptions = deepClone(options);
        newOptions.network.panID = 0xffff;
        expect(() => {
            new Controller(newOptions);
        }).toThrowError('PanID must have a value of 0x0001 (1) - 0xFFFE (65534), got 65535.');

        newOptions.network.panID = 0;
        expect(() => {
            new Controller(newOptions);
        }).toThrowError('PanID must have a value of 0x0001 (1) - 0xFFFE (65534), got 0.');
    });

    it('Controller stop, should create backup', async () => {
        // @ts-expect-error private
        const databaseSaveSpy = vi.spyOn(controller, 'databaseSave');
        await controller.start();
        // @ts-expect-error private
        databaseSaveSpy.mockClear();
        if (fs.existsSync(options.backupPath)) fs.unlinkSync(options.backupPath);
        expect(controller.isStopping()).toBeFalsy();
        expect(controller.isAdapterDisconnected()).toBeFalsy();
        await controller.stop();
        expect(controller.isStopping()).toBeTruthy();
        expect(controller.isAdapterDisconnected()).toBeTruthy();
        expect(mockAdapterPermitJoin).toHaveBeenCalledWith(0);
        expect(JSON.parse(fs.readFileSync(options.backupPath).toString())).toStrictEqual(JSON.parse(JSON.stringify(dummyBackup)));
        expect(mockAdapterStop).toHaveBeenCalledTimes(1);
        expect(databaseSaveSpy).toHaveBeenCalledTimes(1);
    });

    it('Syncs runtime lookups', async () => {
        await controller.start();
        // @ts-expect-error private
        Device.devices.clear();
        // @ts-expect-error private
        Device.deletedDevices.clear();
        // @ts-expect-error private
        Group.groups.clear();

        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        // @ts-expect-error private
        expect(Device.devices.size).toStrictEqual(1);
        // @ts-expect-error private
        expect(Device.deletedDevices.size).toStrictEqual(0);
        expect(Device.byIeeeAddr('0x129', false)).toBeInstanceOf(Device);
        expect(Device.byIeeeAddr('0x128', false)).toBeUndefined();

        await mockAdapterEvents['deviceJoined']({networkAddress: 128, ieeeAddr: '0x128'});
        await mockAdapterEvents['deviceLeave']({networkAddress: 128, ieeeAddr: '0x128'});
        // @ts-expect-error private
        expect(Device.devices.size).toStrictEqual(1);
        // @ts-expect-error private
        expect(Device.deletedDevices.size).toStrictEqual(1);
        expect(Device.byIeeeAddr('0x128', false)).toBeUndefined();
        expect(Device.byIeeeAddr('0x128', true)).toBeInstanceOf(Device);

        await mockAdapterEvents['deviceJoined']({networkAddress: 128, ieeeAddr: '0x128'});
        // @ts-expect-error private
        expect(Device.devices.size).toStrictEqual(2);
        // @ts-expect-error private
        expect(Device.deletedDevices.size).toStrictEqual(0);
        const device2 = Device.byIeeeAddr('0x128', false);
        expect(device2).toBeInstanceOf(Device);
        expect(() => {
            device2!.undelete();
        }).toThrow(`Device '0x128' is not deleted`);

        controller.createGroup(1);
        // @ts-expect-error private
        expect(Group.groups.size).toStrictEqual(1);
        expect(Group.byGroupID(1)).toBeInstanceOf(Group);
        expect(Group.byGroupID(2)).toBeUndefined();

        const group2 = controller.createGroup(2);
        group2.removeFromNetwork();
        // @ts-expect-error private
        expect(Group.groups.size).toStrictEqual(1);
        expect(Group.byGroupID(1)).toBeInstanceOf(Group);
        expect(Group.byGroupID(2)).toBeUndefined();

        await controller.stop();

        // @ts-expect-error private
        expect(Device.devices.size).toStrictEqual(0);
        // @ts-expect-error private
        expect(Device.deletedDevices.size).toStrictEqual(0);
        // @ts-expect-error private
        expect(Group.groups.size).toStrictEqual(0);
    });

    it('Controller start', async () => {
        await controller.start();
        expect(mockAdapterStart).toHaveBeenCalledTimes(1);
        expect(deepClone(controller.getDevicesByType('Coordinator')[0])).toStrictEqual({
            ID: 1,
            _events: {},
            _eventsCount: 0,
            _pendingRequestTimeout: 0,
            _customClusters: {},
            _endpoints: [
                {
                    deviceID: 3,
                    _events: {},
                    _eventsCount: 0,
                    inputClusters: [10],
                    outputClusters: [11],
                    pendingRequests: {
                        ID: 1,
                        deviceIeeeAddress: '0x0000012300000000',
                        sendInProgress: false,
                    },
                    profileID: 2,
                    ID: 1,
                    meta: {},
                    clusters: {},
                    deviceIeeeAddress: '0x0000012300000000',
                    deviceNetworkAddress: 0,
                    _binds: [],
                    _configuredReportings: [],
                },
                {
                    deviceID: 5,
                    _events: {},
                    _eventsCount: 0,
                    inputClusters: [1],
                    outputClusters: [0],
                    pendingRequests: {
                        ID: 2,
                        deviceIeeeAddress: '0x0000012300000000',
                        sendInProgress: false,
                    },
                    profileID: 3,
                    meta: {},
                    ID: 2,
                    clusters: {},
                    deviceIeeeAddress: '0x0000012300000000',
                    deviceNetworkAddress: 0,
                    _binds: [],
                    _configuredReportings: [],
                },
            ],
            _ieeeAddr: '0x0000012300000000',
            _interviewCompleted: true,
            _interviewing: false,
            _skipDefaultResponse: false,
            _manufacturerID: 0x0007,
            _networkAddress: 0,
            _type: 'Coordinator',
            meta: {},
        });
        expect(JSON.parse(fs.readFileSync(options.backupPath).toString())).toStrictEqual(JSON.parse(JSON.stringify(dummyBackup)));
        vi.advanceTimersByTime(86500000);
    });

    it('Controller update ieeeAddr if changed', async () => {
        await controller.start();
        expect(controller.getDevicesByType('Coordinator')[0].ieeeAddr).toStrictEqual('0x0000012300000000');
        await controller.stop();
        mockAdapterGetCoordinatorIEEE.mockReturnValueOnce('0x123444');
        await controller.start();
        expect(controller.getDevicesByType('Coordinator')[0].ieeeAddr).toStrictEqual('0x123444');
    });

    it('Touchlink factory reset first', async () => {
        await controller.start();
        let counter = 0;
        mocksendZclFrameInterPANBroadcast.mockImplementation(() => {
            counter++;
            if (counter === 1) {
                throw new Error('no response');
            } else if (counter === 2) {
                return {address: '0x0000012300000000'};
            }
        });
        const result = await controller.touchlinkFactoryResetFirst();
        expect(result).toBeTruthy();

        expect(mockSetChannelInterPAN).toHaveBeenCalledTimes(2);
        expect(mockSetChannelInterPAN).toHaveBeenCalledWith(11);
        expect(mockSetChannelInterPAN).toHaveBeenCalledWith(15);
        expect(mocksendZclFrameInterPANBroadcast).toHaveBeenCalledTimes(2);
        expect(deepClone(mocksendZclFrameInterPANBroadcast.mock.calls[0][0])).toStrictEqual({
            header: {
                frameControl: {reservedBits: 0, frameType: 1, direction: 0, disableDefaultResponse: true, manufacturerSpecific: false},
                transactionSequenceNumber: 0,
                commandIdentifier: 0,
            },
            payload: {transactionID: expect.any(Number), zigbeeInformation: 4, touchlinkInformation: 18},
            cluster: {
                ID: 4096,
                attributes: {},
                name: 'touchlink',
                commands: expect.any(Object),
                commandsResponse: expect.any(Object),
            },
            command: {
                ID: 0,
                response: 1,
                parameters: [
                    {name: 'transactionID', type: 35},
                    {name: 'zigbeeInformation', type: 24},
                    {name: 'touchlinkInformation', type: 24},
                ],
                name: 'scanRequest',
            },
        });
        expect(deepClone(mocksendZclFrameInterPANBroadcast.mock.calls[1][0])).toStrictEqual({
            header: {
                frameControl: {reservedBits: 0, frameType: 1, direction: 0, disableDefaultResponse: true, manufacturerSpecific: false},
                transactionSequenceNumber: 0,
                commandIdentifier: 0,
            },
            payload: {transactionID: expect.any(Number), zigbeeInformation: 4, touchlinkInformation: 18},
            cluster: {
                ID: 4096,
                attributes: {},
                name: 'touchlink',
                commands: expect.any(Object),
                commandsResponse: expect.any(Object),
            },
            command: {
                ID: 0,
                response: 1,
                parameters: [
                    {name: 'transactionID', type: 35},
                    {name: 'zigbeeInformation', type: 24},
                    {name: 'touchlinkInformation', type: 24},
                ],
                name: 'scanRequest',
            },
        });
        expect(mockRestoreChannelInterPAN).toHaveBeenCalledTimes(1);
        expect(mocksendZclFrameInterPANToIeeeAddr).toHaveBeenCalledTimes(2);
        expect(deepClone(mocksendZclFrameInterPANToIeeeAddr.mock.calls[0][0])).toStrictEqual({
            header: {
                frameControl: {reservedBits: 0, frameType: 1, direction: 0, disableDefaultResponse: true, manufacturerSpecific: false},
                transactionSequenceNumber: 0,
                commandIdentifier: 6,
            },
            payload: {transactionID: expect.any(Number), duration: 65535},
            cluster: {
                ID: 4096,
                attributes: {},
                name: 'touchlink',
                commands: expect.any(Object),
                commandsResponse: expect.any(Object),
            },
            command: {
                ID: 6,
                parameters: [
                    {name: 'transactionID', type: 35},
                    {name: 'duration', type: 33},
                ],
                name: 'identifyRequest',
            },
        });
        expect(deepClone(mocksendZclFrameInterPANToIeeeAddr.mock.calls[1][0])).toStrictEqual({
            header: {
                frameControl: {reservedBits: 0, frameType: 1, direction: 0, disableDefaultResponse: true, manufacturerSpecific: false},
                transactionSequenceNumber: 0,
                commandIdentifier: 7,
            },
            payload: {transactionID: expect.any(Number)},
            cluster: {
                ID: 4096,
                attributes: {},
                name: 'touchlink',
                commands: expect.any(Object),
                commandsResponse: expect.any(Object),
            },
            command: {ID: 7, parameters: [{name: 'transactionID', type: 35}], name: 'resetToFactoryNew'},
        });
    });

    it('Touchlink scan', async () => {
        await controller.start();
        let counter = 0;
        mocksendZclFrameInterPANBroadcast.mockImplementation(() => {
            counter++;
            if (counter === 1) {
                throw new Error('no response');
            } else if (counter === 2) {
                return {address: '0x0000012300000000'};
            }
        });
        const result = await controller.touchlinkScan();
        expect(result).toStrictEqual([{ieeeAddr: '0x0000012300000000', channel: 15}]);

        expect(mockSetChannelInterPAN).toHaveBeenCalledTimes(16);
        expect(mockSetChannelInterPAN).toHaveBeenCalledWith(11);
        expect(mockSetChannelInterPAN).toHaveBeenCalledWith(15);
        expect(mocksendZclFrameInterPANBroadcast).toHaveBeenCalledTimes(16);
        expect(deepClone(mocksendZclFrameInterPANBroadcast.mock.calls[0][0])).toStrictEqual({
            header: {
                frameControl: {reservedBits: 0, frameType: 1, direction: 0, disableDefaultResponse: true, manufacturerSpecific: false},
                transactionSequenceNumber: 0,
                commandIdentifier: 0,
            },
            payload: {transactionID: expect.any(Number), zigbeeInformation: 4, touchlinkInformation: 18},
            cluster: {
                ID: 4096,
                attributes: {},
                name: 'touchlink',
                commands: expect.any(Object),
                commandsResponse: expect.any(Object),
            },
            command: {
                ID: 0,
                response: 1,
                parameters: [
                    {name: 'transactionID', type: 35},
                    {name: 'zigbeeInformation', type: 24},
                    {name: 'touchlinkInformation', type: 24},
                ],
                name: 'scanRequest',
            },
        });
        expect(deepClone(mocksendZclFrameInterPANBroadcast.mock.calls[1][0])).toStrictEqual({
            header: {
                frameControl: {reservedBits: 0, frameType: 1, direction: 0, disableDefaultResponse: true, manufacturerSpecific: false},
                transactionSequenceNumber: 0,
                commandIdentifier: 0,
            },
            payload: {transactionID: expect.any(Number), zigbeeInformation: 4, touchlinkInformation: 18},
            cluster: {
                ID: 4096,
                attributes: {},
                name: 'touchlink',
                commands: expect.any(Object),
                commandsResponse: expect.any(Object),
            },
            command: {
                ID: 0,
                response: 1,
                parameters: [
                    {name: 'transactionID', type: 35},
                    {name: 'zigbeeInformation', type: 24},
                    {name: 'touchlinkInformation', type: 24},
                ],
                name: 'scanRequest',
            },
        });
        expect(mockRestoreChannelInterPAN).toHaveBeenCalledTimes(1);
        expect(mocksendZclFrameInterPANToIeeeAddr).toHaveBeenCalledTimes(0);
    });

    it('Touchlink lock', async () => {
        await controller.start();
        let resolve;
        mockSetChannelInterPAN.mockImplementationOnce(() => {
            return new Promise((r) => {
                resolve = r;
            });
        });
        const r1 = controller.touchlinkScan();

        let error;
        try {
            await controller.touchlinkScan();
        } catch (e) {
            error = e;
        }
        expect(error).toStrictEqual(new Error('Touchlink operation already in progress'));
        resolve();
        await r1;
    });

    it('Touchlink factory reset', async () => {
        await controller.start();
        mocksendZclFrameInterPANBroadcast.mockImplementation(() => {
            return {address: '0x0000012300000000'};
        });
        await controller.touchlinkFactoryReset('0x0000012300000000', 15);

        expect(mockSetChannelInterPAN).toHaveBeenCalledTimes(1);
        expect(mockSetChannelInterPAN).toHaveBeenCalledWith(15);
        expect(mocksendZclFrameInterPANBroadcast).toHaveBeenCalledTimes(1);
        expect(deepClone(mocksendZclFrameInterPANBroadcast.mock.calls[0][0])).toStrictEqual({
            header: {
                frameControl: {reservedBits: 0, frameType: 1, direction: 0, disableDefaultResponse: true, manufacturerSpecific: false},
                transactionSequenceNumber: 0,
                commandIdentifier: 0,
            },
            payload: {transactionID: expect.any(Number), zigbeeInformation: 4, touchlinkInformation: 18},
            cluster: {
                ID: 4096,
                attributes: {},
                name: 'touchlink',
                commands: expect.any(Object),
                commandsResponse: expect.any(Object),
            },
            command: {
                ID: 0,
                response: 1,
                parameters: [
                    {name: 'transactionID', type: 35},
                    {name: 'zigbeeInformation', type: 24},
                    {name: 'touchlinkInformation', type: 24},
                ],
                name: 'scanRequest',
            },
        });
        expect(mockRestoreChannelInterPAN).toHaveBeenCalledTimes(1);
        expect(mocksendZclFrameInterPANToIeeeAddr).toHaveBeenCalledTimes(2);
        expect(deepClone(mocksendZclFrameInterPANToIeeeAddr.mock.calls[0][0])).toStrictEqual({
            header: {
                frameControl: {reservedBits: 0, frameType: 1, direction: 0, disableDefaultResponse: true, manufacturerSpecific: false},
                transactionSequenceNumber: 0,
                commandIdentifier: 6,
            },
            payload: {transactionID: expect.any(Number), duration: 65535},
            cluster: {
                ID: 4096,
                attributes: {},
                name: 'touchlink',
                commands: expect.any(Object),
                commandsResponse: expect.any(Object),
            },
            command: {
                ID: 6,
                parameters: [
                    {name: 'transactionID', type: 35},
                    {name: 'duration', type: 33},
                ],
                name: 'identifyRequest',
            },
        });
        expect(deepClone(mocksendZclFrameInterPANToIeeeAddr.mock.calls[1][0])).toStrictEqual({
            header: {
                frameControl: {reservedBits: 0, frameType: 1, direction: 0, disableDefaultResponse: true, manufacturerSpecific: false},
                transactionSequenceNumber: 0,
                commandIdentifier: 7,
            },
            payload: {transactionID: expect.any(Number)},
            cluster: {
                ID: 4096,
                attributes: {},
                name: 'touchlink',
                commands: expect.any(Object),
                commandsResponse: expect.any(Object),
            },
            command: {ID: 7, parameters: [{name: 'transactionID', type: 35}], name: 'resetToFactoryNew'},
        });
    });

    it('Touchlink identify', async () => {
        await controller.start();
        mocksendZclFrameInterPANBroadcast.mockImplementation(() => {
            return {address: '0x0000012300000000'};
        });
        await controller.touchlinkIdentify('0x0000012300000000', 15);

        expect(mockSetChannelInterPAN).toHaveBeenCalledTimes(1);
        expect(mockSetChannelInterPAN).toHaveBeenCalledWith(15);
        expect(mocksendZclFrameInterPANBroadcast).toHaveBeenCalledTimes(1);
        expect(deepClone(mocksendZclFrameInterPANBroadcast.mock.calls[0][0])).toStrictEqual({
            header: {
                frameControl: {reservedBits: 0, frameType: 1, direction: 0, disableDefaultResponse: true, manufacturerSpecific: false},
                transactionSequenceNumber: 0,
                commandIdentifier: 0,
            },
            payload: {transactionID: expect.any(Number), zigbeeInformation: 4, touchlinkInformation: 18},
            cluster: {
                ID: 4096,
                attributes: {},
                name: 'touchlink',
                commands: expect.any(Object),
                commandsResponse: expect.any(Object),
            },
            command: {
                ID: 0,
                response: 1,
                parameters: [
                    {name: 'transactionID', type: 35},
                    {name: 'zigbeeInformation', type: 24},
                    {name: 'touchlinkInformation', type: 24},
                ],
                name: 'scanRequest',
            },
        });
        expect(mockRestoreChannelInterPAN).toHaveBeenCalledTimes(1);
        expect(mocksendZclFrameInterPANToIeeeAddr).toHaveBeenCalledTimes(1);
        expect(deepClone(mocksendZclFrameInterPANToIeeeAddr.mock.calls[0][0])).toStrictEqual({
            header: {
                frameControl: {reservedBits: 0, frameType: 1, direction: 0, disableDefaultResponse: true, manufacturerSpecific: false},
                transactionSequenceNumber: 0,
                commandIdentifier: 6,
            },
            payload: {transactionID: expect.any(Number), duration: 65535},
            cluster: {
                ID: 4096,
                attributes: {},
                name: 'touchlink',
                commands: expect.any(Object),
                commandsResponse: expect.any(Object),
            },
            command: {
                ID: 6,
                parameters: [
                    {name: 'transactionID', type: 35},
                    {name: 'duration', type: 33},
                ],
                name: 'identifyRequest',
            },
        });
    });

    it('Controller should ignore touchlink messages', async () => {
        const frame = Zcl.Frame.create(
            Zcl.FrameType.SPECIFIC,
            Zcl.Direction.SERVER_TO_CLIENT,
            false,
            undefined,
            1,
            'scanResponse',
            Zcl.Utils.getCluster('touchlink', undefined, {}).ID,
            {
                transactionID: 1,
                rssiCorrection: 1,
                zigbeeInformation: 1,
                touchlinkInformation: 1,
                keyBitmask: 1,
                responseID: 1,
                extendedPanID: '0x001788010de23e6e',
                networkUpdateID: 1,
                logicalChannel: 1,
                panID: 1,
                networkAddress: 1,
                numberOfSubDevices: 0,
                totalGroupIdentifiers: 1,
            },
            {},
        );

        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            networkAddress: 129,
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: 1,
            linkquality: 50,
            groupID: 1,
        });

        expect(events.message.length).toBe(0);
    });

    it('Device should update properties when reported', async () => {
        const frame = Zcl.Frame.create(0, 1, true, undefined, 10, 'readRsp', 0, [{attrId: 5, status: 0, dataType: 66, attrData: 'new.model.id'}], {});
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        expect(Device.byIeeeAddr('0x129')!.modelID).toBe('myModelID');
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            address: 129,
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: 1,
            linkquality: 50,
            groupID: 1,
        });

        expect(Device.byIeeeAddr('0x129')!.modelID).toBe('new.model.id');
    });

    it('Change channel on start', async () => {
        mockAdapterStart.mockReturnValueOnce('resumed');
        mockAdapterGetNetworkParameters.mockReturnValueOnce({panID: 1, extendedPanID: '0x64c5fd698daf0c00', channel: 25});
        // @ts-expect-error private
        const changeChannelSpy = vi.spyOn(controller, 'changeChannel');
        await controller.start();
        expect(mockAdapterGetNetworkParameters).toHaveBeenCalledTimes(1);
        const zdoPayload = Zdo.Buffalo.buildRequest(false, Zdo.ClusterId.NWK_UPDATE_REQUEST, [15], 0xfe, undefined, 1, undefined);
        expect(mockAdapterSendZdo).toHaveBeenCalledWith(
            ZSpec.BLANK_EUI64,
            ZSpec.BroadcastAddress.SLEEPY,
            Zdo.ClusterId.NWK_UPDATE_REQUEST,
            zdoPayload,
            true,
        );
        expect(await controller.getNetworkParameters()).toEqual({panID: 1, channel: 15, extendedPanID: '0x64c5fd698daf0c00'});
        expect(changeChannelSpy).toHaveBeenCalledTimes(1);
    });

    it('Change channel on start when nwkUpdateID is 0xff', async () => {
        mockAdapterStart.mockReturnValueOnce('resumed');
        mockAdapterGetNetworkParameters.mockReturnValueOnce({panID: 1, extendedPanID: '0x64c5fd698daf0c00', channel: 25, nwkUpdateID: 0xff});
        // @ts-expect-error private
        const changeChannelSpy = vi.spyOn(controller, 'changeChannel');
        await controller.start();
        expect(mockAdapterGetNetworkParameters).toHaveBeenCalledTimes(1);
        const zdoPayload = Zdo.Buffalo.buildRequest(false, Zdo.ClusterId.NWK_UPDATE_REQUEST, [15], 0xfe, undefined, 0, undefined);
        expect(mockAdapterSendZdo).toHaveBeenCalledWith(
            ZSpec.BLANK_EUI64,
            ZSpec.BroadcastAddress.SLEEPY,
            Zdo.ClusterId.NWK_UPDATE_REQUEST,
            zdoPayload,
            true,
        );
        expect(await controller.getNetworkParameters()).toEqual({panID: 1, channel: 15, extendedPanID: '0x64c5fd698daf0c00'});
        expect(changeChannelSpy).toHaveBeenCalledTimes(1);
    });

    it('Does not change channel on start if not changed', async () => {
        mockAdapterStart.mockReturnValueOnce('resumed');
        // @ts-expect-error private
        const changeChannelSpy = vi.spyOn(controller, 'changeChannel');
        await controller.start();
        expect(mockAdapterGetNetworkParameters).toHaveBeenCalledTimes(1);
        expect(changeChannelSpy).toHaveBeenCalledTimes(0);
    });

    it('Get coordinator version', async () => {
        await controller.start();
        expect(await controller.getCoordinatorVersion()).toEqual({type: 'zStack', meta: {version: 1}});
    });

    it('Get network parameters', async () => {
        await controller.start();
        expect(await controller.getNetworkParameters()).toEqual({panID: 1, channel: 15, extendedPanID: '0x64c5fd698daf0c00'});
        // cached
        expect(await controller.getNetworkParameters()).toEqual({panID: 1, channel: 15, extendedPanID: '0x64c5fd698daf0c00'});
        expect(mockAdapterGetNetworkParameters).toHaveBeenCalledTimes(1);
    });

    it('Iterates over all devices', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        let devices = 0;

        for (const device of controller.getDevicesIterator()) {
            expect(device).toBeInstanceOf(Device);

            devices += 1;
        }

        expect(devices).toStrictEqual(2); // + coordinator
    });

    it('Iterates over devices with predicate', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        let devices = 0;

        for (const device of controller.getDevicesIterator((d) => d.networkAddress === 129)) {
            expect(device).toBeInstanceOf(Device);

            devices += 1;
        }

        expect(devices).toStrictEqual(1);
    });

    it('Iterates over all groups', async () => {
        await controller.start();
        controller.createGroup(1);
        controller.createGroup(2);

        let groups = 0;

        for (const group of controller.getGroupsIterator()) {
            expect(group).toBeInstanceOf(Group);

            groups += 1;
        }

        expect(groups).toStrictEqual(2);
    });

    it('Iterates over groups with predicate', async () => {
        await controller.start();
        controller.createGroup(1);
        controller.createGroup(2);

        let groups = 0;

        for (const group of controller.getGroupsIterator((d) => d.groupID === 1)) {
            expect(group).toBeInstanceOf(Group);

            groups += 1;
        }

        expect(groups).toStrictEqual(1);
    });

    it('Join a device', async () => {
        await controller.start();
        expect(databaseContents().includes('0x129')).toBeFalsy();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        expect(equalsPartial(events.deviceJoined[0].device, {ID: 2, networkAddress: 129, ieeeAddr: '0x129'})).toBeTruthy();
        expect(events.deviceInterview[0]).toStrictEqual({
            device: {
                _events: {},
                _eventsCount: 0,
                meta: {},
                _skipDefaultResponse: false,
                _lastSeen: Date.now(),
                ID: 2,
                _pendingRequestTimeout: 0,
                _customClusters: {},
                _endpoints: [],
                _type: 'Unknown',
                _ieeeAddr: '0x129',
                _interviewCompleted: false,
                _interviewing: false,
                _networkAddress: 129,
            },
            status: 'started',
        });
        const device = {
            ID: 2,
            _events: {},
            _eventsCount: 0,
            _pendingRequestTimeout: 0,
            _skipDefaultResponse: false,
            _lastSeen: Date.now(),
            _type: 'Router',
            _ieeeAddr: '0x129',
            _networkAddress: 129,
            meta: {},
            _customClusters: {},
            _endpoints: [
                {
                    _events: {},
                    _eventsCount: 0,
                    clusters: {},
                    ID: 1,
                    inputClusters: [0, 1],
                    outputClusters: [2],
                    pendingRequests: {ID: 1, deviceIeeeAddress: '0x129', sendInProgress: false},
                    deviceNetworkAddress: 129,
                    deviceIeeeAddress: '0x129',
                    _binds: [],
                    _configuredReportings: [],
                    meta: {},
                    deviceID: 5,
                    profileID: 99,
                },
            ],
            _manufacturerID: 1212,
            _manufacturerName: 'KoenAndCo',
            _powerSource: 'Mains (single phase)',
            _modelID: 'myModelID',
            _applicationVersion: 2,
            _stackVersion: 101,
            _zclVersion: 1,
            _hardwareVersion: 3,
            _dateCode: '201901',
            _softwareBuildID: '1.01',
            _interviewCompleted: true,
            _interviewing: false,
        };
        expect(events.deviceInterview[1]).toStrictEqual({status: 'successful', device: device});
        expect(deepClone(controller.getDeviceByNetworkAddress(129))).toStrictEqual(device);
        expect(events.deviceInterview.length).toBe(2);
        expect(databaseContents()).toStrictEqual(
            `{"id":1,"type":"Coordinator","ieeeAddr":"0x0000012300000000","nwkAddr":0,"manufId":7,"epList":[1,2],"endpoints":{"1":{"profId":2,"epId":1,"devId":3,"inClusterList":[10],"outClusterList":[11],"clusters":{},"binds":[],"configuredReportings":[],"meta":{}},"2":{"profId":3,"epId":2,"devId":5,"inClusterList":[1],"outClusterList":[0],"clusters":{},"binds":[],"configuredReportings":[],"meta":{}}},"interviewCompleted":true,"meta":{}}\n{"id":2,"type":"Router","ieeeAddr":"0x129","nwkAddr":129,"manufId":1212,"manufName":"KoenAndCo","powerSource":"Mains (single phase)","modelId":"myModelID","epList":[1],"endpoints":{"1":{"profId":99,"epId":1,"devId":5,"inClusterList":[0,1],"outClusterList":[2],"clusters":{},"binds":[],"configuredReportings":[],"meta":{}}},"appVersion":2,"stackVersion":101,"hwVersion":3,"dateCode":"201901","swBuildId":"1.01","zclVersion":1,"interviewCompleted":true,"meta":{},"lastSeen":${mockedDate.getTime()}}`,
        );
        expect(controller.getDeviceByNetworkAddress(129)!.lastSeen).toBe(Date.now());
    });

    it('Join a device and explictly accept it', async () => {
        controller = new Controller(options);
        controller.on('deviceJoined', (device) => events.deviceJoined.push(device));
        controller.on('deviceInterview', (device) => events.deviceInterview.push(deepClone(device)));
        await controller.start();
        expect(databaseContents().includes('0x129')).toBeFalsy();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        expect(equalsPartial(events.deviceJoined[0].device, {ID: 2, networkAddress: 129, ieeeAddr: '0x129'})).toBeTruthy();
        expect(events.deviceInterview[0]).toStrictEqual({
            device: {
                meta: {},
                _skipDefaultResponse: false,
                _events: {},
                _eventsCount: 0,
                _lastSeen: Date.now(),
                ID: 2,
                _pendingRequestTimeout: 0,
                _customClusters: {},
                _endpoints: [],
                _ieeeAddr: '0x129',
                _interviewCompleted: false,
                _interviewing: false,
                _networkAddress: 129,
                _type: 'Unknown',
            },
            status: 'started',
        });
        const device = {
            ID: 2,
            _events: {},
            _eventsCount: 0,
            _pendingRequestTimeout: 0,
            _skipDefaultResponse: false,
            _lastSeen: Date.now(),
            _type: 'Router',
            _ieeeAddr: '0x129',
            _networkAddress: 129,
            meta: {},
            _customClusters: {},
            _endpoints: [
                {
                    _events: {},
                    _eventsCount: 0,
                    clusters: {},
                    ID: 1,
                    inputClusters: [0, 1],
                    meta: {},
                    outputClusters: [2],
                    pendingRequests: {ID: 1, deviceIeeeAddress: '0x129', sendInProgress: false},
                    deviceNetworkAddress: 129,
                    deviceIeeeAddress: '0x129',
                    _binds: [],
                    _configuredReportings: [],
                    deviceID: 5,
                    profileID: 99,
                },
            ],
            _manufacturerID: 1212,
            _manufacturerName: 'KoenAndCo',
            _powerSource: 'Mains (single phase)',
            _modelID: 'myModelID',
            _applicationVersion: 2,
            _stackVersion: 101,
            _zclVersion: 1,
            _hardwareVersion: 3,
            _dateCode: '201901',
            _softwareBuildID: '1.01',
            _interviewCompleted: true,
            _interviewing: false,
        };
        expect(events.deviceInterview[1]).toStrictEqual({status: 'successful', device: device});
        expect(deepClone(controller.getDeviceByIeeeAddr('0x129'))).toStrictEqual(device);
        expect(events.deviceInterview.length).toBe(2);
        expect(databaseContents().includes('0x129')).toBeTruthy();
        expect(controller.getDeviceByIeeeAddr('0x129')!.lastSeen).toBe(Date.now());
    });

    it('Join a device and explictly refuses it', async () => {
        mockAcceptJoiningDeviceHandler.mockResolvedValueOnce(false);
        controller = new Controller(options);
        controller.on('deviceJoined', (device) => events.deviceJoined.push(device));
        controller.on('deviceInterview', (device) => events.deviceInterview.push(deepClone(device)));
        await controller.start();
        mockAdapterSendZdo.mockClear();
        expect(databaseContents().includes('0x129')).toBeFalsy();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        expect(events.deviceJoined.length).toBe(0);
        expect(events.deviceInterview.length).toBe(0);
        expect(databaseContents().includes('0x129')).toBeFalsy();
        expect(controller.getDeviceByIeeeAddr('0x129')).toBeUndefined();
        const zdoPayload = Zdo.Buffalo.buildRequest(false, Zdo.ClusterId.LEAVE_REQUEST, '0x129', Zdo.LeaveRequestFlags.WITHOUT_REJOIN);
        expect(mockAdapterSendZdo).toHaveBeenNthCalledWith(1, '0x129', 129, Zdo.ClusterId.LEAVE_REQUEST, zdoPayload, false);
    });

    it('Join a device and explictly refuses it but LEAVE request fails', async () => {
        mockAcceptJoiningDeviceHandler.mockResolvedValueOnce(false);
        controller = new Controller(options);
        controller.on('deviceJoined', (device) => events.deviceJoined.push(device));
        controller.on('deviceInterview', (device) => events.deviceInterview.push(deepClone(device)));
        await controller.start();
        mockAdapterSendZdo.mockClear();
        expect(databaseContents().includes('0x129')).toBeFalsy();
        sendZdoResponseStatus = Zdo.Status.NOT_SUPPORTED;
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        expect(events.deviceJoined.length).toBe(0);
        expect(events.deviceInterview.length).toBe(0);
        expect(databaseContents().includes('0x129')).toBeFalsy();
        expect(controller.getDeviceByIeeeAddr('0x129')).toBeUndefined();
        const zdoPayload = Zdo.Buffalo.buildRequest(false, Zdo.ClusterId.LEAVE_REQUEST, '0x129', Zdo.LeaveRequestFlags.WITHOUT_REJOIN);
        expect(mockAdapterSendZdo).toHaveBeenNthCalledWith(1, '0x129', 129, Zdo.ClusterId.LEAVE_REQUEST, zdoPayload, false);
        expect(mockLogger.error).toHaveBeenCalledWith(`Failed to remove rejected device: Status 'NOT_SUPPORTED'`, 'zh:controller');
    });

    it('Set device powersource by string', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        device.powerSource = 'test123';
        expect(device.powerSource).toBe('test123');
    });

    it('Get device should return same instance', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        expect(controller.getDeviceByIeeeAddr('0x129')).toBe(controller.getDeviceByIeeeAddr('0x129'));
    });

    it('Device announce event', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        expect(events.deviceAnnounce.length).toBe(0);
        // @ts-expect-error private
        const onDeviceAnnounceSpy = vi.spyOn(controller, 'onDeviceAnnounce');
        await mockAdapterEvents['zdoResponse'](Zdo.ClusterId.END_DEVICE_ANNOUNCE, [
            Zdo.Status.SUCCESS,
            {nwkAddress: 129, eui64: '0x129', capabilities: Zdo.Utils.getMacCapFlags(0x10)},
        ]);
        expect(onDeviceAnnounceSpy).toHaveBeenCalledTimes(1);
        expect(events.deviceAnnounce.length).toBe(1);
        expect(events.deviceAnnounce[0].device).toBeInstanceOf(Device);
        expect(events.deviceAnnounce[0].device.ieeeAddr).toBe('0x129');
        expect(events.deviceAnnounce[0].device.modelID).toBe('myModelID');
    });

    it('Skip Device announce event from unknown device', async () => {
        await controller.start();
        // @ts-expect-error private
        const onDeviceAnnounceSpy = vi.spyOn(controller, 'onDeviceAnnounce');
        await mockAdapterEvents['zdoResponse'](Zdo.ClusterId.END_DEVICE_ANNOUNCE, [
            Zdo.Status.SUCCESS,
            {nwkAddress: 12999, eui64: '0x12999', capabilities: Zdo.Utils.getMacCapFlags(0x10)},
        ]);
        expect(onDeviceAnnounceSpy).toHaveBeenCalledTimes(1);
        expect(events.deviceAnnounce.length).toBe(0);
    });

    it('Device announce event should update network address when different', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        expect(controller.getDeviceByNetworkAddress(129)!.ieeeAddr).toStrictEqual('0x129');
        expect(events.deviceAnnounce.length).toBe(0);
        // @ts-expect-error private
        const onDeviceAnnounceSpy = vi.spyOn(controller, 'onDeviceAnnounce');
        await mockAdapterEvents['zdoResponse'](Zdo.ClusterId.END_DEVICE_ANNOUNCE, [
            Zdo.Status.SUCCESS,
            {nwkAddress: 9999, eui64: '0x129', capabilities: Zdo.Utils.getMacCapFlags(0x10)},
        ]);
        expect(onDeviceAnnounceSpy).toHaveBeenCalledTimes(1);
        expect(controller.getDeviceByIeeeAddr('0x129')!.networkAddress).toBe(9999);
        expect(controller.getDeviceByIeeeAddr('0x129')!.getEndpoint(1)!.deviceNetworkAddress).toBe(9999);
        expect(controller.getDeviceByNetworkAddress(129)).toBeUndefined();
        expect(controller.getDeviceByNetworkAddress(9999)!.ieeeAddr).toStrictEqual('0x129');
    });

    it('Network address event should update network address when different', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        expect(controller.getDeviceByNetworkAddress(129)!.ieeeAddr).toStrictEqual('0x129');
        // @ts-expect-error private
        const onNetworkAddressSpy = vi.spyOn(controller, 'onNetworkAddress');
        await mockAdapterEvents['zdoResponse'](Zdo.ClusterId.NETWORK_ADDRESS_RESPONSE, [
            Zdo.Status.SUCCESS,
            {nwkAddress: 9999, eui64: '0x129', startIndex: 0, assocDevList: []},
        ]);
        expect(onNetworkAddressSpy).toHaveBeenCalledTimes(1);
        expect(controller.getDeviceByIeeeAddr('0x129')!.networkAddress).toBe(9999);
        expect(controller.getDeviceByIeeeAddr('0x129')!.getEndpoint(1)!.deviceNetworkAddress).toBe(9999);
        expect(controller.getDeviceByNetworkAddress(129)).toBeUndefined();
        expect(controller.getDeviceByNetworkAddress(9999)!.ieeeAddr).toStrictEqual('0x129');
    });

    it('Network address event shouldnt update network address when the same', async () => {
        await controller.start();
        // @ts-expect-error private
        const onNetworkAddressSpy = vi.spyOn(controller, 'onNetworkAddress');
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        await mockAdapterEvents['zdoResponse'](Zdo.ClusterId.NETWORK_ADDRESS_RESPONSE, [
            Zdo.Status.SUCCESS,
            {nwkAddress: 129, eui64: '0x129', startIndex: 0, assocDevList: []},
        ]);
        expect(onNetworkAddressSpy).toHaveBeenCalledTimes(1);
        expect(controller.getDeviceByIeeeAddr('0x129')?.networkAddress).toBe(129);
        expect(controller.getDeviceByIeeeAddr('0x129')?.getEndpoint(1)?.deviceNetworkAddress).toBe(129);
    });

    it('Network address event from unknown device', async () => {
        await controller.start();
        // @ts-expect-error private
        const onNetworkAddressSpy = vi.spyOn(controller, 'onNetworkAddress');
        await mockAdapterEvents['zdoResponse'](Zdo.ClusterId.NETWORK_ADDRESS_RESPONSE, [
            Zdo.Status.SUCCESS,
            {nwkAddress: 19321, eui64: '0x19321', startIndex: 0, assocDevList: []},
        ]);
        expect(onNetworkAddressSpy).toHaveBeenCalledTimes(1);
    });

    it('Network address event should update the last seen value', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const updatedMockedDate = new Date();
        vi.setSystemTime(updatedMockedDate);
        // @ts-expect-error private
        const onNetworkAddressSpy = vi.spyOn(controller, 'onNetworkAddress');
        await mockAdapterEvents['zdoResponse'](Zdo.ClusterId.NETWORK_ADDRESS_RESPONSE, [
            Zdo.Status.SUCCESS,
            {nwkAddress: 129, eui64: '0x129', startIndex: 0, assocDevList: []},
        ]);
        expect(onNetworkAddressSpy).toHaveBeenCalledTimes(1);
        expect(events.lastSeenChanged[1].device.lastSeen).toBe(updatedMockedDate.getTime());
    });

    it('IEEE address event should update network address when different', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        expect(controller.getDeviceByNetworkAddress(129)!.ieeeAddr).toStrictEqual('0x129');
        // @ts-expect-error private
        const onIEEEAddressSpy = vi.spyOn(controller, 'onIEEEAddress');
        await mockAdapterEvents['zdoResponse'](Zdo.ClusterId.IEEE_ADDRESS_RESPONSE, [
            Zdo.Status.SUCCESS,
            {nwkAddress: 9999, eui64: '0x129', startIndex: 0, assocDevList: []},
        ]);
        expect(onIEEEAddressSpy).toHaveBeenCalledTimes(1);
        expect(controller.getDeviceByIeeeAddr('0x129')!.networkAddress).toBe(9999);
        expect(controller.getDeviceByIeeeAddr('0x129')!.getEndpoint(1)!.deviceNetworkAddress).toBe(9999);
        expect(controller.getDeviceByNetworkAddress(129)).toBeUndefined();
        expect(controller.getDeviceByNetworkAddress(9999)!.ieeeAddr).toStrictEqual('0x129');
    });

    it('IEEE address event shouldnt update network address when the same', async () => {
        await controller.start();
        // @ts-expect-error private
        const onIEEEAddressSpy = vi.spyOn(controller, 'onIEEEAddress');
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        await mockAdapterEvents['zdoResponse'](Zdo.ClusterId.IEEE_ADDRESS_RESPONSE, [
            Zdo.Status.SUCCESS,
            {nwkAddress: 129, eui64: '0x129', startIndex: 0, assocDevList: []},
        ]);
        expect(onIEEEAddressSpy).toHaveBeenCalledTimes(1);
        expect(controller.getDeviceByIeeeAddr('0x129')?.networkAddress).toBe(129);
        expect(controller.getDeviceByIeeeAddr('0x129')?.getEndpoint(1)?.deviceNetworkAddress).toBe(129);
    });

    it('IEEE address event from unknown device', async () => {
        await controller.start();
        // @ts-expect-error private
        const onIEEEAddressSpy = vi.spyOn(controller, 'onIEEEAddress');
        await mockAdapterEvents['zdoResponse'](Zdo.ClusterId.IEEE_ADDRESS_RESPONSE, [
            Zdo.Status.SUCCESS,
            {nwkAddress: 19321, eui64: '0x19321', startIndex: 0, assocDevList: []},
        ]);
        expect(onIEEEAddressSpy).toHaveBeenCalledTimes(1);
    });

    it('IEEE address event should update the last seen value', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const updatedMockedDate = new Date();
        vi.setSystemTime(updatedMockedDate);
        // @ts-expect-error private
        const onIEEEAddressSpy = vi.spyOn(controller, 'onIEEEAddress');
        await mockAdapterEvents['zdoResponse'](Zdo.ClusterId.IEEE_ADDRESS_RESPONSE, [
            Zdo.Status.SUCCESS,
            {nwkAddress: 129, eui64: '0x129', startIndex: 0, assocDevList: []},
        ]);
        expect(onIEEEAddressSpy).toHaveBeenCalledTimes(1);
        expect(events.lastSeenChanged[1].device.lastSeen).toBe(updatedMockedDate.getTime());
    });

    it('ZDO response for NETWORK_ADDRESS_RESPONSE should update network address when different', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        expect(controller.getDeviceByNetworkAddress(129)?.ieeeAddr).toStrictEqual('0x129');
        await mockAdapterEvents['zdoResponse'](Zdo.ClusterId.NETWORK_ADDRESS_RESPONSE, [
            Zdo.Status.SUCCESS,
            {nwkAddress: 9999, eui64: '0x129', assocDevList: [], startIndex: 0},
        ]);
        expect(controller.getDeviceByIeeeAddr('0x129')?.networkAddress).toBe(9999);
        expect(controller.getDeviceByIeeeAddr('0x129')?.getEndpoint(1)?.deviceNetworkAddress).toBe(9999);
        expect(controller.getDeviceByNetworkAddress(129)).toBeUndefined();
        expect(controller.getDeviceByNetworkAddress(9999)?.ieeeAddr).toStrictEqual('0x129');
    });

    it('ZDO response for NETWORK_ADDRESS_RESPONSE shouldnt update network address when the same', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        await mockAdapterEvents['zdoResponse'](Zdo.ClusterId.NETWORK_ADDRESS_RESPONSE, [
            Zdo.Status.SUCCESS,
            {nwkAddress: 129, eui64: '0x129', assocDevList: [], startIndex: 0},
        ]);
        expect(controller.getDeviceByIeeeAddr('0x129')?.networkAddress).toBe(129);
        expect(controller.getDeviceByIeeeAddr('0x129')?.getEndpoint(1)?.deviceNetworkAddress).toBe(129);
    });

    it('ZDO response for NETWORK_ADDRESS_RESPONSE from unknown device', async () => {
        await controller.start();
        await mockAdapterEvents['zdoResponse'](Zdo.ClusterId.NETWORK_ADDRESS_RESPONSE, [
            Zdo.Status.SUCCESS,
            {nwkAddress: 19321, eui64: '0x19321', assocDevList: [], startIndex: 0},
        ]);
    });

    it('ZDO response for NETWORK_ADDRESS_RESPONSE should update the last seen value', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const updatedMockedDate = new Date();
        vi.setSystemTime(updatedMockedDate);
        await mockAdapterEvents['zdoResponse'](Zdo.ClusterId.NETWORK_ADDRESS_RESPONSE, [
            Zdo.Status.SUCCESS,
            {nwkAddress: 129, eui64: '0x129', assocDevList: [], startIndex: 0},
        ]);
        expect(events.lastSeenChanged[1].device.lastSeen).toBe(updatedMockedDate.getTime());
    });

    it('ZDO response for END_DEVICE_ANNOUNCE should bubble up event', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        expect(events.deviceAnnounce.length).toBe(0);
        await mockAdapterEvents['zdoResponse'](Zdo.ClusterId.END_DEVICE_ANNOUNCE, [
            Zdo.Status.SUCCESS,
            {
                nwkAddress: 129,
                eui64: '0x129',
                capabilities: {
                    allocateAddress: 0,
                    alternatePANCoordinator: 0,
                    deviceType: 2,
                    powerSource: 0,
                    reserved1: 0,
                    reserved2: 0,
                    rxOnWhenIdle: 0,
                    securityCapability: 0,
                },
            },
        ]);
        expect(events.deviceAnnounce.length).toBe(1);
        expect(events.deviceAnnounce[0].device).toBeInstanceOf(Device);
        expect(events.deviceAnnounce[0].device.ieeeAddr).toBe('0x129');
        expect(events.deviceAnnounce[0].device.modelID).toBe('myModelID');
    });

    it('ZDO response for END_DEVICE_ANNOUNCE should update network address when different', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        expect(controller.getDeviceByNetworkAddress(129)?.ieeeAddr).toStrictEqual('0x129');
        await mockAdapterEvents['zdoResponse'](Zdo.ClusterId.END_DEVICE_ANNOUNCE, [
            Zdo.Status.SUCCESS,
            {
                nwkAddress: 9999,
                eui64: '0x129',
                capabilities: {
                    allocateAddress: 0,
                    alternatePANCoordinator: 0,
                    deviceType: 2,
                    powerSource: 0,
                    reserved1: 0,
                    reserved2: 0,
                    rxOnWhenIdle: 0,
                    securityCapability: 0,
                },
            },
        ]);
        expect(controller.getDeviceByIeeeAddr('0x129')?.networkAddress).toBe(9999);
        expect(controller.getDeviceByIeeeAddr('0x129')?.getEndpoint(1)?.deviceNetworkAddress).toBe(9999);
        expect(controller.getDeviceByNetworkAddress(129)).toBeUndefined();
        expect(controller.getDeviceByNetworkAddress(9999)?.ieeeAddr).toStrictEqual('0x129');
    });

    it('ZDO response for END_DEVICE_ANNOUNCE from unknown device', async () => {
        await controller.start();
        await mockAdapterEvents['zdoResponse'](Zdo.ClusterId.END_DEVICE_ANNOUNCE, [
            Zdo.Status.SUCCESS,
            {
                nwkAddress: 12999,
                eui64: '0x12999',
                capabilities: {
                    allocateAddress: 0,
                    alternatePANCoordinator: 0,
                    deviceType: 2,
                    powerSource: 0,
                    reserved1: 0,
                    reserved2: 0,
                    rxOnWhenIdle: 0,
                    securityCapability: 0,
                },
            },
        ]);
        expect(events.deviceAnnounce.length).toBe(0);
    });

    it('ZDO response for cluster ID with no extra processing', async () => {
        await controller.start();
        await mockAdapterEvents['zdoResponse'](Zdo.ClusterId.BIND_RESPONSE, [Zdo.Status.SUCCESS, undefined]);
    });

    it('Emit lastSeenChanged event even when no message is emitted from it', async () => {
        // Default response
        const buffer = Buffer.from([0x18, 0x04, 0x0b, 0x0c, 0x82]);
        const frame = Zcl.Frame.fromBuffer(Zcl.Clusters.genBasic.ID, Zcl.Header.fromBuffer(buffer)!, buffer, {});
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        events.lastSeenChanged = [];
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            address: '0x129',
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: 1,
            linkquality: 50,
            groupID: 1,
        });

        expect(events.lastSeenChanged.length).toBe(1);
        expect(events.lastSeenChanged[0].device.ieeeAddr).toBe('0x129');
        expect(events.message.length).toBe(0);
    });

    it('Device leave event and remove from database', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        expect(controller.getDeviceByIeeeAddr('0x129')).toBeInstanceOf(Device);
        expect(events.deviceLeave.length).toBe(0);
        await mockAdapterEvents['deviceLeave']({networkAddress: 129, ieeeAddr: '0x129'});
        expect(events.deviceLeave.length).toBe(1);
        expect(events.deviceLeave[0]).toStrictEqual({ieeeAddr: '0x129'});
        expect(controller.getDeviceByIeeeAddr('0x129')).toBeUndefined();

        // leaves another time when not in database
        await mockAdapterEvents['deviceLeave']({networkAddress: 129, ieeeAddr: '0x129'});
        expect(events.deviceLeave.length).toBe(1);
    });

    it('Device leave event with only nwk addr and remove from database', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        expect(controller.getDeviceByNetworkAddress(129)).toBeInstanceOf(Device);
        expect(events.deviceLeave.length).toBe(0);
        await mockAdapterEvents['deviceLeave']({networkAddress: 129, ieeeAddr: undefined});
        expect(events.deviceLeave.length).toBe(1);
        expect(events.deviceLeave[0]).toStrictEqual({ieeeAddr: '0x129'});
        expect(controller.getDeviceByNetworkAddress(129)).toBeUndefined();
        expect(Device.byNetworkAddress(129, true)).toBeInstanceOf(Device);

        // leaves another time when not in database
        await mockAdapterEvents['deviceLeave']({networkAddress: 129, ieeeAddr: undefined});
        expect(events.deviceLeave.length).toBe(1);
    });

    it('Start with reset should clear database', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        await controller.createGroup(1);
        expect(controller.getGroupByID(1)).toBeInstanceOf(Group);
        expect(controller.getDeviceByIeeeAddr('0x129')).toBeInstanceOf(Device);
        expect(controller.getDevices().length).toBe(2);
        expect(controller.getDevicesByType('Coordinator')[0].type).toBe('Coordinator');
        expect(controller.getDevicesByType('Coordinator')[0].ieeeAddr).toBe('0x0000012300000000');
        expect(controller.getDevicesByType('Router')[0].ieeeAddr).toBe('0x129');
        expect(databaseContents().includes('0x129')).toBeTruthy();
        expect(databaseContents().includes('groupID')).toBeTruthy();
        await controller.stop();

        mockAdapterStart.mockReturnValueOnce('reset');
        await controller.start();
        expect(controller.getDevices().length).toBe(1);
        expect(controller.getDevicesByType('Coordinator')[0].type).toBe('Coordinator');
        expect(controller.getDeviceByIeeeAddr('0x129')).toBeUndefined();
        expect(controller.getGroupByID(1)).toBeUndefined();
        expect(databaseContents().includes('0x129')).toBeFalsy();
        expect(databaseContents().includes('groupID')).toBeFalsy();
    });

    it('Existing database.tmp should not be overwritten', async () => {
        const databaseTmpPath = options.databasePath + '.tmp';
        fs.writeFileSync(databaseTmpPath, 'Hello, World!');

        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        controller.createGroup(1);

        // The old database.db.tmp should be gone
        expect(fs.existsSync(databaseTmpPath)).toBeFalsy();

        // There should still be a database.db.tmp.<something>
        const dbtmp = fs.readdirSync(TEMP_PATH).filter((value) => value.startsWith('database.db.tmp'));
        expect(dbtmp.length).toBe(1);

        // The database.db.tmp.<something> should still have our "Hello, World!"
        expect(fs.readFileSync(getTempFile(dbtmp[0])).toString().startsWith('Hello, World!')).toBeTruthy();
    });

    it('Should create backup of databse before clearing when datbaseBackupPath is provided', async () => {
        const databaseBackupPath = getTempFile('database.backup');
        if (fs.existsSync(databaseBackupPath)) fs.unlinkSync(databaseBackupPath);
        controller = new Controller({...options, databaseBackupPath});
        expect(fs.existsSync(databaseBackupPath)).toBeFalsy();
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        await controller.createGroup(1);
        await controller.stop();
        mockAdapterStart.mockReturnValueOnce('reset');
        await controller.start();
        expect(fs.existsSync(databaseBackupPath)).toBeTruthy();
    });

    it('Add install code 18 byte', async () => {
        await controller.start();
        const code = 'RB01SG0D831018264800400000000000000000009035EAFFFE424783DLKAE3B287281CF16F550733A0CEC38AA31E802';
        await controller.addInstallCode(code);
        expect(mockAddInstallCode).toHaveBeenCalledTimes(1);
        expect(mockAddInstallCode).toHaveBeenCalledWith(
            '0x9035EAFFFE424783',
            Buffer.from([0xae, 0x3b, 0x28, 0x72, 0x81, 0xcf, 0x16, 0xf5, 0x50, 0x73, 0x3a, 0x0c, 0xec, 0x38, 0xaa, 0x31, 0xe8, 0x02]),
        );
    });

    it('Add install code 16 byte - missing CRC is appended', async () => {
        await controller.start();
        const code = 'RB01SG0D836591B3CC0010000000000000000000000D6F00179F2BC9DLKD0F471C9BBA2C0208608E91EED17E2B1';
        await controller.addInstallCode(code);
        expect(mockAddInstallCode).toHaveBeenCalledTimes(1);
        expect(mockAddInstallCode).toHaveBeenCalledWith(
            '0x000D6F00179F2BC9',
            Buffer.from([0xd0, 0xf4, 0x71, 0xc9, 0xbb, 0xa2, 0xc0, 0x20, 0x86, 0x08, 0xe9, 0x1e, 0xed, 0x17, 0xe2, 0xb1, 0x9a, 0xec]),
        );
        expect(mockLogger.info).toHaveBeenCalledWith(`Install code was adjusted for reason 'missing CRC'.`, 'zh:controller');
    });

    it('Add install code Aqara', async () => {
        await controller.start();
        const code = 'G$M:69775$S:680S00003915$D:0000000017B2335C%Z$A:54EF44100006E7DF$I:3313A005E177A647FC7925620AB207C4BEF5';
        await controller.addInstallCode(code);
        expect(mockAddInstallCode).toHaveBeenCalledTimes(1);
        expect(mockAddInstallCode).toHaveBeenCalledWith(
            '0x54EF44100006E7DF',
            Buffer.from([0x33, 0x13, 0xa0, 0x05, 0xe1, 0x77, 0xa6, 0x47, 0xfc, 0x79, 0x25, 0x62, 0x0a, 0xb2, 0x07, 0xc4, 0xbe, 0xf5]),
        );
    });

    it('Add install code pipe', async () => {
        await controller.start();
        const code = '54EF44100006E7DF|3313A005E177A647FC7925620AB207C4BEF5';
        await controller.addInstallCode(code);
        expect(mockAddInstallCode).toHaveBeenCalledTimes(1);
        expect(mockAddInstallCode).toHaveBeenCalledWith(
            '0x54EF44100006E7DF',
            Buffer.from([0x33, 0x13, 0xa0, 0x05, 0xe1, 0x77, 0xa6, 0x47, 0xfc, 0x79, 0x25, 0x62, 0x0a, 0xb2, 0x07, 0xc4, 0xbe, 0xf5]),
        );
    });

    it('Add install code invalid', async () => {
        await controller.start();

        const code = '54EF44100006E7DF|3313A005E177A647FC7925620AB207';

        await expect(controller.addInstallCode(code)).rejects.toThrow(`Install code 3313a005e177a647fc7925620ab207 has invalid size`);

        expect(mockAddInstallCode).toHaveBeenCalledTimes(0);
    });

    it('Controller permit joining all, disabled automatically', async () => {
        await controller.start();

        expect(controller.getPermitJoin()).toStrictEqual(false);
        expect(controller.getPermitJoinEnd()).toBeUndefined();

        const updatedMockedDate = new Date();
        vi.setSystemTime(updatedMockedDate);
        await controller.permitJoin(254);

        expect(mockAdapterPermitJoin).toHaveBeenCalledTimes(1);
        expect(mockAdapterPermitJoin).toHaveBeenNthCalledWith(1, 254, undefined);
        expect(events.permitJoinChanged.length).toStrictEqual(1);
        expect(events.permitJoinChanged[0]).toStrictEqual({permitted: true, time: 254});
        expect(controller.getPermitJoin()).toStrictEqual(true);
        expect(controller.getPermitJoinEnd()).toStrictEqual(updatedMockedDate.getTime() + 254 * 1000);

        // Green power
        const commisionFrameEnable = Zcl.Frame.create(1, 1, true, undefined, 2, 'commisioningMode', 33, {options: 0x0b, commisioningWindow: 254}, {});

        expect(mocksendZclFrameToAll).toHaveBeenCalledTimes(1);
        expect(mocksendZclFrameToAll).toHaveBeenNthCalledWith(
            1,
            ZSpec.GP_ENDPOINT,
            expect.any(Object),
            ZSpec.GP_ENDPOINT,
            ZSpec.BroadcastAddress.RX_ON_WHEN_IDLE,
        );
        expect(deepClone(mocksendZclFrameToAll.mock.calls[0][1])).toStrictEqual(deepClone(commisionFrameEnable));

        await vi.advanceTimersByTimeAsync(250 * 1000);

        expect(mocksendZclFrameToAll).toHaveBeenCalledTimes(1);
        expect(mockAdapterPermitJoin).toHaveBeenCalledTimes(1);
        expect(controller.getPermitJoin()).toStrictEqual(true);
        expect(controller.getPermitJoinEnd()).toStrictEqual(updatedMockedDate.getTime() + 254 * 1000);

        // Timer expired
        await vi.advanceTimersByTimeAsync(10 * 1000);

        expect(mockAdapterPermitJoin).toHaveBeenCalledTimes(1);
        expect(events.permitJoinChanged.length).toStrictEqual(2);
        expect(events.permitJoinChanged[1]).toStrictEqual({permitted: false});
        expect(controller.getPermitJoin()).toStrictEqual(false);
        expect(controller.getPermitJoinEnd()).toBeUndefined();

        // Green power
        expect(mocksendZclFrameToAll).toHaveBeenCalledTimes(1);
    });

    it('Controller permit joining all, disabled manually', async () => {
        await controller.start();

        expect(controller.getPermitJoin()).toStrictEqual(false);
        expect(controller.getPermitJoinEnd()).toBeUndefined();

        const updatedMockedDate = new Date();
        vi.setSystemTime(updatedMockedDate);
        await controller.permitJoin(254);

        expect(mockAdapterPermitJoin).toHaveBeenCalledTimes(1);
        expect(mockAdapterPermitJoin).toHaveBeenNthCalledWith(1, 254, undefined);
        expect(events.permitJoinChanged.length).toStrictEqual(1);
        expect(events.permitJoinChanged[0]).toStrictEqual({permitted: true, time: 254});
        expect(controller.getPermitJoin()).toStrictEqual(true);
        expect(controller.getPermitJoinEnd()).toStrictEqual(updatedMockedDate.getTime() + 254 * 1000);

        // Green power
        const commisionFrameEnable = Zcl.Frame.create(1, 1, true, undefined, 2, 'commisioningMode', 33, {options: 0x0b, commisioningWindow: 254}, {});

        expect(mocksendZclFrameToAll).toHaveBeenCalledTimes(1);
        expect(mocksendZclFrameToAll).toHaveBeenNthCalledWith(
            1,
            ZSpec.GP_ENDPOINT,
            expect.any(Object),
            ZSpec.GP_ENDPOINT,
            ZSpec.BroadcastAddress.RX_ON_WHEN_IDLE,
        );
        expect(deepClone(mocksendZclFrameToAll.mock.calls[0][1])).toStrictEqual(deepClone(commisionFrameEnable));

        await vi.advanceTimersByTimeAsync(250 * 1000);

        expect(mocksendZclFrameToAll).toHaveBeenCalledTimes(1);
        expect(mockAdapterPermitJoin).toHaveBeenCalledTimes(1);
        expect(controller.getPermitJoin()).toStrictEqual(true);
        expect(controller.getPermitJoinEnd()).toStrictEqual(updatedMockedDate.getTime() + 254 * 1000);

        // Disable
        await controller.permitJoin(0);

        expect(mockAdapterPermitJoin).toHaveBeenCalledTimes(2);
        expect(mockAdapterPermitJoin).toHaveBeenNthCalledWith(2, 0);
        expect(events.permitJoinChanged.length).toStrictEqual(2);
        expect(events.permitJoinChanged[1]).toStrictEqual({permitted: false});
        expect(controller.getPermitJoin()).toStrictEqual(false);
        expect(controller.getPermitJoinEnd()).toBeUndefined();

        // Green power
        const commissionFrameDisable = Zcl.Frame.create(1, 1, true, undefined, 3, 'commisioningMode', 33, {options: 0x0a, commisioningWindow: 0}, {});

        expect(mocksendZclFrameToAll).toHaveBeenCalledTimes(2);
        expect(mocksendZclFrameToAll).toHaveBeenNthCalledWith(
            2,
            ZSpec.GP_ENDPOINT,
            expect.any(Object),
            ZSpec.GP_ENDPOINT,
            ZSpec.BroadcastAddress.RX_ON_WHEN_IDLE,
        );
        expect(deepClone(mocksendZclFrameToAll.mock.calls[1][1])).toStrictEqual(deepClone(commissionFrameDisable));
    });

    it('Controller permit joining through specific device', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        await controller.permitJoin(254, controller.getDeviceByIeeeAddr('0x129'));

        expect(mockAdapterPermitJoin).toHaveBeenCalledTimes(1);
        expect(mockAdapterPermitJoin).toHaveBeenCalledWith(254, 129);
        expect(events.permitJoinChanged.length).toStrictEqual(1);
        expect(events.permitJoinChanged[0]).toStrictEqual({permitted: true, time: 254});
        expect(controller.getPermitJoin()).toStrictEqual(true);
        expect(controller.getPermitJoinEnd()).toBeGreaterThan(0);

        await vi.advanceTimersByTimeAsync(120 * 1000);

        expect(controller.getPermitJoin()).toStrictEqual(true);
        expect(controller.getPermitJoinEnd()).toBeGreaterThan(0);

        // Timer expired
        await vi.advanceTimersByTimeAsync(300 * 1000);

        expect(mockAdapterPermitJoin).toHaveBeenCalledTimes(1);
        expect(events.permitJoinChanged.length).toStrictEqual(2);
        expect(events.permitJoinChanged[1]).toStrictEqual({permitted: false});
        expect(controller.getPermitJoin()).toStrictEqual(false);
        expect(controller.getPermitJoinEnd()).toBeUndefined();
    });

    it('Controller permit joining for specific time', async () => {
        await controller.start();
        await controller.permitJoin(10);

        expect(mockAdapterPermitJoin).toHaveBeenCalledTimes(1);
        expect(mockAdapterPermitJoin).toHaveBeenCalledWith(10, undefined);
        expect(events.permitJoinChanged.length).toStrictEqual(1);
        expect(events.permitJoinChanged[0]).toStrictEqual({permitted: true, time: 10});
        expect(controller.getPermitJoin()).toStrictEqual(true);

        await vi.advanceTimersByTimeAsync(5 * 1000);

        expect(controller.getPermitJoin()).toStrictEqual(true);
        expect(controller.getPermitJoinEnd()).toBeGreaterThan(0);

        // Timer expired
        await vi.advanceTimersByTimeAsync(7 * 1000);

        expect(mockAdapterPermitJoin).toHaveBeenCalledTimes(1);
        expect(events.permitJoinChanged.length).toStrictEqual(2);
        expect(events.permitJoinChanged[1]).toStrictEqual({permitted: false});
        expect(controller.getPermitJoin()).toStrictEqual(false);
        expect(controller.getPermitJoinEnd()).toBeUndefined();
    });

    it('Controller permit joining for too long time throws', async () => {
        await controller.start();

        await expect(controller.permitJoin(255)).rejects.toThrow(`Cannot permit join for more than 254 seconds.`);
        expect(mockAdapterPermitJoin).toHaveBeenCalledTimes(0);
        expect(events.permitJoinChanged.length).toStrictEqual(0);
    });

    it('Shouldnt create backup when adapter doesnt support it', async () => {
        mockAdapterSupportsBackup.mockReturnValue(false);
        if (fs.existsSync(options.backupPath)) fs.unlinkSync(options.backupPath);
        await controller.start();
        await controller.stop();
        expect(fs.existsSync(options.backupPath)).toBeFalsy();
    });

    it('Soft reset', async () => {
        await controller.start();
        await controller.reset('soft');
        expect(mockAdapterReset).toHaveBeenCalledTimes(1);
        expect(mockAdapterReset).toHaveBeenCalledWith('soft');
    });

    it('Hard reset', async () => {
        await controller.start();
        await controller.reset('hard');
        expect(mockAdapterReset).toHaveBeenCalledTimes(1);
        expect(mockAdapterReset).toHaveBeenCalledWith('hard');
    });

    it('Adapter disconnected event', async () => {
        // @ts-expect-error private
        const databaseSaveSpy = vi.spyOn(controller, 'databaseSave');
        const backupSpy = vi.spyOn(controller, 'backup');
        await controller.start();
        // @ts-expect-error private
        databaseSaveSpy.mockClear();
        backupSpy.mockClear();
        expect(controller.isStopping()).toBeFalsy();
        expect(controller.isAdapterDisconnected()).toBeFalsy();

        await mockAdapterEvents['disconnected']();
        expect(events.adapterDisconnected.length).toBe(1);
        expect(controller.isAdapterDisconnected()).toBeTruthy();

        // mock z2m layer responding to disconnected event
        await controller.stop();
        expect(controller.isStopping()).toBeTruthy();
        expect(mockAdapterStop).toHaveBeenCalledTimes(1); // once in event only (with catcho)
        expect(mockAdapterPermitJoin).not.toHaveBeenCalled();
        expect(backupSpy).not.toHaveBeenCalled();
        expect(databaseSaveSpy).toHaveBeenCalledTimes(1);
    });

    it('Device joins another time with different network address', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        expect(controller.getDeviceByNetworkAddress(129)?.ieeeAddr).toStrictEqual('0x129');
        expect(events.deviceJoined.length).toBe(1);
        expect(equalsPartial(events.deviceJoined[0].device, {ID: 2, networkAddress: 129, ieeeAddr: '0x129'})).toBeTruthy();
        expect(controller.getDeviceByIeeeAddr('0x129')?.networkAddress).toBe(129);

        await mockAdapterEvents['deviceJoined']({networkAddress: 130, ieeeAddr: '0x129'});
        expect(events.deviceJoined.length).toBe(1);
        expect(controller.getDeviceByIeeeAddr('0x129')?.networkAddress).toBe(130);
        expect(controller.getDeviceByNetworkAddress(129)).toBeUndefined();
        expect(controller.getDeviceByNetworkAddress(130)?.ieeeAddr).toStrictEqual('0x129');
    });

    it('Device joins and interview succeeds', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        expect(events.deviceInterview.length).toBe(2);
        expect(events.deviceInterview[0].status).toBe('started');
        // @ts-expect-error private but deep cloned
        expect(events.deviceInterview[0].device._ieeeAddr).toBe('0x129');
        expect(events.deviceInterview[1].status).toBe('successful');
        // @ts-expect-error private but deep cloned
        expect(events.deviceInterview[1].device._ieeeAddr).toBe('0x129');
    });

    it('Device joins and interview fails', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 140, ieeeAddr: '0x140'});
        expect(events.deviceInterview.length).toBe(2);
        expect(events.deviceInterview[0].status).toBe('started');
        // @ts-expect-error private but deep cloned
        expect(events.deviceInterview[0].device._ieeeAddr).toBe('0x140');
        expect(events.deviceInterview[1].status).toBe('failed');
        // @ts-expect-error private but deep cloned
        expect(events.deviceInterview[1].device._ieeeAddr).toBe('0x140');
        expect(controller.getDeviceByIeeeAddr('0x140')!.type).toStrictEqual('Unknown');
    });

    it('Device joins with endpoints [4,1], should read modelID from 1', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 161, ieeeAddr: '0x161'});
        expect(events.deviceInterview.length).toBe(2);
        expect(events.deviceInterview[0].status).toBe('started');
        // @ts-expect-error private but deep cloned
        expect(events.deviceInterview[0].device._ieeeAddr).toBe('0x161');
        expect(events.deviceInterview[1].status).toBe('successful');
        // @ts-expect-error private but deep cloned
        expect(events.deviceInterview[1].device._ieeeAddr).toBe('0x161');
        // @ts-expect-error private but deep cloned
        expect(events.deviceInterview[1].device._modelID).toBe('myDevice9123');
    });

    it('Device joins with endpoints [2,1], as 2 is the only endpoint supporting genBasic it should read modelID from that', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 162, ieeeAddr: '0x162'});
        expect(events.deviceInterview.length).toBe(2);
        expect(events.deviceInterview[0].status).toBe('started');
        // @ts-expect-error private but deep cloned
        expect(events.deviceInterview[0].device._ieeeAddr).toBe('0x162');
        expect(events.deviceInterview[1].status).toBe('successful');
        // @ts-expect-error private but deep cloned
        expect(events.deviceInterview[1].device._ieeeAddr).toBe('0x162');
        // @ts-expect-error private but deep cloned
        expect(events.deviceInterview[1].device._modelID).toBe('myDevice9124');
    });

    it('Device joins and interview iAs enrollment succeeds', async () => {
        await controller.start();
        const event = mockAdapterEvents['deviceJoined']({networkAddress: 170, ieeeAddr: '0x170'});
        await event;
        expect(events.deviceInterview.length).toBe(2);
        expect(events.deviceInterview[0].status).toBe('started');
        // @ts-expect-error private but deep cloned
        expect(events.deviceInterview[0].device._ieeeAddr).toBe('0x170');
        expect(events.deviceInterview[1].status).toBe('successful');
        // @ts-expect-error private but deep cloned
        expect(events.deviceInterview[1].device._ieeeAddr).toBe('0x170');

        const write = mocksendZclFrameToEndpoint.mock.calls[10];
        expect(write[0]).toBe('0x170');
        expect(write[1]).toBe(170);
        expect(write[2]).toBe(1);
        expect(deepClone(write[3])).toStrictEqual({
            header: {
                frameControl: {reservedBits: 0, frameType: 0, direction: 0, disableDefaultResponse: true, manufacturerSpecific: false},
                transactionSequenceNumber: 12,
                commandIdentifier: 2,
            },
            payload: [{attrId: 16, attrData: '0x0000012300000000', dataType: 240}],
            cluster: {
                ID: 1280,
                attributes: {
                    zoneState: {ID: 0, type: 48, name: 'zoneState'},
                    zoneType: {ID: 1, type: 49, name: 'zoneType'},
                    zoneStatus: {ID: 2, type: 25, name: 'zoneStatus'},
                    iasCieAddr: {ID: 16, type: 240, name: 'iasCieAddr'},
                    zoneId: {ID: 17, type: 32, name: 'zoneId'},
                    numZoneSensitivityLevelsSupported: {ID: 18, type: 32, name: 'numZoneSensitivityLevelsSupported'},
                    currentZoneSensitivityLevel: {ID: 19, type: 32, name: 'currentZoneSensitivityLevel'},
                    develcoAlarmOffDelay: {ID: 32769, type: 33, manufacturerCode: 4117, name: 'develcoAlarmOffDelay'},
                },
                name: 'ssIasZone',
                commands: {
                    enrollRsp: {
                        ID: 0,
                        parameters: [
                            {name: 'enrollrspcode', type: 32},
                            {name: 'zoneid', type: 32},
                        ],
                        name: 'enrollRsp',
                    },
                    initNormalOpMode: {ID: 1, parameters: [], name: 'initNormalOpMode'},
                    initTestMode: {ID: 2, parameters: [], name: 'initTestMode'},
                },
                commandsResponse: {
                    statusChangeNotification: {
                        ID: 0,
                        parameters: [
                            {name: 'zonestatus', type: 33},
                            {name: 'extendedstatus', type: 32},
                        ],
                        name: 'statusChangeNotification',
                    },
                    enrollReq: {
                        ID: 1,
                        parameters: [
                            {name: 'zonetype', type: 33},
                            {name: 'manucode', type: 33},
                        ],
                        name: 'enrollReq',
                    },
                },
            },
            command: {
                ID: 2,
                name: 'write',
                parameters: [
                    {name: 'attrId', type: 33},
                    {name: 'dataType', type: 32},
                    {name: 'attrData', type: 1000},
                ],
                response: 4,
            },
        });

        const enrollRsp = mocksendZclFrameToEndpoint.mock.calls[11];
        expect(enrollRsp[0]).toBe('0x170');
        expect(enrollRsp[1]).toBe(170);
        expect(enrollRsp[2]).toBe(1);
        expect(deepClone(enrollRsp[3])).toStrictEqual({
            header: {
                frameControl: {reservedBits: 0, frameType: 1, direction: 0, disableDefaultResponse: true, manufacturerSpecific: false},
                transactionSequenceNumber: 13,
                commandIdentifier: 0,
            },
            payload: {enrollrspcode: 0, zoneid: 23},
            cluster: {
                ID: 1280,
                attributes: {
                    zoneState: {ID: 0, type: 48, name: 'zoneState'},
                    zoneType: {ID: 1, type: 49, name: 'zoneType'},
                    zoneStatus: {ID: 2, type: 25, name: 'zoneStatus'},
                    iasCieAddr: {ID: 16, type: 240, name: 'iasCieAddr'},
                    zoneId: {ID: 17, type: 32, name: 'zoneId'},
                    numZoneSensitivityLevelsSupported: {ID: 18, type: 32, name: 'numZoneSensitivityLevelsSupported'},
                    currentZoneSensitivityLevel: {ID: 19, type: 32, name: 'currentZoneSensitivityLevel'},
                    develcoAlarmOffDelay: {ID: 32769, type: 33, manufacturerCode: 4117, name: 'develcoAlarmOffDelay'},
                },
                name: 'ssIasZone',
                commands: {
                    enrollRsp: {
                        ID: 0,
                        parameters: [
                            {name: 'enrollrspcode', type: 32},
                            {name: 'zoneid', type: 32},
                        ],
                        name: 'enrollRsp',
                    },
                    initNormalOpMode: {ID: 1, parameters: [], name: 'initNormalOpMode'},
                    initTestMode: {ID: 2, parameters: [], name: 'initTestMode'},
                },
                commandsResponse: {
                    statusChangeNotification: {
                        ID: 0,
                        parameters: [
                            {name: 'zonestatus', type: 33},
                            {name: 'extendedstatus', type: 32},
                        ],
                        name: 'statusChangeNotification',
                    },
                    enrollReq: {
                        ID: 1,
                        parameters: [
                            {name: 'zonetype', type: 33},
                            {name: 'manucode', type: 33},
                        ],
                        name: 'enrollReq',
                    },
                },
            },
            command: {
                ID: 0,
                parameters: [
                    {name: 'enrollrspcode', type: 32},
                    {name: 'zoneid', type: 32},
                ],
                name: 'enrollRsp',
            },
        });
    });

    it('Device joins and interview iAs enrollment fails', async () => {
        MOCK_DEVICES['170']!.attributes!['1'].zoneState = 0;
        enroll170 = false;
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 170, ieeeAddr: '0x170'});
        expect(events.deviceInterview.length).toBe(2);
        expect(events.deviceInterview[0].status).toBe('started');
        // @ts-expect-error private but deep cloned
        expect(events.deviceInterview[0].device._ieeeAddr).toBe('0x170');
        expect(events.deviceInterview[1].status).toBe('failed');
        // @ts-expect-error private but deep cloned
        expect(events.deviceInterview[1].device._ieeeAddr).toBe('0x170');
    });

    it('Device joins, shouldnt enroll when already enrolled', async () => {
        await controller.start();
        iasZoneReadState170Count = 1;
        await mockAdapterEvents['deviceJoined']({networkAddress: 170, ieeeAddr: '0x170'});
        expect(events.deviceInterview.length).toBe(2);
        expect(events.deviceInterview[0].status).toBe('started');
        // @ts-expect-error private but deep cloned
        expect(events.deviceInterview[0].device._ieeeAddr).toBe('0x170');
        expect(events.deviceInterview[1].status).toBe('successful');
        // @ts-expect-error private but deep cloned
        expect(events.deviceInterview[1].device._ieeeAddr).toBe('0x170');
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(10);
    });

    it('Receive zclData occupancy report', async () => {
        const buffer = Buffer.from([24, 169, 10, 0, 0, 24, 1]);
        const frame = Zcl.Frame.fromBuffer(Zcl.Utils.getCluster('msOccupancySensing', undefined, {}).ID, Zcl.Header.fromBuffer(buffer), buffer, {});
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            address: '0x129',
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: 1,
            linkquality: 50,
            groupID: 1,
        });

        expect(events.message.length).toBe(1);
        const expected = {
            cluster: 'msOccupancySensing',
            type: 'attributeReport',
            device: {
                ID: 2,
                _events: {},
                _eventsCount: 0,
                _ieeeAddr: '0x129',
                _pendingRequestTimeout: 0,
                _networkAddress: 129,
                _lastSeen: Date.now(),
                _linkquality: 50,
                _skipDefaultResponse: false,
                _customClusters: {},
                _endpoints: [
                    {
                        ID: 1,
                        _events: {},
                        _eventsCount: 0,
                        inputClusters: [0, 1],
                        outputClusters: [2],
                        pendingRequests: {ID: 1, deviceIeeeAddress: '0x129', sendInProgress: false},
                        _binds: [],
                        _configuredReportings: [],
                        meta: {},
                        deviceNetworkAddress: 129,
                        deviceIeeeAddress: '0x129',
                        deviceID: 5,
                        profileID: 99,
                        clusters: {
                            msOccupancySensing: {
                                attributes: {
                                    occupancy: 1,
                                },
                            },
                        },
                    },
                ],
                _type: 'Router',
                _manufacturerID: 1212,
                _manufacturerName: 'KoenAndCo',
                meta: {},
                _powerSource: 'Mains (single phase)',
                _modelID: 'myModelID',
                _applicationVersion: 2,
                _stackVersion: 101,
                _zclVersion: 1,
                _hardwareVersion: 3,
                _dateCode: '201901',
                _softwareBuildID: '1.01',
                _interviewCompleted: true,
                _interviewing: false,
            },
            endpoint: {
                ID: 1,
                _events: {},
                _eventsCount: 0,
                deviceID: 5,
                inputClusters: [0, 1],
                outputClusters: [2],
                pendingRequests: {ID: 1, deviceIeeeAddress: '0x129', sendInProgress: false},
                deviceNetworkAddress: 129,
                deviceIeeeAddress: '0x129',
                _binds: [],
                _configuredReportings: [],
                profileID: 99,
                meta: {},
                clusters: {
                    msOccupancySensing: {
                        attributes: {
                            occupancy: 1,
                        },
                    },
                },
            },
            data: {
                occupancy: 1,
            },
            linkquality: 50,
            groupID: 1,
            meta: {
                zclTransactionSequenceNumber: 169,
                frameControl: {
                    reservedBits: 0,
                    direction: 1,
                    disableDefaultResponse: true,
                    frameType: 0,
                    manufacturerSpecific: false,
                },
            },
        };
        expect(deepClone(events.message[0])).toStrictEqual(expected);
        expect(controller.getDeviceByIeeeAddr('0x129')!.linkquality).toEqual(50);
    });

    it('Receive raw data', async () => {
        await controller.start();
        mocksendZclFrameToAll.mockClear();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        await mockAdapterEvents['zclPayload']({
            clusterID: 9,
            address: 129,
            data: Buffer.from([0, 1]),
            header: new Zcl.Header(
                {direction: 0, disableDefaultResponse: false, frameType: 1, manufacturerSpecific: false, reservedBits: 0},
                0,
                1,
                0,
            ),
            endpoint: 1,
            linkquality: 50,
            groupID: 1,
            wasBroadcast: false,
        });

        expect(events.message.length).toBe(1);
        const expected = {
            cluster: 'genAlarms',
            type: 'raw',
            device: {
                ID: 2,
                _events: {},
                _eventsCount: 0,
                _pendingRequestTimeout: 0,
                _ieeeAddr: '0x129',
                _networkAddress: 129,
                _lastSeen: Date.now(),
                _linkquality: 50,
                _skipDefaultResponse: false,
                _customClusters: {},
                _endpoints: [
                    {
                        ID: 1,
                        _events: {},
                        _eventsCount: 0,
                        clusters: {},
                        inputClusters: [0, 1],
                        outputClusters: [2],
                        pendingRequests: {ID: 1, deviceIeeeAddress: '0x129', sendInProgress: false},
                        deviceNetworkAddress: 129,
                        deviceIeeeAddress: '0x129',
                        _binds: [],
                        _configuredReportings: [],
                        meta: {},
                        deviceID: 5,
                        profileID: 99,
                    },
                ],
                _type: 'Router',
                _manufacturerID: 1212,
                _manufacturerName: 'KoenAndCo',
                meta: {},
                _powerSource: 'Mains (single phase)',
                _modelID: 'myModelID',
                _applicationVersion: 2,
                _stackVersion: 101,
                _zclVersion: 1,
                _hardwareVersion: 3,
                _dateCode: '201901',
                _softwareBuildID: '1.01',
                _interviewCompleted: true,
                _interviewing: false,
            },
            endpoint: {
                _events: {},
                _eventsCount: 0,
                clusters: {},
                ID: 1,
                deviceID: 5,
                inputClusters: [0, 1],
                outputClusters: [2],
                pendingRequests: {ID: 1, deviceIeeeAddress: '0x129', sendInProgress: false},
                deviceNetworkAddress: 129,
                deviceIeeeAddress: '0x129',
                _binds: [],
                _configuredReportings: [],
                profileID: 99,
                meta: {},
            },
            data: {
                data: [0, 1],
                type: 'Buffer',
            },
            linkquality: 50,
            groupID: 1,
            meta: {},
        };
        expect(deepClone(events.message[0])).toStrictEqual(expected);
    });

    it('Receive raw data from unknown cluster', async () => {
        const buffer = Buffer.from([24, 169, 10, 0, 0, 24, 1]);
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        await mockAdapterEvents['zclPayload']({
            clusterID: 99999999,
            address: 129,
            data: Buffer.from([0, 1, 2, 3]),
            endpoint: 1,
            linkquality: 50,
            groupID: 1,
            wasBroadcast: false,
        });

        expect(events.message.length).toBe(1);
        const expected = {
            cluster: 99999999,
            type: 'raw',
            device: {
                ID: 2,
                _ieeeAddr: '0x129',
                _pendingRequestTimeout: 0,
                _networkAddress: 129,
                _lastSeen: Date.now(),
                _linkquality: 50,
                _skipDefaultResponse: false,
                _customClusters: {},
                _endpoints: [
                    {
                        ID: 1,
                        _events: {},
                        _eventsCount: 0,
                        clusters: {},
                        inputClusters: [0, 1],
                        outputClusters: [2],
                        pendingRequests: {ID: 1, deviceIeeeAddress: '0x129', sendInProgress: false},
                        deviceNetworkAddress: 129,
                        deviceIeeeAddress: '0x129',
                        _binds: [],
                        _configuredReportings: [],
                        meta: {},
                        deviceID: 5,
                        profileID: 99,
                    },
                ],
                _events: {},
                _eventsCount: 0,
                _type: 'Router',
                _manufacturerID: 1212,
                _manufacturerName: 'KoenAndCo',
                meta: {},
                _powerSource: 'Mains (single phase)',
                _modelID: 'myModelID',
                _applicationVersion: 2,
                _stackVersion: 101,
                _zclVersion: 1,
                _hardwareVersion: 3,
                _dateCode: '201901',
                _softwareBuildID: '1.01',
                _interviewCompleted: true,
                _interviewing: false,
            },
            endpoint: {
                _events: {},
                _eventsCount: 0,
                clusters: {},
                ID: 1,
                deviceID: 5,
                inputClusters: [0, 1],
                outputClusters: [2],
                pendingRequests: {ID: 1, deviceIeeeAddress: '0x129', sendInProgress: false},
                deviceNetworkAddress: 129,
                deviceIeeeAddress: '0x129',
                _binds: [],
                _configuredReportings: [],
                profileID: 99,
                meta: {},
            },
            data: {
                data: [0, 1, 2, 3],
                type: 'Buffer',
            },
            linkquality: 50,
            groupID: 1,
            meta: {},
        };
        expect(deepClone(events.message[0])).toStrictEqual(expected);
    });

    it('Receive zclData from unkonwn device shouldnt emit anything', async () => {
        const buffer = Buffer.from([24, 169, 10, 0, 0, 24, 1]);
        const frame = Zcl.Frame.fromBuffer(Zcl.Utils.getCluster('msOccupancySensing', undefined, {}).ID, Zcl.Header.fromBuffer(buffer), buffer, {});
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            networkAddress: 130,
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: 1,
            linkquality: 50,
            groupID: 1,
        });

        expect(events.message.length).toBe(0);
    });

    it('Receive readResponse from unknown endpoint', async () => {
        const buffer = Buffer.from([8, 1, 1, 1, 0, 0, 32, 3]);
        const frame = Zcl.Frame.fromBuffer(Zcl.Utils.getCluster('genBasic', undefined, {}).ID, Zcl.Header.fromBuffer(buffer), buffer, {});
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            address: 129,
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: 3,
            linkquality: 52,
            groupID: undefined,
        });

        expect(events.message.length).toBe(1);
        const expected = {
            cluster: 'genBasic',
            type: 'readResponse',
            device: {
                ID: 2,
                _events: {},
                _eventsCount: 0,
                _ieeeAddr: '0x129',
                _lastSeen: Date.now(),
                _pendingRequestTimeout: 0,
                _linkquality: 52,
                _skipDefaultResponse: false,
                _networkAddress: 129,
                _customClusters: {},
                _endpoints: [
                    {
                        clusters: {},
                        ID: 1,
                        _events: {},
                        _eventsCount: 0,
                        inputClusters: [0, 1],
                        outputClusters: [2],
                        pendingRequests: {ID: 1, deviceIeeeAddress: '0x129', sendInProgress: false},
                        deviceNetworkAddress: 129,
                        deviceIeeeAddress: '0x129',
                        _binds: [],
                        _configuredReportings: [],
                        deviceID: 5,
                        profileID: 99,
                        meta: {},
                    },
                    {
                        ID: 3,
                        _events: {},
                        _eventsCount: 0,
                        clusters: {
                            genBasic: {
                                attributes: {
                                    appVersion: 3,
                                },
                            },
                        },
                        inputClusters: [],
                        outputClusters: [],
                        pendingRequests: {ID: 3, deviceIeeeAddress: '0x129', sendInProgress: false},
                        deviceNetworkAddress: 129,
                        deviceIeeeAddress: '0x129',
                        _binds: [],
                        _configuredReportings: [],
                        meta: {},
                    },
                ],
                _type: 'Router',
                _manufacturerID: 1212,
                _manufacturerName: 'KoenAndCo',
                meta: {},
                _powerSource: 'Mains (single phase)',
                _modelID: 'myModelID',
                _applicationVersion: 3,
                _stackVersion: 101,
                _zclVersion: 1,
                _hardwareVersion: 3,
                _dateCode: '201901',
                _softwareBuildID: '1.01',
                _interviewCompleted: true,
                _interviewing: false,
                _lastDefaultResponseSequenceNumber: 1,
            },
            endpoint: {
                ID: 3,
                _events: {},
                _eventsCount: 0,
                inputClusters: [],
                outputClusters: [],
                pendingRequests: {ID: 3, deviceIeeeAddress: '0x129', sendInProgress: false},
                meta: {},
                deviceNetworkAddress: 129,
                deviceIeeeAddress: '0x129',
                _binds: [],
                _configuredReportings: [],
                clusters: {
                    genBasic: {
                        attributes: {
                            appVersion: 3,
                        },
                    },
                },
            },
            data: {
                appVersion: 3,
            },
            linkquality: 52,
            meta: {
                zclTransactionSequenceNumber: 1,
                frameControl: {
                    reservedBits: 0,
                    direction: 1,
                    disableDefaultResponse: false,
                    frameType: 0,
                    manufacturerSpecific: false,
                },
            },
        };
        expect(deepClone(events.message[0])).toStrictEqual(expected);
        expect(controller.getDeviceByIeeeAddr('0x129')!.endpoints.length).toBe(2);
    });

    it('Receive cluster command', async () => {
        const buffer = Buffer.from([0x05, 0x7c, 0x11, 0x1d, 0x07, 0x00, 0x01, 0x0d, 0x00]);
        const frame = Zcl.Frame.fromBuffer(5, Zcl.Header.fromBuffer(buffer), buffer, {});
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            address: 129,
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: 1,
            linkquality: 19,
            groupID: 10,
        });

        expect(events.message.length).toBe(1);
        const expected = {
            cluster: 'genScenes',
            type: 'commandTradfriArrowSingle',
            device: {
                ID: 2,
                _events: {},
                _eventsCount: 0,
                _pendingRequestTimeout: 0,
                _lastSeen: Date.now(),
                _linkquality: 19,
                _skipDefaultResponse: false,
                _ieeeAddr: '0x129',
                _networkAddress: 129,
                _customClusters: {},
                _endpoints: [
                    {
                        ID: 1,
                        _events: {},
                        _eventsCount: 0,
                        clusters: {},
                        inputClusters: [0, 1],
                        outputClusters: [2],
                        pendingRequests: {ID: 1, deviceIeeeAddress: '0x129', sendInProgress: false},
                        deviceNetworkAddress: 129,
                        deviceIeeeAddress: '0x129',
                        _binds: [],
                        _configuredReportings: [],
                        meta: {},
                        deviceID: 5,
                        profileID: 99,
                    },
                ],
                _type: 'Router',
                _manufacturerID: 1212,
                _manufacturerName: 'KoenAndCo',
                meta: {},
                _powerSource: 'Mains (single phase)',
                _modelID: 'myModelID',
                _applicationVersion: 2,
                _stackVersion: 101,
                _zclVersion: 1,
                _hardwareVersion: 3,
                _dateCode: '201901',
                _softwareBuildID: '1.01',
                _interviewCompleted: true,
                _interviewing: false,
                _lastDefaultResponseSequenceNumber: 29,
            },
            endpoint: {
                _events: {},
                _eventsCount: 0,
                ID: 1,
                clusters: {},
                inputClusters: [0, 1],
                outputClusters: [2],
                pendingRequests: {ID: 1, deviceIeeeAddress: '0x129', sendInProgress: false},
                deviceNetworkAddress: 129,
                deviceIeeeAddress: '0x129',
                _binds: [],
                _configuredReportings: [],
                deviceID: 5,
                profileID: 99,
                meta: {},
            },
            data: {
                value: 256,
                value2: 13,
            },
            linkquality: 19,
            groupID: 10,
            meta: {
                zclTransactionSequenceNumber: 29,
                manufacturerCode: 4476,
                frameControl: {
                    reservedBits: 0,
                    direction: 0,
                    disableDefaultResponse: false,
                    frameType: 1,
                    manufacturerSpecific: true,
                },
            },
        };
        expect(deepClone(events.message[0])).toStrictEqual(expected);
    });

    it('Receive cluster command from unknown cluster', async () => {
        const frame = Zcl.Frame.create(
            1,
            1,
            false,
            4476,
            29,
            1,
            5,
            {
                groupid: 1,
                sceneid: 1,
                status: 0,
                transtime: 0,
                scenename: '',
                extensionfieldsets: [],
            },
            {},
        );
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            networkAddress: 129,
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: 1,
            linkquality: 19,
            groupID: 10,
        });

        expect(events.message.length).toBe(0);
    });

    it('Receive zclData send default response', async () => {
        const frame = Zcl.Frame.create(
            1,
            1,
            false,
            4476,
            29,
            1,
            5,
            {
                groupid: 1,
                sceneid: 1,
                status: 0,
                transtime: 0,
                scenename: '',
                extensionfieldsets: [],
            },
            {},
        );
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        mocksendZclFrameToEndpoint.mockClear();
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            address: 129,
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: 1,
            linkquality: 19,
            groupID: 10,
        });

        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(1);
        const call = mocksendZclFrameToEndpoint.mock.calls[0];
        expect(call[0]).toBe('0x129');
        expect(call[1]).toBe(129);
        expect(call[2]).toBe(1);
        expect(deepClone(call[3])).toStrictEqual({
            header: {
                frameControl: {reservedBits: 0, frameType: 0, direction: 0, disableDefaultResponse: true, manufacturerSpecific: false},
                transactionSequenceNumber: 29,
                commandIdentifier: 11,
            },
            payload: {cmdId: 1, statusCode: 0},
            cluster: {
                ID: 5,
                attributes: {
                    count: {ID: 0, type: 32, name: 'count'},
                    currentScene: {ID: 1, type: 32, name: 'currentScene'},
                    currentGroup: {ID: 2, type: 33, name: 'currentGroup'},
                    sceneValid: {ID: 3, type: 16, name: 'sceneValid'},
                    nameSupport: {ID: 4, type: 24, name: 'nameSupport'},
                    lastCfgBy: {ID: 5, type: 240, name: 'lastCfgBy'},
                },
                name: 'genScenes',
                commands: {
                    add: {
                        ID: 0,
                        response: 0,
                        parameters: [
                            {name: 'groupid', type: 33},
                            {name: 'sceneid', type: 32},
                            {name: 'transtime', type: 33},
                            {name: 'scenename', type: 66},
                            {name: 'extensionfieldsets', type: 1006},
                        ],
                        name: 'add',
                    },
                    view: {
                        ID: 1,
                        response: 1,
                        parameters: [
                            {name: 'groupid', type: 33},
                            {name: 'sceneid', type: 32},
                        ],
                        name: 'view',
                    },
                    remove: {
                        ID: 2,
                        response: 2,
                        parameters: [
                            {name: 'groupid', type: 33},
                            {name: 'sceneid', type: 32},
                        ],
                        name: 'remove',
                    },
                    removeAll: {ID: 3, response: 3, parameters: [{name: 'groupid', type: 33}], name: 'removeAll'},
                    store: {
                        ID: 4,
                        response: 4,
                        parameters: [
                            {name: 'groupid', type: 33},
                            {name: 'sceneid', type: 32},
                        ],
                        name: 'store',
                    },
                    recall: {
                        ID: 5,
                        parameters: [
                            {name: 'groupid', type: 33},
                            {name: 'sceneid', type: 32},
                        ],
                        name: 'recall',
                    },
                    getSceneMembership: {ID: 6, response: 6, parameters: [{name: 'groupid', type: 33}], name: 'getSceneMembership'},
                    enhancedAdd: {
                        ID: 64,
                        response: 64,
                        parameters: [
                            {name: 'groupid', type: 33},
                            {name: 'sceneid', type: 32},
                            {name: 'transtime', type: 33},
                            {name: 'scenename', type: 66},
                            {name: 'extensionfieldsets', type: 1006},
                        ],
                        name: 'enhancedAdd',
                    },
                    enhancedView: {
                        ID: 65,
                        response: 65,
                        parameters: [
                            {name: 'groupid', type: 33},
                            {name: 'sceneid', type: 32},
                        ],
                        name: 'enhancedView',
                    },
                    copy: {
                        ID: 66,
                        response: 66,
                        parameters: [
                            {name: 'mode', type: 32},
                            {name: 'groupidfrom', type: 33},
                            {name: 'sceneidfrom', type: 32},
                            {name: 'groupidto', type: 33},
                            {name: 'sceneidto', type: 32},
                        ],
                        name: 'copy',
                    },
                    tradfriArrowSingle: {
                        ID: 7,
                        parameters: [
                            {name: 'value', type: 33},
                            {name: 'value2', type: 33},
                        ],
                        name: 'tradfriArrowSingle',
                    },
                    tradfriArrowHold: {ID: 8, parameters: [{name: 'value', type: 33}], name: 'tradfriArrowHold'},
                    tradfriArrowRelease: {ID: 9, parameters: [{name: 'value', type: 33}], name: 'tradfriArrowRelease'},
                },
                commandsResponse: {
                    addRsp: {
                        ID: 0,
                        parameters: [
                            {name: 'status', type: 32},
                            {name: 'groupId', type: 33},
                            {name: 'sceneId', type: 32},
                        ],
                        name: 'addRsp',
                    },
                    viewRsp: {
                        ID: 1,
                        parameters: [
                            {name: 'status', type: 32},
                            {name: 'groupid', type: 33},
                            {name: 'sceneid', type: 32},
                            {name: 'transtime', type: 33, conditions: [{type: 'statusEquals', value: 0}]},
                            {name: 'scenename', type: 66, conditions: [{type: 'statusEquals', value: 0}]},
                            {name: 'extensionfieldsets', type: 1006, conditions: [{type: 'statusEquals', value: 0}]},
                        ],
                        name: 'viewRsp',
                    },
                    removeRsp: {
                        ID: 2,
                        parameters: [
                            {name: 'status', type: 32},
                            {name: 'groupid', type: 33},
                            {name: 'sceneid', type: 32},
                        ],
                        name: 'removeRsp',
                    },
                    removeAllRsp: {
                        ID: 3,
                        parameters: [
                            {name: 'status', type: 32},
                            {name: 'groupid', type: 33},
                        ],
                        name: 'removeAllRsp',
                    },
                    storeRsp: {
                        ID: 4,
                        parameters: [
                            {name: 'status', type: 32},
                            {name: 'groupid', type: 33},
                            {name: 'sceneid', type: 32},
                        ],
                        name: 'storeRsp',
                    },
                    getSceneMembershipRsp: {
                        ID: 6,
                        parameters: [
                            {name: 'status', type: 32},
                            {name: 'capacity', type: 32},
                            {name: 'groupid', type: 33},
                            {name: 'scenecount', type: 32, conditions: [{type: 'statusEquals', value: 0}]},
                            {name: 'scenelist', type: 1001, conditions: [{type: 'statusEquals', value: 0}]},
                        ],
                        name: 'getSceneMembershipRsp',
                    },
                    enhancedAddRsp: {
                        ID: 64,
                        parameters: [
                            {name: 'status', type: 32},
                            {name: 'groupId', type: 33},
                            {name: 'sceneId', type: 32},
                        ],
                        name: 'enhancedAddRsp',
                    },
                    enhancedViewRsp: {
                        ID: 65,
                        parameters: [
                            {name: 'status', type: 32},
                            {name: 'groupid', type: 33},
                            {name: 'sceneid', type: 32},
                            {name: 'transtime', type: 33, conditions: [{type: 'statusEquals', value: 0}]},
                            {name: 'scenename', type: 66, conditions: [{type: 'statusEquals', value: 0}]},
                            {name: 'extensionfieldsets', type: 1006, conditions: [{type: 'statusEquals', value: 0}]},
                        ],
                        name: 'enhancedViewRsp',
                    },
                    copyRsp: {
                        ID: 66,
                        parameters: [
                            {name: 'status', type: 32},
                            {name: 'groupidfrom', type: 33},
                            {name: 'sceneidfrom', type: 32},
                        ],
                        name: 'copyRsp',
                    },
                },
            },
            command: {
                ID: 11,
                name: 'defaultRsp',
                parameters: [
                    {name: 'cmdId', type: 32},
                    {name: 'statusCode', type: 32},
                ],
            },
        });
    });

    it('Receive zclData dont send default resopnse with skipDefaultResponse', async () => {
        const frame = Zcl.Frame.create(
            1,
            1,
            false,
            4476,
            29,
            1,
            5,
            {
                groupid: 1,
                sceneid: 1,
                status: 0,
                transtime: 0,
                scenename: '',
                extensionfieldsets: [],
            },
            {},
        );
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        mocksendZclFrameToEndpoint.mockClear();
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        expect(device.skipDefaultResponse).toBeFalsy();
        device.skipDefaultResponse = true;
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            address: 129,
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: 1,
            linkquality: 19,
            groupID: 10,
        });
        expect(device.skipDefaultResponse).toBeTruthy();
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(0);
    });

    it('Receive zclData dont send default resopnse when broadcast', async () => {
        const frame = Zcl.Frame.create(
            1,
            1,
            false,
            4476,
            29,
            1,
            5,
            {
                groupid: 1,
                sceneid: 1,
                status: 0,
                transtime: 0,
                scenename: '',
                extensionfieldsets: [],
            },
            {},
        );
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        mocksendZclFrameToEndpoint.mockClear();
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        expect(device.skipDefaultResponse).toBeFalsy();
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: true,
            address: 129,
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: 1,
            linkquality: 19,
            groupID: 10,
        });
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(0);
    });

    it('Receive zclData send default response fails should NOT attempt route discover when adapter does not support it', async () => {
        const frame = Zcl.Frame.create(
            1,
            1,
            false,
            4476,
            29,
            1,
            5,
            {
                groupid: 1,
                sceneid: 1,
                status: 0,
                transtime: 0,
                scenename: '',
                extensionfieldsets: [],
            },
            {},
        );
        mockAdapterSupportsDiscoverRoute.mockReturnValueOnce(false);
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        mocksendZclFrameToEndpoint.mockClear();
        mockDiscoverRoute.mockClear();
        mocksendZclFrameToEndpoint.mockRejectedValue('');
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            address: 129,
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: 1,
            linkquality: 19,
            groupID: 10,
        });

        expect(mockDiscoverRoute).toHaveBeenCalledTimes(0);
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(1);
    });

    it('Respond to genTime read', async () => {
        const frame = Zcl.Frame.create(0, 0, true, undefined, 40, 0, 10, [{attrId: 0}, {attrId: 1}, {attrId: 7}, {attrId: 4}], {});
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        mocksendZclFrameToEndpoint.mockClear();
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            address: 129,
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: 1,
            linkquality: 19,
            groupID: 10,
        });

        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(1);
        expect(mocksendZclFrameToEndpoint.mock.calls[0][0]).toBe('0x129');
        expect(mocksendZclFrameToEndpoint.mock.calls[0][1]).toBe(129);
        expect(mocksendZclFrameToEndpoint.mock.calls[0][2]).toBe(1);
        const message = mocksendZclFrameToEndpoint.mock.calls[0][3];
        // attrId 9 is not supported by controller.ts therefore should not be in the response
        expect(message.payload.length).toBe(3);
        expect(message.payload[0].attrId).toBe(0);
        expect(message.payload[0].dataType).toBe(226);
        expect(message.payload[0].status).toBe(0);
        expect(message.payload[0].attrData).toBeGreaterThan(600822353);
        expect(message.payload[1].attrId).toBe(1);
        expect(message.payload[1].dataType).toBe(24);
        expect(message.payload[1].status).toBe(0);
        expect(message.payload[1].attrData).toBe(3);
        expect(message.payload[2].attrId).toBe(7);
        expect(message.payload[2].dataType).toBe(35);
        expect(message.payload[2].status).toBe(0);
        expect(message.payload[2].attrData).toBeGreaterThan(600822353);
        delete message.payload;
        const call = mocksendZclFrameToEndpoint.mock.calls[0];
        expect(call[0]).toBe('0x129');
        expect(call[1]).toBe(129);
        expect(call[2]).toBe(1);
        expect(deepClone(call[3])).toStrictEqual({
            header: {
                frameControl: {reservedBits: 0, frameType: 0, direction: 1, disableDefaultResponse: true, manufacturerSpecific: false},
                transactionSequenceNumber: 40,
                commandIdentifier: 1,
            },
            cluster: {
                ID: 10,
                attributes: {
                    time: {ID: 0, type: 226, name: 'time'},
                    timeStatus: {ID: 1, type: 24, name: 'timeStatus'},
                    timeZone: {ID: 2, type: 43, name: 'timeZone'},
                    dstStart: {ID: 3, type: 35, name: 'dstStart'},
                    dstEnd: {ID: 4, type: 35, name: 'dstEnd'},
                    dstShift: {ID: 5, type: 43, name: 'dstShift'},
                    standardTime: {ID: 6, type: 35, name: 'standardTime'},
                    localTime: {ID: 7, type: 35, name: 'localTime'},
                    lastSetTime: {ID: 8, type: 226, name: 'lastSetTime'},
                    validUntilTime: {ID: 9, type: 226, name: 'validUntilTime'},
                },
                name: 'genTime',
                commands: {},
                commandsResponse: {},
            },
            command: {
                ID: 1,
                name: 'readRsp',
                parameters: [
                    {name: 'attrId', type: 33},
                    {name: 'status', type: 32},
                    {name: 'dataType', type: 32, conditions: [{type: 'statusEquals', value: 0}]},
                    {name: 'attrData', type: 1000, conditions: [{type: 'statusEquals', value: 0}]},
                ],
            },
        });
    });

    it('Allow to override read response through `device.customReadResponse', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        mocksendZclFrameToEndpoint.mockClear();

        const device = controller.getDeviceByIeeeAddr('0x129')!;
        device.customReadResponse = vi.fn().mockReturnValue(true);

        const frame = Zcl.Frame.create(0, 0, true, undefined, 40, 0, 10, [{attrId: 0}, {attrId: 1}, {attrId: 7}, {attrId: 9}], {});
        const payload = {
            wasBroadcast: false,
            address: 129,
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: 1,
            linkquality: 19,
            groupID: 10,
        };

        await mockAdapterEvents['zclPayload'](payload);

        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(0);
        expect(device.customReadResponse).toHaveBeenCalledTimes(1);
        expect(device.customReadResponse).toHaveBeenCalledWith(expect.any(Zcl.Frame), device.getEndpoint(1));
        expect((device.customReadResponse as ReturnType<typeof vi.fn>).mock.calls[0][0].header).toBe(payload.header);
    });

    it('Respond to read of attribute', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        endpoint.saveClusterAttributeKeyValue('hvacThermostat', {systemMode: 3});
        mocksendZclFrameToEndpoint.mockClear();
        const frame = Zcl.Frame.create(0, 0, true, undefined, 40, 0, 513, [{attrId: 28}, {attrId: 290}], {});
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            address: 129,
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: 1,
            linkquality: 19,
            groupID: 10,
        });

        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(1);
        const call = mocksendZclFrameToEndpoint.mock.calls[0];
        expect(call[0]).toBe('0x129');
        expect(call[1]).toBe(129);
        expect(call[2]).toBe(1);
        expect(deepClone({...call[3], cluster: null})).toStrictEqual({
            header: {
                frameControl: {reservedBits: 0, frameType: 0, direction: 1, disableDefaultResponse: true, manufacturerSpecific: false},
                transactionSequenceNumber: 40,
                commandIdentifier: 1,
            },
            payload: [{attrId: 28, attrData: 3, dataType: 48, status: 0}],
            cluster: null,
            command: {
                ID: 1,
                name: 'readRsp',
                parameters: [
                    {name: 'attrId', type: 33},
                    {name: 'status', type: 32},
                    {name: 'dataType', type: 32, conditions: [{type: 'statusEquals', value: 0}]},
                    {name: 'attrData', type: 1000, conditions: [{type: 'statusEquals', value: 0}]},
                ],
            },
        });
    });

    it('Respond to genTime read fails', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        mocksendZclFrameToEndpoint.mockClear();
        mocksendZclFrameToEndpoint.mockRejectedValueOnce(new Error(''));
        const frame = Zcl.Frame.create(0, 0, true, undefined, 40, 0, 10, [{attrId: 0}], {});
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            address: 129,
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: 1,
            linkquality: 19,
            groupID: 10,
        });

        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(1);
    });

    it('Tuya end devices joins, stops responding after 1 requests, should read modelID and manufacturerName immediately on second pair', async () => {
        // https://github.com/Koenkk/zigbee2mqtt/issues/7553
        await controller.start();

        // Joins
        await mockAdapterEvents['deviceJoined']({networkAddress: 173, ieeeAddr: '0x173'});
        expect(events.deviceInterview.length).toBe(2);
        expect(events.deviceInterview[0].status).toBe('started');
        // @ts-expect-error private but deep cloned
        expect(events.deviceInterview[0].device._ieeeAddr).toBe('0x173');
        expect(events.deviceInterview[1].status).toBe('failed');
        // @ts-expect-error private but deep cloned
        expect(events.deviceInterview[1].device._ieeeAddr).toBe('0x173');
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(1);
        expect(controller.getDeviceByIeeeAddr('0x173')!.modelID).toBe(undefined);
        expect(controller.getDeviceByIeeeAddr('0x173')!.manufacturerName).toBe(undefined);

        // Second pair attempt
        await mockAdapterEvents['deviceLeave']({networkAddress: 173, ieeeAddr: '0x173'});
        // backup
        const descriptor173 = MOCK_DEVICES[173]!.nodeDescriptor;
        const attributes173 = MOCK_DEVICES[173]!.attributes;
        MOCK_DEVICES[173]!.nodeDescriptor = undefined;
        MOCK_DEVICES[173]!.attributes![1] = {modelId: 'TS0203', manufacturerName: '_TYZB01_xph99wvr'};

        await mockAdapterEvents['deviceJoined']({networkAddress: 173, ieeeAddr: '0x173'});
        expect(events.deviceInterview.length).toBe(4);
        expect(events.deviceInterview[2].status).toBe('started');
        // @ts-expect-error private but deep cloned
        expect(events.deviceInterview[2].device._ieeeAddr).toBe('0x173');
        expect(events.deviceInterview[3].status).toBe('successful');
        // @ts-expect-error private but deep cloned
        expect(events.deviceInterview[3].device._ieeeAddr).toBe('0x173');
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(2);

        expect(controller.getDeviceByIeeeAddr('0x173')!.modelID).toBe('TS0203');
        expect(controller.getDeviceByIeeeAddr('0x173')!.manufacturerName).toBe('_TYZB01_xph99wvr');
        expect(controller.getDeviceByIeeeAddr('0x173')!.powerSource).toBe('Battery');

        // restore
        MOCK_DEVICES[173]!.nodeDescriptor = descriptor173;
        MOCK_DEVICES[173]!.attributes = attributes173;
    });

    it('Xiaomi WXCJKG11LM join (get simple descriptor for endpoint 2 fails)', async () => {
        // https://github.com/koenkk/zigbee2mqtt/issues/2844
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 171, ieeeAddr: '0x171'});
        expect(events.deviceInterview.length).toBe(2);
        expect(events.deviceInterview[0].status).toBe('started');
        // @ts-expect-error private but deep cloned
        expect(events.deviceInterview[0].device._ieeeAddr).toBe('0x171');
        expect(events.deviceInterview[1].status).toBe('successful');
        // @ts-expect-error private but deep cloned
        expect(events.deviceInterview[1].device._ieeeAddr).toBe('0x171');
        expect(controller.getDeviceByIeeeAddr('0x171')!.modelID).toBe('lumi.remote.b286opcn01');
    });

    it('Gledopto GL-C-007/GL-C-008 join (all endpoints support genBasic but only 12 responds)', async () => {
        //  - https://github.com/Koenkk/zigbee2mqtt/issues/2872
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 172, ieeeAddr: '0x172'});
        expect(events.deviceInterview.length).toBe(2);
        expect(events.deviceInterview[0].status).toBe('started');
        // @ts-expect-error private but deep cloned
        expect(events.deviceInterview[0].device._ieeeAddr).toBe('0x172');
        expect(events.deviceInterview[1].status).toBe('successful');
        // @ts-expect-error private but deep cloned
        expect(events.deviceInterview[1].device._ieeeAddr).toBe('0x172');
        expect(controller.getDeviceByIeeeAddr('0x172')!.modelID).toBe('GL-C-008');
    });

    it('Xiaomi end device joins (node descriptor fails)', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 150, ieeeAddr: '0x150'});
        expect(events.deviceInterview.length).toBe(2);
        expect(events.deviceInterview[0].status).toBe('started');
        // @ts-expect-error private but deep cloned
        expect(events.deviceInterview[0].device._ieeeAddr).toBe('0x150');
        expect(events.deviceInterview[1].status).toBe('successful');
        // @ts-expect-error private but deep cloned
        expect(events.deviceInterview[1].device._ieeeAddr).toBe('0x150');
        expect(deepClone(controller.getDeviceByIeeeAddr('0x150'))).toStrictEqual({
            ID: 2,
            _events: {},
            _eventsCount: 0,
            _pendingRequestTimeout: 0,
            _ieeeAddr: '0x150',
            _networkAddress: 150,
            _lastSeen: Date.now(),
            _linkquality: 50,
            _skipDefaultResponse: false,
            _customClusters: {},
            _endpoints: [
                {
                    ID: 1,
                    _events: {},
                    _eventsCount: 0,
                    clusters: {
                        genBasic: {
                            attributes: {
                                modelId: 'lumi.occupancy',
                            },
                        },
                    },
                    inputClusters: [],
                    outputClusters: [],
                    pendingRequests: {ID: 1, deviceIeeeAddress: '0x150', sendInProgress: false},
                    deviceNetworkAddress: 150,
                    deviceIeeeAddress: '0x150',
                    _binds: [],
                    _configuredReportings: [],
                    meta: {},
                },
            ],
            _type: 'EndDevice',
            _manufacturerID: 4151,
            _manufacturerName: 'LUMI',
            meta: {},
            _powerSource: 'Battery',
            _modelID: 'lumi.occupancy',
            _interviewCompleted: true,
            _interviewing: false,
        });
    });

    it('Xiaomi end device joins (node descriptor succeeds, but active endpoint response fails)', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 151, ieeeAddr: '0x151'});
        expect(events.deviceInterview.length).toBe(2);
        expect(events.deviceInterview[0].status).toBe('started');
        // @ts-expect-error private but deep cloned
        expect(events.deviceInterview[0].device._ieeeAddr).toBe('0x151');
        expect(events.deviceInterview[1].status).toBe('successful');
        // @ts-expect-error private but deep cloned
        expect(events.deviceInterview[1].device._ieeeAddr).toBe('0x151');
        expect(deepClone(controller.getDeviceByIeeeAddr('0x151'))).toStrictEqual({
            ID: 2,
            _events: {},
            _eventsCount: 0,
            _pendingRequestTimeout: 0,
            _ieeeAddr: '0x151',
            _networkAddress: 151,
            _lastSeen: Date.now(),
            _linkquality: 50,
            _skipDefaultResponse: false,
            _customClusters: {},
            _endpoints: [
                {
                    ID: 1,
                    _events: {},
                    _eventsCount: 0,
                    clusters: {
                        genBasic: {
                            attributes: {
                                modelId: 'lumi.occupancy',
                            },
                        },
                    },
                    inputClusters: [],
                    outputClusters: [],
                    pendingRequests: {ID: 1, deviceIeeeAddress: '0x151', sendInProgress: false},
                    deviceNetworkAddress: 151,
                    deviceIeeeAddress: '0x151',
                    _binds: [],
                    _configuredReportings: [],
                    meta: {},
                },
            ],
            _type: 'EndDevice',
            _manufacturerID: 1219,
            _manufacturerName: 'LUMI',
            meta: {},
            _powerSource: 'Battery',
            _modelID: 'lumi.occupancy',
            _interviewCompleted: true,
            _interviewing: false,
        });
    });

    it('Should use cached node descriptor when device is re-interviewed, but retrieve it when ignoreCache=true', async () => {
        await controller.start();
        mockAdapterSendZdo.mockClear();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        expect(mockAdapterSendZdo).toHaveBeenCalledTimes(3); // nodeDesc + activeEp + simpleDesc x1

        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const deviceNodeDescSpy = vi.spyOn(device, 'updateNodeDescriptor');

        // Interview with ignoreCache=false should use cached node descriptor
        await device.interview(false);
        expect(deviceNodeDescSpy).toHaveBeenCalledTimes(0);
        expect(mockAdapterSendZdo).toHaveBeenCalledTimes(5); // activeEp + simpleDesc x1

        // Interview with ignoreCache=true should read node descriptor
        await device.interview(true);
        expect(deviceNodeDescSpy).toHaveBeenCalledTimes(1);
        expect(mockAdapterSendZdo).toHaveBeenCalledTimes(8); // nodeDesc + activeEp + simpleDesc x1
    });

    it('Should remove disappeared endpoints on updateActiveEndpoints', async () => {
        await controller.start();
        mockAdapterSendZdo.mockClear();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});

        const device = controller.getDeviceByIeeeAddr('0x129')!;
        device.endpoints.push(Endpoint.create(2, undefined, undefined, [], [], device.networkAddress, device.ieeeAddr));
        expect(device.endpoints.map((e) => e.ID)).toStrictEqual([1, 2]);
        await device.updateActiveEndpoints();
        expect(device.endpoints.map((e) => e.ID)).toStrictEqual([1]);
    });

    it('Receive zclData report from unkown attribute', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const buffer = Buffer.from([
            28, 95, 17, 3, 10, 5, 0, 66, 21, 108, 117, 109, 105, 46, 115, 101, 110, 115, 111, 114, 95, 119, 108, 101, 97, 107, 46, 97, 113, 49, 1,
            255, 66, 34, 1, 33, 213, 12, 3, 40, 33, 4, 33, 168, 19, 5, 33, 43, 0, 6, 36, 0, 0, 5, 0, 0, 8, 33, 4, 2, 10, 33, 0, 0, 100, 16, 0,
        ]);
        const frame = Zcl.Frame.fromBuffer(Zcl.Utils.getCluster('genBasic', undefined, {}).ID, Zcl.Header.fromBuffer(buffer), buffer, {});
        vi.spyOn(Zcl.Frame, 'fromBuffer').mockReturnValueOnce(frame); // Mock because no Buffalo write isn't supported for this payload
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            address: 129,
            clusterID: frame.cluster.ID,
            data: null, // null intentionally
            header: frame.header,
            endpoint: 1,
            linkquality: 50,
            groupID: 1,
        });

        expect(events.message.length).toBe(1);
        const expected = {
            cluster: 'genBasic',
            type: 'attributeReport',
            device: {
                _events: {},
                _eventsCount: 0,
                _lastSeen: Date.now(),
                _linkquality: 50,
                _skipDefaultResponse: false,
                ID: 2,
                _ieeeAddr: '0x129',
                _networkAddress: 129,
                _customClusters: {},
                _endpoints: [
                    {
                        _events: {},
                        _eventsCount: 0,
                        ID: 1,
                        clusters: {
                            genBasic: {
                                attributes: {
                                    '65281': {
                                        '1': 3285,
                                        '10': 0,
                                        '100': 0,
                                        '3': 33,
                                        '4': 5032,
                                        '5': 43,
                                        '6': 327680,
                                        '8': 516,
                                    },
                                    modelId: 'lumi.sensor_wleak.aq1',
                                },
                            },
                        },
                        inputClusters: [0, 1],
                        outputClusters: [2],
                        pendingRequests: {ID: 1, deviceIeeeAddress: '0x129', sendInProgress: false},
                        deviceNetworkAddress: 129,
                        deviceIeeeAddress: '0x129',
                        _binds: [],
                        _configuredReportings: [],
                        meta: {},
                        deviceID: 5,
                        profileID: 99,
                    },
                ],
                _type: 'Router',
                _manufacturerID: 1212,
                _manufacturerName: 'KoenAndCo',
                meta: {},
                _powerSource: 'Mains (single phase)',
                _modelID: 'lumi.sensor_wleak.aq1',
                _applicationVersion: 2,
                _stackVersion: 101,
                _zclVersion: 1,
                _hardwareVersion: 3,
                _dateCode: '201901',
                _pendingRequestTimeout: 0,
                _softwareBuildID: '1.01',
                _interviewCompleted: true,
                _interviewing: false,
            },
            endpoint: {
                _events: {},
                _eventsCount: 0,
                ID: 1,
                deviceID: 5,
                inputClusters: [0, 1],
                outputClusters: [2],
                pendingRequests: {ID: 1, deviceIeeeAddress: '0x129', sendInProgress: false},
                deviceNetworkAddress: 129,
                deviceIeeeAddress: '0x129',
                _binds: [],
                _configuredReportings: [],
                profileID: 99,
                meta: {},
                clusters: {
                    genBasic: {
                        attributes: {
                            '65281': {
                                '1': 3285,
                                '10': 0,
                                '100': 0,
                                '3': 33,
                                '4': 5032,
                                '5': 43,
                                '6': 327680,
                                '8': 516,
                            },
                            modelId: 'lumi.sensor_wleak.aq1',
                        },
                    },
                },
            },
            data: {
                '65281': {
                    '1': 3285,
                    '3': 33,
                    '4': 5032,
                    '5': 43,
                    '6': 327680,
                    '8': 516,
                    '10': 0,
                    '100': 0,
                },
                modelId: 'lumi.sensor_wleak.aq1',
            },
            linkquality: 50,
            groupID: 1,
            meta: {
                zclTransactionSequenceNumber: 3,
                manufacturerCode: 4447,
                frameControl: {
                    reservedBits: 0,
                    direction: 1,
                    disableDefaultResponse: true,
                    frameType: 0,
                    manufacturerSpecific: true,
                },
            },
        };
        expect(deepClone(events.message[0])).toStrictEqual(expected);
    });

    it('Should allow to specify custom attributes for existing cluster', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        device.addCustomCluster('genBasic', {
            ID: 0,
            commands: {},
            commandsResponse: {},
            attributes: {
                customAttr: {ID: 256, type: Zcl.DataType.UINT8},
                aDifferentZclVersion: {ID: 0, type: Zcl.DataType.UINT8},
            },
        });
        const buffer = Buffer.from([24, 169, 10, 0, 1, 24, 3, 0, 0, 24, 1, 2, 0, 24, 1]);
        const header = Zcl.Header.fromBuffer(buffer);
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            address: 129,
            clusterID: 0,
            data: buffer,
            header,
            endpoint: 1,
            linkquality: 50,
            groupID: 1,
        });
        expect(events.message.length).toBe(1);
        expect(events.message[0].data).toStrictEqual({customAttr: 3, aDifferentZclVersion: 1, stackVersion: 1});
        expect(events.message[0].cluster).toBe('genBasic');
    });

    it('Should allow to specify custom cluster', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        device.addCustomCluster('myCustomCluster', {
            ID: 9123,
            commands: {},
            commandsResponse: {},
            attributes: {superAttribute: {ID: 0, type: Zcl.DataType.UINT8}},
        });
        const buffer = Buffer.from([24, 169, 10, 0, 1, 24, 3, 0, 0, 24, 1]);
        const header = Zcl.Header.fromBuffer(buffer);
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            address: 129,
            clusterID: 9123,
            data: buffer,
            header,
            endpoint: 1,
            linkquality: 50,
            groupID: 1,
        });
        expect(events.message.length).toBe(1);
        expect(events.message[0].data).toStrictEqual({superAttribute: 1, '256': 3});
        expect(events.message[0].cluster).toBe('myCustomCluster');
    });

    it('Should allow to specify custom cluster as override for Zcl cluster', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        device.addCustomCluster('myCustomCluster', {
            ID: Zcl.Clusters.genBasic.ID,
            commands: {},
            commandsResponse: {},
            attributes: {customAttr: {ID: 256, type: Zcl.DataType.UINT8}},
        });
        const buffer = Buffer.from([24, 169, 10, 0, 1, 24, 3, 0, 0, 24, 1]);
        const header = Zcl.Header.fromBuffer(buffer);
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            address: 129,
            clusterID: Zcl.Clusters.genBasic.ID,
            data: buffer,
            header,
            endpoint: 1,
            linkquality: 50,
            groupID: 1,
        });
        expect(events.message.length).toBe(1);
        expect(events.message[0].data).toStrictEqual({customAttr: 3, 0: 1 /*zclVersion no longer recognized, cluster is overridden*/});
        expect(events.message[0].cluster).toBe('myCustomCluster');
    });

    it('Send zcl command to all no options', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        device.getEndpoint(1)!.zclCommandBroadcast(255, BroadcastAddress.SLEEPY, Zcl.Clusters.ssIasZone.ID, 'initTestMode', {});
        const sentFrame = Zcl.Frame.create(
            Zcl.FrameType.SPECIFIC,
            Zcl.Direction.CLIENT_TO_SERVER,
            true,
            undefined,
            // @ts-expect-error private
            ZclTransactionSequenceNumber.number,
            'initTestMode',
            Zcl.Clusters.ssIasZone.ID,
            {},
            device.customClusters,
        );
        expect(mocksendZclFrameToAll.mock.calls[0][0]).toBe(255);
        expect(deepClone(mocksendZclFrameToAll.mock.calls[0][1])).toStrictEqual(deepClone(sentFrame));
        expect(mocksendZclFrameToAll.mock.calls[0][2]).toBe(1);
        expect(mocksendZclFrameToAll.mock.calls[0][3]).toBe(BroadcastAddress.SLEEPY);
        expect(mocksendZclFrameToAll).toHaveBeenCalledTimes(1);
    });

    it('Send zcl command to all with manufacturer option', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        device.addCustomCluster('ssIasZone', {
            ID: Zcl.Clusters.ssIasZone.ID,
            commands: {boschSmokeAlarmSiren: {ID: 0x80, parameters: [{name: 'data', type: Zcl.DataType.UINT16}]}},
            commandsResponse: {},
            attributes: {},
        });
        const options = {manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH};
        device
            .getEndpoint(1)!
            .zclCommandBroadcast(255, BroadcastAddress.SLEEPY, Zcl.Clusters.ssIasZone.ID, 'boschSmokeAlarmSiren', {data: 0x0000}, options);
        const sentFrame = Zcl.Frame.create(
            Zcl.FrameType.SPECIFIC,
            Zcl.Direction.CLIENT_TO_SERVER,
            true,
            Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
            // @ts-expect-error private
            ZclTransactionSequenceNumber.number,
            'boschSmokeAlarmSiren',
            Zcl.Clusters.ssIasZone.ID,
            {data: 0x0000},
            device.customClusters,
        );
        expect(mocksendZclFrameToAll.mock.calls[0][0]).toBe(255);
        expect(deepClone(mocksendZclFrameToAll.mock.calls[0][1])).toStrictEqual(deepClone(sentFrame));
        expect(mocksendZclFrameToAll.mock.calls[0][2]).toBe(1);
        expect(mocksendZclFrameToAll.mock.calls[0][3]).toBe(BroadcastAddress.SLEEPY);
        expect(mocksendZclFrameToAll).toHaveBeenCalledTimes(1);
    });

    it('Should roll-over transaction ID', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        mocksendZclFrameToEndpoint.mockClear();
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        expect(endpoint.supportsOutputCluster('genDeviceTempCfg')).toBeTruthy();
        expect(endpoint.supportsOutputCluster('genBasic')).toBeFalsy();
        for (let i = 0; i < 300; i++) {
            await endpoint.read('genBasic', ['modelId']);
        }
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(300);

        const ids: number[] = [];
        for (let i = 0; i < 300; i++) {
            ids.push(mocksendZclFrameToEndpoint.mock.calls[i][3].header.transactionSequenceNumber);
        }

        expect(ids.includes(255)).toBeTruthy();
        expect(ids.includes(256)).toBeFalsy();
    });

    it('Throw error when creating endpoint which already exists', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        let error;
        try {
            await device.createEndpoint(1);
        } catch (e) {
            error = e;
        }
        expect(error).toStrictEqual(new Error("Device '0x129' already has an endpoint '1'"));
    });

    it('Throw error when device with IEEE address already exists', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 140, ieeeAddr: '0x129'});
        let error;
        try {
            Device.create('Router', '0x129', 140, undefined, undefined, undefined, undefined, false);
        } catch (e) {
            error = e;
        }
        expect(error).toStrictEqual(new Error("Device with IEEE address '0x129' already exists"));
    });

    it('Should allow to set type', async () => {
        await controller.start();
        const device = Device.create('Router', '0x129', 140, undefined, undefined, undefined, undefined, false);
        device.type = 'EndDevice';
        expect(device.type).toStrictEqual('EndDevice');
    });

    it('Return device from databse when not in lookup', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 140, ieeeAddr: '0x129'});
        Device['lookup'] = {};
        expect(controller.getDeviceByIeeeAddr('0x129')).toBeInstanceOf(Device);
    });

    it('Throw error when interviewing and calling interview again', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 140, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const firstInterview = device.interview();
        let error;
        try {
            await device.interview();
        } catch (e) {
            error = e;
        }
        expect(error).toStrictEqual(new Error("Interview - interview already in progress for '0x129'"));
        try {
            await firstInterview;
        } catch (e) {}
    });

    it('Remove device from network', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 140, ieeeAddr: '0x140'});
        const device = controller.getDeviceByIeeeAddr('0x140')!;
        await device.removeFromNetwork();
        const zdoPayload = Zdo.Buffalo.buildRequest(false, Zdo.ClusterId.LEAVE_REQUEST, '0x140', Zdo.LeaveRequestFlags.WITHOUT_REJOIN);
        expect(mockAdapterSendZdo).toHaveBeenCalledWith('0x140', 140, Zdo.ClusterId.LEAVE_REQUEST, zdoPayload, false);
        expect(controller.getDeviceByIeeeAddr('0x140')).toBeUndefined();
        // shouldn't throw when removing from database when not in
        await device.removeFromDatabase();
    });

    it('Remove group from network', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const group = await controller.createGroup(4);
        const endpoint = device.getEndpoint(1)!;
        await endpoint.addToGroup(group);
        mocksendZclFrameToEndpoint.mockClear();

        await group.removeFromNetwork();

        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(1);
        const call = mocksendZclFrameToEndpoint.mock.calls[0];
        expect(call[0]).toBe('0x129');
        expect(call[1]).toBe(129);
        expect(call[2]).toBe(1);
        expect(deepClone(call[3])).toStrictEqual({
            header: {
                frameControl: {reservedBits: 0, frameType: 1, direction: 0, disableDefaultResponse: true, manufacturerSpecific: false},
                transactionSequenceNumber: 12,
                commandIdentifier: 3,
            },
            payload: {groupid: 4},
            cluster: {
                ID: 4,
                attributes: {nameSupport: {ID: 0, type: 24, name: 'nameSupport'}},
                name: 'genGroups',
                commands: {
                    add: {
                        ID: 0,
                        response: 0,
                        parameters: [
                            {name: 'groupid', type: 33},
                            {name: 'groupname', type: 66},
                        ],
                        name: 'add',
                    },
                    view: {ID: 1, response: 1, parameters: [{name: 'groupid', type: 33}], name: 'view'},
                    getMembership: {
                        ID: 2,
                        response: 2,
                        parameters: [
                            {name: 'groupcount', type: 32},
                            {name: 'grouplist', type: 1002},
                        ],
                        name: 'getMembership',
                    },
                    miboxerSetZones: {ID: 240, name: 'miboxerSetZones', parameters: [{name: 'zones', type: 1012}]},
                    remove: {ID: 3, response: 3, parameters: [{name: 'groupid', type: 33}], name: 'remove'},
                    removeAll: {ID: 4, parameters: [], name: 'removeAll'},
                    addIfIdentifying: {
                        ID: 5,
                        parameters: [
                            {name: 'groupid', type: 33},
                            {name: 'groupname', type: 66},
                        ],
                        name: 'addIfIdentifying',
                    },
                },
                commandsResponse: {
                    addRsp: {
                        ID: 0,
                        parameters: [
                            {name: 'status', type: 32},
                            {name: 'groupid', type: 33},
                        ],
                        name: 'addRsp',
                    },
                    viewRsp: {
                        ID: 1,
                        parameters: [
                            {name: 'status', type: 32},
                            {name: 'groupid', type: 33},
                            {name: 'groupname', type: 66},
                        ],
                        name: 'viewRsp',
                    },
                    getMembershipRsp: {
                        ID: 2,
                        parameters: [
                            {name: 'capacity', type: 32},
                            {name: 'groupcount', type: 32},
                            {name: 'grouplist', type: 1002},
                        ],
                        name: 'getMembershipRsp',
                    },
                    removeRsp: {
                        ID: 3,
                        parameters: [
                            {name: 'status', type: 32},
                            {name: 'groupid', type: 33},
                        ],
                        name: 'removeRsp',
                    },
                },
            },
            command: {ID: 3, response: 3, parameters: [{name: 'groupid', type: 33}], name: 'remove'},
        });
    });

    it('Remove group from database', async () => {
        await controller.start();
        const group = await controller.createGroup(4);
        await group.removeFromDatabase();
        expect(controller.getGroupByID(4)).toStrictEqual(undefined);
        // shouldn't throw when removing from database when not in
        await group.removeFromDatabase();
    });

    it('Device lqi', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 140, ieeeAddr: '0x140'});
        const device = controller.getDeviceByIeeeAddr('0x140')!;
        const result = await device.lqi();
        expect(result).toStrictEqual({
            neighbors: [
                {ieeeAddr: '0x160', networkAddress: 160, linkquality: 20, relationship: 2, depth: 5},
                {ieeeAddr: '0x170', networkAddress: 170, linkquality: 21, relationship: 4, depth: 8},
            ],
        });
    });

    it('Device routing table', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 140, ieeeAddr: '0x140'});
        const device = controller.getDeviceByIeeeAddr('0x140')!;
        const result = await device.routingTable();
        expect(result).toStrictEqual({
            table: [
                {destinationAddress: 120, status: 'ACTIVE', nextHop: 1},
                {destinationAddress: 130, status: 'DISCOVERY_FAILED', nextHop: 2},
            ],
        });
    });

    it('Device ping', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 176, ieeeAddr: '0x176'});
        const device = controller.getDeviceByIeeeAddr('0x176')!;
        mocksendZclFrameToEndpoint.mockClear();
        const result = await device.ping();
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(1);
        const call = mocksendZclFrameToEndpoint.mock.calls[0];
        expect(call[0]).toBe('0x176');
        expect(call[1]).toBe(176);
        expect(call[2]).toBe(1);
        expect(deepClone(call[3])).toStrictEqual({
            header: {
                frameControl: {reservedBits: 0, frameType: 0, direction: 0, disableDefaultResponse: true, manufacturerSpecific: false},
                transactionSequenceNumber: 2,
                commandIdentifier: 0,
            },
            payload: [{attrId: 0}],
            cluster: {
                ID: 0,
                attributes: {
                    zclVersion: {ID: 0, type: 32, name: 'zclVersion'},
                    appVersion: {ID: 1, type: 32, name: 'appVersion'},
                    stackVersion: {ID: 2, type: 32, name: 'stackVersion'},
                    hwVersion: {ID: 3, type: 32, name: 'hwVersion'},
                    manufacturerName: {ID: 4, type: 66, name: 'manufacturerName'},
                    modelId: {ID: 5, type: 66, name: 'modelId'},
                    dateCode: {ID: 6, type: 66, name: 'dateCode'},
                    powerSource: {ID: 7, type: 48, name: 'powerSource'},
                    appProfileVersion: {ID: 8, type: 48, name: 'appProfileVersion'},
                    genericDeviceType: {ID: 9, type: 48, name: 'genericDeviceType'},
                    productCode: {ID: 10, type: 65, name: 'productCode'},
                    productUrl: {ID: 11, type: 66, name: 'productUrl'},
                    manufacturerVersionDetails: {ID: 12, type: 66, name: 'manufacturerVersionDetails'},
                    serialNumber: {ID: 13, type: 66, name: 'serialNumber'},
                    productLabel: {ID: 14, type: 66, name: 'productLabel'},
                    locationDesc: {ID: 16, type: 66, name: 'locationDesc'},
                    physicalEnv: {ID: 17, type: 48, name: 'physicalEnv'},
                    deviceEnabled: {ID: 18, type: 16, name: 'deviceEnabled'},
                    alarmMask: {ID: 19, type: 24, name: 'alarmMask'},
                    disableLocalConfig: {ID: 20, type: 24, name: 'disableLocalConfig'},
                    swBuildId: {ID: 16384, type: 66, name: 'swBuildId'},
                    schneiderMeterRadioPower: {ID: 57856, manufacturerCode: 4190, name: 'schneiderMeterRadioPower', type: 40},
                },
                name: 'genBasic',
                commands: {
                    resetFactDefault: {ID: 0, parameters: [], name: 'resetFactDefault'},
                    tuyaSetup: {ID: 240, parameters: [], name: 'tuyaSetup'},
                },
                commandsResponse: {},
            },
            command: {ID: 0, name: 'read', parameters: [{name: 'attrId', type: 33}], response: 1},
        });
        expect(call[4]).toBe(10000);
        expect(call[5]).toBe(false);
        expect(call[6]).toBe(true);
        expect(call[7]).toBeUndefined();
    });

    it('Poll control supported', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 174, ieeeAddr: '0x174'});
        const device = controller.getDeviceByIeeeAddr('0x174')!;
        await device.interview();
        const endpoint = device.getEndpoint(1)!;
        const coordinator = Device.byType('Coordinator')[0];
        const target = coordinator.getEndpoint(1);
        expect(deepClone(endpoint.binds)).toStrictEqual(deepClone([{cluster: Zcl.Utils.getCluster('genPollCtrl', undefined, {}), target}]));

        device.checkinInterval = undefined;
        expect(device.checkinInterval).toBeUndefined();
        expect(device.pendingRequestTimeout).toStrictEqual(0);
        mocksendZclFrameToEndpoint.mockClear();
        mocksendZclFrameToEndpoint.mockReturnValueOnce(null);
        mocksendZclFrameToEndpoint.mockImplementationOnce((ieeeAddr, networkAddress, endpoint, frame: Zcl.Frame) => {
            const payload = [{attrId: 0, status: 0, dataType: 35, attrData: 204}];
            const responseFrame = Zcl.Frame.create(0, 1, true, undefined, 10, 'readRsp', frame.cluster.ID, payload, {});
            return {header: responseFrame.header, data: responseFrame.toBuffer(), clusterID: frame.cluster.ID};
        });
        mocksendZclFrameToEndpoint.mockImplementationOnce(() => vi.advanceTimersByTime(10));
        let frame = Zcl.Frame.create(
            Zcl.FrameType.SPECIFIC,
            Zcl.Direction.SERVER_TO_CLIENT,
            true,
            1,
            1,
            'checkin',
            Zcl.Utils.getCluster('genPollCtrl', undefined, {}).ID,
            {},
            {},
        );
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            address: 174,
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: 1,
            linkquality: 52,
            groupID: undefined,
        });
        await flushPromises();
        expect(device.checkinInterval).toStrictEqual(51);
        expect(device.pendingRequestTimeout).toStrictEqual(51000);
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(3);
        device.checkinInterval = 50;

        mocksendZclFrameToEndpoint.mockClear();
        frame = Zcl.Frame.create(
            Zcl.FrameType.SPECIFIC,
            Zcl.Direction.SERVER_TO_CLIENT,
            true,
            1,
            1,
            'checkin',
            Zcl.Utils.getCluster('genPollCtrl', undefined, {}).ID,
            {},
            {},
        );
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            address: 174,
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: 1,
            linkquality: 52,
            groupID: undefined,
        });
        const call = mocksendZclFrameToEndpoint.mock.calls[0];
        expect(call[0]).toBe('0x174');
        expect(call[1]).toBe(174);
        expect(call[2]).toBe(1);
        expect(call[3].cluster.name).toBe('genPollCtrl');
        expect(call[3].command.name).toBe('checkinRsp');
        expect(call[3].payload).toStrictEqual({startFastPolling: false, fastPollTimeout: 0});
    });

    it('Poll control unsupported', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        await device.interview();
        const endpoint = device.getEndpoint(1)!;
        expect(deepClone(endpoint.binds)).toStrictEqual([]);
    });

    it('Endpoint get id', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        expect(device.getEndpoint(1)!.ID).toBe(1);
    });

    it('Endpoint get id by endpoint device type', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 172, ieeeAddr: '0x172'});
        const device = controller.getDeviceByIeeeAddr('0x172')!;
        expect(device.getEndpointByDeviceType('ZLLOnOffPluginUnit')).toBeUndefined();
        expect(device.getEndpointByDeviceType('ZLLExtendedColorLight')!.ID).toBe(11);
    });

    it('Endpoint bind', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        await mockAdapterEvents['deviceJoined']({networkAddress: 170, ieeeAddr: '0x170'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const target = controller.getDeviceByIeeeAddr('0x170')!.getEndpoint(1)!;
        const endpoint = device.getEndpoint(1)!;
        mockAdapterSendZdo.mockClear();
        await endpoint.bind('genBasic', target);
        expect(deepClone(endpoint.binds)).toStrictEqual(deepClone([{cluster: Zcl.Utils.getCluster(0, undefined, {}), target}]));
        const zdoPayload = Zdo.Buffalo.buildRequest(false, Zdo.ClusterId.BIND_REQUEST, '0x129', 1, 0, Zdo.UNICAST_BINDING, '0x170', 0, 1);
        expect(mockAdapterSendZdo).toHaveBeenCalledWith('0x129', 129, Zdo.ClusterId.BIND_REQUEST, zdoPayload, false);

        // Should bind another time but not add it to the binds
        mockAdapterSendZdo.mockClear();
        await endpoint.bind('genBasic', target);
        expect(deepClone(endpoint.binds)).toStrictEqual(deepClone([{cluster: Zcl.Utils.getCluster(0, undefined, {}), target}]));
        expect(mockAdapterSendZdo).toHaveBeenCalledWith('0x129', 129, Zdo.ClusterId.BIND_REQUEST, zdoPayload, false);
    });

    it('Endpoint addBinding', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        await mockAdapterEvents['deviceJoined']({networkAddress: 170, ieeeAddr: '0x170'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const target = controller.getDeviceByIeeeAddr('0x170')!.getEndpoint(1)!;
        const endpoint = device.getEndpoint(1)!;
        endpoint.addBinding('genPowerCfg', target);
        expect(deepClone(endpoint.binds)).toStrictEqual(deepClone([{cluster: Zcl.Utils.getCluster(1, undefined, {}), target}]));

        // Should bind another time but not add it to the binds
        endpoint.addBinding('genPowerCfg', target);
        expect(deepClone(endpoint.binds)).toStrictEqual(deepClone([{cluster: Zcl.Utils.getCluster(1, undefined, {}), target}]));
    });

    it('Endpoint get binds non-existing device', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        // @ts-expect-error private
        endpoint._binds.push({
            type: 'endpoint',
            deviceIeeeAddress: 'notexisting',
            endpointID: 1,
            cluster: 2,
        });
        expect(endpoint.binds).toStrictEqual([]);
    });

    it('Group bind', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const group = await controller.createGroup(4);
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        await endpoint.bind('genPowerCfg', group);
        expect(deepClone(endpoint.binds)).toStrictEqual(deepClone([{cluster: Zcl.Utils.getCluster(1, undefined, {}), target: group}]));
        const zdoPayload = Zdo.Buffalo.buildRequest(
            false,
            Zdo.ClusterId.BIND_REQUEST,
            '0x129',
            1,
            1,
            Zdo.MULTICAST_BINDING,
            ZSpec.BLANK_EUI64,
            4,
            0xff,
        );
        expect(mockAdapterSendZdo).toHaveBeenCalledWith('0x129', 129, Zdo.ClusterId.BIND_REQUEST, zdoPayload, false);
    });

    it('Group addBinding', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const group = await controller.createGroup(4);
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        endpoint.addBinding('genBasic', group);
        expect(deepClone(endpoint.binds)).toStrictEqual(deepClone([{cluster: Zcl.Utils.getCluster(0, undefined, {}), target: group}]));
    });

    it('Group bind by number (should create group)', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        expect(Group.byGroupID(11)).toBeUndefined();
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        await endpoint.bind('genPowerCfg', 11);
        const group = Group.byGroupID(11);
        expect(deepClone(endpoint.binds)).toStrictEqual(deepClone([{cluster: Zcl.Utils.getCluster(1, undefined, {}), target: group}]));
        const zdoPayload = Zdo.Buffalo.buildRequest(
            false,
            Zdo.ClusterId.BIND_REQUEST,
            '0x129',
            1,
            1,
            Zdo.MULTICAST_BINDING,
            ZSpec.BLANK_EUI64,
            11,
            0xff,
        );
        expect(mockAdapterSendZdo).toHaveBeenCalledWith('0x129', 129, Zdo.ClusterId.BIND_REQUEST, zdoPayload, false);
    });

    it('Group addBinding by number (should create group)', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        expect(Group.byGroupID(11)).toBeUndefined();
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        endpoint.addBinding('genBasic', 11);
        const group = Group.byGroupID(11);
        expect(deepClone(endpoint.binds)).toStrictEqual(deepClone([{cluster: Zcl.Utils.getCluster(0, undefined, {}), target: group}]));
    });

    it('Endpoint unbind', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        await mockAdapterEvents['deviceJoined']({networkAddress: 170, ieeeAddr: '0x170'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const target = controller.getDeviceByIeeeAddr('0x170')!.getEndpoint(1)!;
        const endpoint = device.getEndpoint(1)!;
        await endpoint.bind('genBasic', target);
        await endpoint.unbind('genBasic', target);
        expect(endpoint.binds).toStrictEqual([]);
        const zdoPayload = Zdo.Buffalo.buildRequest(false, Zdo.ClusterId.UNBIND_REQUEST, '0x129', 1, 0, Zdo.UNICAST_BINDING, '0x170', 0, 1);
        expect(mockAdapterSendZdo).toHaveBeenCalledWith('0x129', 129, Zdo.ClusterId.UNBIND_REQUEST, zdoPayload, false);

        // Should unbind another time when not in binds
        await endpoint.unbind('genBasic', target);
        expect(endpoint.binds).toStrictEqual([]);
        expect(mockAdapterSendZdo).toHaveBeenCalledWith('0x129', 129, Zdo.ClusterId.UNBIND_REQUEST, zdoPayload, false);
    });

    it('Group unbind', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const group = await controller.createGroup(5);
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        expect(endpoint.binds.length).toBe(0);
        await endpoint.bind('genPowerCfg', group);
        expect(endpoint.binds.length).toBe(1);
        await endpoint.unbind('genPowerCfg', group);
        const zdoPayload = Zdo.Buffalo.buildRequest(
            false,
            Zdo.ClusterId.UNBIND_REQUEST,
            '0x129',
            1,
            1,
            Zdo.MULTICAST_BINDING,
            ZSpec.BLANK_EUI64,
            5,
            0xff,
        );
        expect(mockAdapterSendZdo).toHaveBeenCalledWith('0x129', 129, Zdo.ClusterId.UNBIND_REQUEST, zdoPayload, false);
        expect(endpoint.binds.length).toBe(0);
    });

    it('Group unbind by number', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const group = await controller.createGroup(5);
        const endpoint = device.getEndpoint(1)!;
        expect(endpoint.binds.length).toBe(0);
        await endpoint.bind('genPowerCfg', group);
        expect(endpoint.binds.length).toBe(1);
        await endpoint.unbind('genPowerCfg', 5);
        const zdoPayload = Zdo.Buffalo.buildRequest(
            false,
            Zdo.ClusterId.UNBIND_REQUEST,
            '0x129',
            1,
            1,
            Zdo.MULTICAST_BINDING,
            ZSpec.BLANK_EUI64,
            5,
            0xff,
        );
        expect(mockAdapterSendZdo).toHaveBeenCalledWith('0x129', 129, Zdo.ClusterId.UNBIND_REQUEST, zdoPayload, false);
        expect(endpoint.binds.length).toBe(0);
    });

    it('Endpoint configure reporting', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        mocksendZclFrameToEndpoint.mockClear();
        await endpoint.configureReporting('genPowerCfg', [
            {
                attribute: 'mainsFrequency',
                minimumReportInterval: 1,
                maximumReportInterval: 10,
                reportableChange: 1,
            },
        ]);

        const call = mocksendZclFrameToEndpoint.mock.calls[0];
        expect(call[0]).toBe('0x129');
        expect(call[1]).toBe(129);
        expect(call[2]).toBe(1);
        expect(deepClone(call[3])).toStrictEqual({
            header: {
                frameControl: {reservedBits: 0, frameType: 0, direction: 0, disableDefaultResponse: true, manufacturerSpecific: false},
                transactionSequenceNumber: 11,
                commandIdentifier: 6,
            },
            payload: [{direction: 0, attrId: 1, dataType: 32, minRepIntval: 1, maxRepIntval: 10, repChange: 1}],
            cluster: {
                ID: 1,
                attributes: {
                    mainsVoltage: {ID: 0, type: 33, name: 'mainsVoltage'},
                    mainsFrequency: {ID: 1, type: 32, name: 'mainsFrequency'},
                    mainsAlarmMask: {ID: 16, type: 24, name: 'mainsAlarmMask'},
                    mainsVoltMinThres: {ID: 17, type: 33, name: 'mainsVoltMinThres'},
                    mainsVoltMaxThres: {ID: 18, type: 33, name: 'mainsVoltMaxThres'},
                    mainsVoltageDwellTripPoint: {ID: 19, type: 33, name: 'mainsVoltageDwellTripPoint'},
                    batteryVoltage: {ID: 32, type: 32, name: 'batteryVoltage'},
                    batteryPercentageRemaining: {ID: 33, type: 32, name: 'batteryPercentageRemaining'},
                    batteryManufacturer: {ID: 48, type: 66, name: 'batteryManufacturer'},
                    batterySize: {ID: 49, type: 48, name: 'batterySize'},
                    batteryAHrRating: {ID: 50, type: 33, name: 'batteryAHrRating'},
                    batteryQuantity: {ID: 51, type: 32, name: 'batteryQuantity'},
                    batteryRatedVoltage: {ID: 52, type: 32, name: 'batteryRatedVoltage'},
                    batteryAlarmMask: {ID: 53, type: 24, name: 'batteryAlarmMask'},
                    batteryVoltMinThres: {ID: 54, type: 32, name: 'batteryVoltMinThres'},
                    batteryVoltThres1: {ID: 55, type: 32, name: 'batteryVoltThres1'},
                    batteryVoltThres2: {ID: 56, type: 32, name: 'batteryVoltThres2'},
                    batteryVoltThres3: {ID: 57, type: 32, name: 'batteryVoltThres3'},
                    batteryPercentMinThres: {ID: 58, type: 32, name: 'batteryPercentMinThres'},
                    batteryPercentThres1: {ID: 59, type: 32, name: 'batteryPercentThres1'},
                    batteryPercentThres2: {ID: 60, type: 32, name: 'batteryPercentThres2'},
                    batteryPercentThres3: {ID: 61, type: 32, name: 'batteryPercentThres3'},
                    batteryAlarmState: {ID: 62, type: 27, name: 'batteryAlarmState'},
                },
                name: 'genPowerCfg',
                commands: {},
                commandsResponse: {},
            },
            command: {
                ID: 6,
                name: 'configReport',
                parameters: [
                    {name: 'direction', type: 32},
                    {name: 'attrId', type: 33},
                    {name: 'dataType', type: 32, conditions: [{type: 'directionEquals', value: 0}]},
                    {name: 'minRepIntval', type: 33, conditions: [{type: 'directionEquals', value: 0}]},
                    {name: 'maxRepIntval', type: 33, conditions: [{type: 'directionEquals', value: 0}]},
                    {
                        name: 'repChange',
                        type: 1000,
                        conditions: [
                            {type: 'directionEquals', value: 0},
                            {type: 'dataTypeValueTypeEquals', value: 'ANALOG'},
                        ],
                    },
                    {name: 'timeout', type: 33, conditions: [{type: 'directionEquals', value: 1}]},
                ],
                response: 7,
            },
        });
    });

    it('Should replace legacy configured reportings without manufacturerCode', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        mocksendZclFrameToEndpoint.mockClear();

        // @ts-expect-error private
        endpoint._configuredReportings = [{cluster: 65382, attrId: 5, minRepIntval: 60, maxRepIntval: 900, repChange: 1}];

        await endpoint.configureReporting('liXeePrivate', [
            {
                attribute: 'warnDPS',
                minimumReportInterval: 1,
                maximumReportInterval: 10,
                reportableChange: 1,
            },
        ]);

        expect(endpoint.configuredReportings.length).toBe(1);
        expect(endpoint.configuredReportings[0].attribute.name).toBe('warnDPS');
        expect(endpoint.configuredReportings[0].cluster.name).toBe('liXeePrivate');
    });

    it('Endpoint configure reporting for manufacturer specific attribute', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        // @ts-expect-error private
        device._manufacturerID = 4641;
        const endpoint = device.getEndpoint(1)!;
        mocksendZclFrameToEndpoint.mockClear();
        await endpoint.configureReporting(
            'hvacThermostat',
            [
                {
                    attribute: 'viessmannWindowOpenInternal',
                    minimumReportInterval: 1,
                    maximumReportInterval: 10,
                    reportableChange: 1,
                },
            ],
            {manufacturerCode: 0x1221},
        );

        const call = mocksendZclFrameToEndpoint.mock.calls[0];
        expect(call[0]).toBe('0x129');
        expect(call[1]).toBe(129);
        expect(call[2]).toBe(1);
        expect({...deepClone(call[3]), cluster: {}}).toStrictEqual({
            cluster: {},
            command: {
                ID: 6,
                name: 'configReport',
                parameters: [
                    {name: 'direction', type: 32},
                    {name: 'attrId', type: 33},
                    {conditions: [{type: 'directionEquals', value: 0}], name: 'dataType', type: 32},
                    {conditions: [{type: 'directionEquals', value: 0}], name: 'minRepIntval', type: 33},
                    {conditions: [{type: 'directionEquals', value: 0}], name: 'maxRepIntval', type: 33},
                    {
                        conditions: [
                            {type: 'directionEquals', value: 0},
                            {type: 'dataTypeValueTypeEquals', value: 'ANALOG'},
                        ],
                        name: 'repChange',
                        type: 1000,
                    },
                    {conditions: [{type: 'directionEquals', value: 1}], name: 'timeout', type: 33},
                ],
                response: 7,
            },
            header: {
                commandIdentifier: 6,
                frameControl: {direction: 0, disableDefaultResponse: true, frameType: 0, manufacturerSpecific: true, reservedBits: 0},
                manufacturerCode: 4641,
                transactionSequenceNumber: 11,
            },
            payload: [{attrId: 16384, dataType: 48, direction: 0, maxRepIntval: 10, minRepIntval: 1, repChange: 1}],
        });

        expect(endpoint.configuredReportings.length).toBe(1);
        expect({...endpoint.configuredReportings[0], cluster: undefined}).toStrictEqual({
            attribute: {ID: 16384, type: 48, manufacturerCode: 4641, name: 'viessmannWindowOpenInternal'},
            minimumReportInterval: 1,
            maximumReportInterval: 10,
            reportableChange: 1,
            cluster: undefined,
        });
    });

    it('Endpoint configure reporting for manufacturer specific attribute from definition', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        // @ts-expect-error private
        device._manufacturerID = 0x10f2;
        const endpoint = device.getEndpoint(1)!;
        mocksendZclFrameToEndpoint.mockClear();
        await endpoint.configureReporting('hvacThermostat', [
            {
                attribute: 'viessmannWindowOpenInternal',
                minimumReportInterval: 1,
                maximumReportInterval: 10,
                reportableChange: 1,
            },
        ]);

        const call = mocksendZclFrameToEndpoint.mock.calls[0];
        expect(call[0]).toBe('0x129');
        expect(call[1]).toBe(129);
        expect(call[2]).toBe(1);
        expect({...deepClone(call[3]), cluster: {}}).toStrictEqual({
            cluster: {},
            command: {
                ID: 6,
                name: 'configReport',
                parameters: [
                    {name: 'direction', type: 32},
                    {name: 'attrId', type: 33},
                    {conditions: [{type: 'directionEquals', value: 0}], name: 'dataType', type: 32},
                    {conditions: [{type: 'directionEquals', value: 0}], name: 'minRepIntval', type: 33},
                    {conditions: [{type: 'directionEquals', value: 0}], name: 'maxRepIntval', type: 33},
                    {
                        conditions: [
                            {type: 'directionEquals', value: 0},
                            {type: 'dataTypeValueTypeEquals', value: 'ANALOG'},
                        ],
                        name: 'repChange',
                        type: 1000,
                    },
                    {conditions: [{type: 'directionEquals', value: 1}], name: 'timeout', type: 33},
                ],
                response: 7,
            },
            header: {
                commandIdentifier: 6,
                frameControl: {direction: 0, disableDefaultResponse: true, frameType: 0, manufacturerSpecific: true, reservedBits: 0},
                manufacturerCode: 4641,
                transactionSequenceNumber: 11,
            },
            payload: [{attrId: 16384, dataType: 48, direction: 0, maxRepIntval: 10, minRepIntval: 1, repChange: 1}],
        });

        expect(endpoint.configuredReportings.length).toBe(1);
        expect({...endpoint.configuredReportings[0], cluster: undefined}).toStrictEqual({
            attribute: {ID: 16384, type: 48, manufacturerCode: 4641, name: 'viessmannWindowOpenInternal'},
            minimumReportInterval: 1,
            maximumReportInterval: 10,
            reportableChange: 1,
            cluster: undefined,
        });
    });

    it('Endpoint configure reporting with manufacturer attribute should throw exception', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        // @ts-expect-error private
        device._manufacturerID = 0x10f2;
        const endpoint = device.getEndpoint(1)!;
        mocksendZclFrameToEndpoint.mockClear();
        let error;
        try {
            await endpoint.configureReporting('hvacThermostat', [
                {
                    attribute: 'localTemp',
                    minimumReportInterval: 1,
                    maximumReportInterval: 10,
                    reportableChange: 1,
                },
                {
                    attribute: 'viessmannWindowOpenInternal',
                    minimumReportInterval: 1,
                    maximumReportInterval: 10,
                    reportableChange: 1,
                },
            ]);
        } catch (e) {
            error = e;
        }
        expect(error).toStrictEqual(new Error("Cannot have attributes with different manufacturerCode in single 'configureReporting' call"));
    });

    it('Save endpoint configure reporting', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        const genPowerCfg = Zcl.Utils.getCluster('genPowerCfg', undefined, {});
        const msOccupancySensing = Zcl.Utils.getCluster('msOccupancySensing', undefined, {});

        await endpoint.configureReporting('genPowerCfg', [
            {attribute: 'mainsFrequency', minimumReportInterval: 1, maximumReportInterval: 10, reportableChange: 1},
        ]);
        expect(deepClone(endpoint.configuredReportings)).toStrictEqual([
            {
                cluster: deepClone(genPowerCfg),
                attribute: genPowerCfg.getAttribute('mainsFrequency'),
                minimumReportInterval: 1,
                maximumReportInterval: 10,
                reportableChange: 1,
            },
        ]);

        await endpoint.configureReporting('genPowerCfg', [
            {attribute: 'mainsFrequency', minimumReportInterval: 3, maximumReportInterval: 100, reportableChange: 2},
        ]);
        expect(deepClone(endpoint.configuredReportings)).toStrictEqual([
            {
                cluster: deepClone(genPowerCfg),
                attribute: genPowerCfg.getAttribute('mainsFrequency'),
                minimumReportInterval: 3,
                maximumReportInterval: 100,
                reportableChange: 2,
            },
        ]);

        await endpoint.configureReporting('msOccupancySensing', [
            {attribute: 'occupancy', minimumReportInterval: 3, maximumReportInterval: 100, reportableChange: 2},
        ]);
        expect(deepClone(endpoint.configuredReportings)).toStrictEqual([
            {
                cluster: deepClone(genPowerCfg),
                attribute: genPowerCfg.getAttribute('mainsFrequency'),
                minimumReportInterval: 3,
                maximumReportInterval: 100,
                reportableChange: 2,
            },
            {
                cluster: deepClone(msOccupancySensing),
                attribute: msOccupancySensing.getAttribute('occupancy'),
                minimumReportInterval: 3,
                maximumReportInterval: 100,
                reportableChange: 2,
            },
        ]);

        await endpoint.configureReporting('msOccupancySensing', [
            {attribute: 'occupancy', minimumReportInterval: 3, maximumReportInterval: 0xffff, reportableChange: 2},
        ]);
        expect(deepClone(endpoint.configuredReportings)).toStrictEqual([
            {
                cluster: deepClone(genPowerCfg),
                attribute: genPowerCfg.getAttribute('mainsFrequency'),
                minimumReportInterval: 3,
                maximumReportInterval: 100,
                reportableChange: 2,
            },
        ]);
    });

    it('Endpoint configure reporting fails when status code is not 0', async () => {
        configureReportStatus = 1;
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        mocksendZclFrameToEndpoint.mockClear();
        let error;
        try {
            await endpoint.configureReporting('genPowerCfg', [
                {
                    attribute: 'mainsFrequency',
                    minimumReportInterval: 1,
                    maximumReportInterval: 10,
                    reportableChange: 1,
                },
            ]);
        } catch (e) {
            error = e;
        }
        expect(error instanceof Zcl.StatusError).toBeTruthy();
        expect(error.message).toStrictEqual(
            `ZCL command 0x129/1 genPowerCfg.configReport([{\"attribute\":\"mainsFrequency\",\"minimumReportInterval\":1,\"maximumReportInterval\":10,\"reportableChange\":1}], {\"timeout\":10000,\"disableResponse\":false,\"disableRecovery\":false,\"disableDefaultResponse\":true,\"direction\":0,\"reservedBits\":0,\"writeUndiv\":false}) failed (Status 'FAILURE')`,
        );
        expect(error.code).toBe(1);
    });

    it('Endpoint configure reporting fails when status code is not 0 default rsp', async () => {
        configureReportStatus = 1;
        configureReportDefaultRsp = true;
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        mocksendZclFrameToEndpoint.mockClear();
        let error;
        try {
            await endpoint.configureReporting('genPowerCfg', [
                {
                    attribute: 'mainsFrequency',
                    minimumReportInterval: 1,
                    maximumReportInterval: 10,
                    reportableChange: 1,
                },
            ]);
        } catch (e) {
            error = e;
        }
        expect(error instanceof Zcl.StatusError).toBeTruthy();
        expect(error.message).toStrictEqual(
            `ZCL command 0x129/1 genPowerCfg.configReport([{\"attribute\":\"mainsFrequency\",\"minimumReportInterval\":1,\"maximumReportInterval\":10,\"reportableChange\":1}], {\"timeout\":10000,\"disableResponse\":false,\"disableRecovery\":false,\"disableDefaultResponse\":true,\"direction\":0,\"reservedBits\":0,\"writeUndiv\":false}) failed (Status 'FAILURE')`,
        );
        expect(error.code).toBe(1);
    });

    it('Endpoint configure reporting with disable response', async () => {
        configureReportStatus = 1;
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        mocksendZclFrameToEndpoint.mockReturnValueOnce(null);
        let error;
        try {
            await endpoint.configureReporting(
                'genPowerCfg',
                [
                    {
                        attribute: 'mainsFrequency',
                        minimumReportInterval: 1,
                        maximumReportInterval: 10,
                        reportableChange: 1,
                    },
                ],
                {disableResponse: true},
            );
        } catch (e) {
            error = e;
        }
        expect(error).toBeUndefined();
    });

    it('Return group from databse when not in lookup', async () => {
        await controller.start();
        await controller.createGroup(2);
        Group['lookup'] = {};
        expect(controller.getGroupByID(2)).toBeInstanceOf(Group);
    });

    it('Throw error when creating group already exists', async () => {
        await controller.start();
        await controller.createGroup(2);
        let error;
        try {
            await controller.createGroup(2);
        } catch (e) {
            error = e;
        }
        expect(error).toStrictEqual(new Error("Group with groupID '2' already exists"));
    });

    it('Add endpoint to group', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        const group = await controller.createGroup(2);
        mocksendZclFrameToEndpoint.mockClear();
        await endpoint.addToGroup(group);
        const call = mocksendZclFrameToEndpoint.mock.calls[0];
        expect(call[0]).toBe('0x129');
        expect(call[1]).toBe(129);
        expect(call[2]).toBe(1);
        expect(deepClone(call[3])).toStrictEqual({
            header: {
                frameControl: {reservedBits: 0, frameType: 1, direction: 0, disableDefaultResponse: true, manufacturerSpecific: false},
                transactionSequenceNumber: 11,
                commandIdentifier: 0,
            },
            payload: {groupid: 2, groupname: ''},
            cluster: {
                ID: 4,
                attributes: {nameSupport: {ID: 0, type: 24, name: 'nameSupport'}},
                name: 'genGroups',
                commands: {
                    add: {
                        ID: 0,
                        response: 0,
                        parameters: [
                            {name: 'groupid', type: 33},
                            {name: 'groupname', type: 66},
                        ],
                        name: 'add',
                    },
                    view: {ID: 1, response: 1, parameters: [{name: 'groupid', type: 33}], name: 'view'},
                    getMembership: {
                        ID: 2,
                        response: 2,
                        parameters: [
                            {name: 'groupcount', type: 32},
                            {name: 'grouplist', type: 1002},
                        ],
                        name: 'getMembership',
                    },
                    miboxerSetZones: {ID: 240, name: 'miboxerSetZones', parameters: [{name: 'zones', type: 1012}]},
                    remove: {ID: 3, response: 3, parameters: [{name: 'groupid', type: 33}], name: 'remove'},
                    removeAll: {ID: 4, parameters: [], name: 'removeAll'},
                    addIfIdentifying: {
                        ID: 5,
                        parameters: [
                            {name: 'groupid', type: 33},
                            {name: 'groupname', type: 66},
                        ],
                        name: 'addIfIdentifying',
                    },
                },
                commandsResponse: {
                    addRsp: {
                        ID: 0,
                        parameters: [
                            {name: 'status', type: 32},
                            {name: 'groupid', type: 33},
                        ],
                        name: 'addRsp',
                    },
                    viewRsp: {
                        ID: 1,
                        parameters: [
                            {name: 'status', type: 32},
                            {name: 'groupid', type: 33},
                            {name: 'groupname', type: 66},
                        ],
                        name: 'viewRsp',
                    },
                    getMembershipRsp: {
                        ID: 2,
                        parameters: [
                            {name: 'capacity', type: 32},
                            {name: 'groupcount', type: 32},
                            {name: 'grouplist', type: 1002},
                        ],
                        name: 'getMembershipRsp',
                    },
                    removeRsp: {
                        ID: 3,
                        parameters: [
                            {name: 'status', type: 32},
                            {name: 'groupid', type: 33},
                        ],
                        name: 'removeRsp',
                    },
                },
            },
            command: {
                ID: 0,
                response: 0,
                parameters: [
                    {name: 'groupid', type: 33},
                    {name: 'groupname', type: 66},
                ],
                name: 'add',
            },
        });
        expect(group.members).toContain(endpoint);
        expect(databaseContents()).toContain(
            `{"id":1,"type":"Coordinator","ieeeAddr":"0x0000012300000000","nwkAddr":0,"manufId":7,"epList":[1,2],"endpoints":{"1":{"profId":2,"epId":1,"devId":3,"inClusterList":[10],"outClusterList":[11],"clusters":{},"binds":[],"configuredReportings":[],"meta":{}},"2":{"profId":3,"epId":2,"devId":5,"inClusterList":[1],"outClusterList":[0],"clusters":{},"binds":[],"configuredReportings":[],"meta":{}}},"interviewCompleted":true,"meta":{}}\n{"id":2,"type":"Router","ieeeAddr":"0x129","nwkAddr":129,"manufId":1212,"manufName":"KoenAndCo","powerSource":"Mains (single phase)","modelId":"myModelID","epList":[1],"endpoints":{"1":{"profId":99,"epId":1,"devId":5,"inClusterList":[0,1],"outClusterList":[2],"clusters":{},"binds":[],"configuredReportings":[],"meta":{}}},"appVersion":2,"stackVersion":101,"hwVersion":3,"dateCode":"201901","swBuildId":"1.01","zclVersion":1,"interviewCompleted":true,"meta":{},"lastSeen":${mockedDate.getTime()}}\n{"id":3,"type":"Group","groupID":2,"members":[{"deviceIeeeAddr":"0x129","endpointID":1}],"meta":{}}`,
        );
    });

    it('Remove endpoint from group', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        const group = await controller.createGroup(2);
        await group.addMember(endpoint);
        mocksendZclFrameToEndpoint.mockClear();
        await endpoint.removeFromGroup(group);
        const call = mocksendZclFrameToEndpoint.mock.calls[0];
        expect(call[0]).toBe('0x129');
        expect(call[1]).toBe(129);
        expect(call[2]).toBe(1);
        expect(deepClone(call[3])).toStrictEqual({
            header: {
                frameControl: {reservedBits: 0, frameType: 1, direction: 0, disableDefaultResponse: true, manufacturerSpecific: false},
                transactionSequenceNumber: 11,
                commandIdentifier: 3,
            },
            payload: {groupid: 2},
            cluster: {
                ID: 4,
                attributes: {nameSupport: {ID: 0, type: 24, name: 'nameSupport'}},
                name: 'genGroups',
                commands: {
                    add: {
                        ID: 0,
                        response: 0,
                        parameters: [
                            {name: 'groupid', type: 33},
                            {name: 'groupname', type: 66},
                        ],
                        name: 'add',
                    },
                    view: {ID: 1, response: 1, parameters: [{name: 'groupid', type: 33}], name: 'view'},
                    getMembership: {
                        ID: 2,
                        response: 2,
                        parameters: [
                            {name: 'groupcount', type: 32},
                            {name: 'grouplist', type: 1002},
                        ],
                        name: 'getMembership',
                    },
                    miboxerSetZones: {ID: 240, name: 'miboxerSetZones', parameters: [{name: 'zones', type: 1012}]},
                    remove: {ID: 3, response: 3, parameters: [{name: 'groupid', type: 33}], name: 'remove'},
                    removeAll: {ID: 4, parameters: [], name: 'removeAll'},
                    addIfIdentifying: {
                        ID: 5,
                        parameters: [
                            {name: 'groupid', type: 33},
                            {name: 'groupname', type: 66},
                        ],
                        name: 'addIfIdentifying',
                    },
                },
                commandsResponse: {
                    addRsp: {
                        ID: 0,
                        parameters: [
                            {name: 'status', type: 32},
                            {name: 'groupid', type: 33},
                        ],
                        name: 'addRsp',
                    },
                    viewRsp: {
                        ID: 1,
                        parameters: [
                            {name: 'status', type: 32},
                            {name: 'groupid', type: 33},
                            {name: 'groupname', type: 66},
                        ],
                        name: 'viewRsp',
                    },
                    getMembershipRsp: {
                        ID: 2,
                        parameters: [
                            {name: 'capacity', type: 32},
                            {name: 'groupcount', type: 32},
                            {name: 'grouplist', type: 1002},
                        ],
                        name: 'getMembershipRsp',
                    },
                    removeRsp: {
                        ID: 3,
                        parameters: [
                            {name: 'status', type: 32},
                            {name: 'groupid', type: 33},
                        ],
                        name: 'removeRsp',
                    },
                },
            },
            command: {ID: 3, response: 3, parameters: [{name: 'groupid', type: 33}], name: 'remove'},
        });
        expect(group.members).toStrictEqual([]);
    });

    it('Remove endpoint from group by number', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        mocksendZclFrameToEndpoint.mockClear();
        await endpoint.removeFromGroup(4);
        const call = mocksendZclFrameToEndpoint.mock.calls[0];
        expect(call[0]).toBe('0x129');
        expect(call[1]).toBe(129);
        expect(call[2]).toBe(1);
        expect(deepClone(call[3])).toStrictEqual({
            header: {
                frameControl: {reservedBits: 0, frameType: 1, direction: 0, disableDefaultResponse: true, manufacturerSpecific: false},
                transactionSequenceNumber: 11,
                commandIdentifier: 3,
            },
            payload: {groupid: 4},
            cluster: {
                ID: 4,
                attributes: {nameSupport: {ID: 0, type: 24, name: 'nameSupport'}},
                name: 'genGroups',
                commands: {
                    add: {
                        ID: 0,
                        response: 0,
                        parameters: [
                            {name: 'groupid', type: 33},
                            {name: 'groupname', type: 66},
                        ],
                        name: 'add',
                    },
                    view: {ID: 1, response: 1, parameters: [{name: 'groupid', type: 33}], name: 'view'},
                    getMembership: {
                        ID: 2,
                        response: 2,
                        parameters: [
                            {name: 'groupcount', type: 32},
                            {name: 'grouplist', type: 1002},
                        ],
                        name: 'getMembership',
                    },
                    miboxerSetZones: {ID: 240, name: 'miboxerSetZones', parameters: [{name: 'zones', type: 1012}]},
                    remove: {ID: 3, response: 3, parameters: [{name: 'groupid', type: 33}], name: 'remove'},
                    removeAll: {ID: 4, parameters: [], name: 'removeAll'},
                    addIfIdentifying: {
                        ID: 5,
                        parameters: [
                            {name: 'groupid', type: 33},
                            {name: 'groupname', type: 66},
                        ],
                        name: 'addIfIdentifying',
                    },
                },
                commandsResponse: {
                    addRsp: {
                        ID: 0,
                        parameters: [
                            {name: 'status', type: 32},
                            {name: 'groupid', type: 33},
                        ],
                        name: 'addRsp',
                    },
                    viewRsp: {
                        ID: 1,
                        parameters: [
                            {name: 'status', type: 32},
                            {name: 'groupid', type: 33},
                            {name: 'groupname', type: 66},
                        ],
                        name: 'viewRsp',
                    },
                    getMembershipRsp: {
                        ID: 2,
                        parameters: [
                            {name: 'capacity', type: 32},
                            {name: 'groupcount', type: 32},
                            {name: 'grouplist', type: 1002},
                        ],
                        name: 'getMembershipRsp',
                    },
                    removeRsp: {
                        ID: 3,
                        parameters: [
                            {name: 'status', type: 32},
                            {name: 'groupid', type: 33},
                        ],
                        name: 'removeRsp',
                    },
                },
            },
            command: {ID: 3, response: 3, parameters: [{name: 'groupid', type: 33}], name: 'remove'},
        });
    });

    it('Command response', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        const response = await endpoint.command('genGroups', 'add', {groupid: 1, groupname: ''});
        expect(response).toStrictEqual({groupid: 1, status: 0});
    });

    it('Group command', async () => {
        await controller.start();
        const group = await controller.createGroup(2);
        await group.command('genOnOff', 'offWithEffect', {effectid: 9, effectvariant: 10});
        const call = mocksendZclFrameToGroup.mock.calls[0];
        expect(call[0]).toBe(2);
        expect({...deepClone(call[1]), cluster: null}).toStrictEqual({
            header: {
                frameControl: {reservedBits: 0, frameType: 1, direction: 0, disableDefaultResponse: true, manufacturerSpecific: false},
                transactionSequenceNumber: 2,
                commandIdentifier: 64,
            },
            payload: {effectid: 9, effectvariant: 10},
            cluster: null,
            command: {
                ID: 64,
                parameters: [
                    {name: 'effectid', type: 32},
                    {name: 'effectvariant', type: 32},
                ],
                name: 'offWithEffect',
            },
        });
    });

    it('Endpoint command with options', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        mocksendZclFrameToEndpoint.mockClear();
        await endpoint.command('genOnOff', 'off', {}, {manufacturerCode: 100, disableDefaultResponse: true});
        expect(mocksendZclFrameToEndpoint.mock.calls[0][0]).toBe('0x129');
        expect(mocksendZclFrameToEndpoint.mock.calls[0][1]).toBe(129);
        expect(mocksendZclFrameToEndpoint.mock.calls[0][2]).toBe(1);
        expect({...deepClone(mocksendZclFrameToEndpoint.mock.calls[0][3]), cluster: null}).toStrictEqual({
            header: {
                frameControl: {reservedBits: 0, frameType: 1, direction: 0, disableDefaultResponse: true, manufacturerSpecific: true},
                transactionSequenceNumber: 11,
                manufacturerCode: 100,
                commandIdentifier: 0,
            },
            payload: {},
            cluster: null,
            command: {ID: 0, parameters: [], name: 'off'},
        });
        expect(mocksendZclFrameToEndpoint.mock.calls[0][4]).toBe(10000);
        expect(mocksendZclFrameToEndpoint.mock.calls[0][5]).toBe(false);
        expect(mocksendZclFrameToEndpoint.mock.calls[0][6]).toBe(false);
        expect(mocksendZclFrameToEndpoint.mock.calls[0][7]).toBeUndefined();
    });

    it('Endpoint command with duplicate cluster ID', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        mocksendZclFrameToEndpoint.mockClear();
        await endpoint.command('manuSpecificAssaDoorLock', 'getBatteryLevel', {});
        expect(mocksendZclFrameToEndpoint.mock.calls[0][0]).toBe('0x129');
        expect(mocksendZclFrameToEndpoint.mock.calls[0][1]).toBe(129);
        expect(mocksendZclFrameToEndpoint.mock.calls[0][2]).toBe(1);
        expect(mocksendZclFrameToEndpoint.mock.calls[0][3].toBuffer()).toStrictEqual(Buffer.from([1, 11, 18]));
    });

    it('Endpoint command with duplicate identifier', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        mocksendZclFrameToEndpoint.mockClear();
        await endpoint.command('lightingColorCtrl', 'tuyaMoveToHueAndSaturationBrightness', {hue: 1, saturation: 1, transtime: 0, brightness: 22});
        expect(mocksendZclFrameToEndpoint.mock.calls[0][0]).toBe('0x129');
        expect(mocksendZclFrameToEndpoint.mock.calls[0][1]).toBe(129);
        expect(mocksendZclFrameToEndpoint.mock.calls[0][2]).toBe(1);
        expect(mocksendZclFrameToEndpoint.mock.calls[0][3].toBuffer()).toStrictEqual(Buffer.from([1, 11, 6, 1, 1, 0, 0, 22]));
    });

    it('Endpoint commandResponse', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        mocksendZclFrameToEndpoint.mockClear();
        await endpoint.commandResponse('genOta', 'imageNotify', {payloadType: 0, queryJitter: 1}, undefined, undefined);
        expect(mocksendZclFrameToEndpoint.mock.calls[0][0]).toBe('0x129');
        expect(mocksendZclFrameToEndpoint.mock.calls[0][1]).toBe(129);
        expect(mocksendZclFrameToEndpoint.mock.calls[0][2]).toBe(1);
        const expected = {
            header: {
                frameControl: {reservedBits: 0, frameType: 1, direction: 1, disableDefaultResponse: true, manufacturerSpecific: false},
                transactionSequenceNumber: 11,
                commandIdentifier: 0,
            },
            payload: {payloadType: 0, queryJitter: 1},
            cluster: {
                ID: 25,
                attributes: {
                    upgradeServerId: {ID: 0, type: 240, name: 'upgradeServerId'},
                    fileOffset: {ID: 1, type: 35, name: 'fileOffset'},
                    currentFileVersion: {ID: 2, type: 35, name: 'currentFileVersion'},
                    currentZigbeeStackVersion: {ID: 3, type: 33, name: 'currentZigbeeStackVersion'},
                    downloadedFileVersion: {ID: 4, type: 35, name: 'downloadedFileVersion'},
                    downloadedZigbeeStackVersion: {ID: 5, type: 33, name: 'downloadedZigbeeStackVersion'},
                    imageUpgradeStatus: {ID: 6, type: 48, name: 'imageUpgradeStatus'},
                    manufacturerId: {ID: 7, type: 33, name: 'manufacturerId'},
                    imageTypeId: {ID: 8, type: 33, name: 'imageTypeId'},
                    minimumBlockReqDelay: {ID: 9, type: 33, name: 'minimumBlockReqDelay'},
                    imageStamp: {ID: 10, type: 35, name: 'imageStamp'},
                },
                name: 'genOta',
                commands: {
                    queryNextImageRequest: {
                        ID: 1,
                        response: 2,
                        parameters: [
                            {name: 'fieldControl', type: 32},
                            {name: 'manufacturerCode', type: 33},
                            {name: 'imageType', type: 33},
                            {name: 'fileVersion', type: 35},
                        ],
                        name: 'queryNextImageRequest',
                    },
                    imageBlockRequest: {
                        ID: 3,
                        response: 5,
                        parameters: [
                            {name: 'fieldControl', type: 32},
                            {name: 'manufacturerCode', type: 33},
                            {name: 'imageType', type: 33},
                            {name: 'fileVersion', type: 35},
                            {name: 'fileOffset', type: 35},
                            {name: 'maximumDataSize', type: 32},
                        ],
                        name: 'imageBlockRequest',
                    },
                    imagePageRequest: {
                        ID: 4,
                        response: 5,
                        parameters: [
                            {name: 'fieldControl', type: 32},
                            {name: 'manufacturerCode', type: 33},
                            {name: 'imageType', type: 33},
                            {name: 'fileVersion', type: 35},
                            {name: 'fileOffset', type: 35},
                            {name: 'maximumDataSize', type: 32},
                            {name: 'pageSize', type: 33},
                            {name: 'responseSpacing', type: 33},
                        ],
                        name: 'imagePageRequest',
                    },
                    upgradeEndRequest: {
                        ID: 6,
                        response: 7,
                        parameters: [
                            {name: 'status', type: 32},
                            {name: 'manufacturerCode', type: 33},
                            {name: 'imageType', type: 33},
                            {name: 'fileVersion', type: 35},
                        ],
                        name: 'upgradeEndRequest',
                    },
                },
                commandsResponse: {
                    imageNotify: {
                        ID: 0,
                        parameters: [
                            {name: 'payloadType', type: 32},
                            {name: 'queryJitter', type: 32},
                        ],
                        name: 'imageNotify',
                    },
                    queryNextImageResponse: {
                        ID: 2,
                        parameters: [
                            {name: 'status', type: 32},
                            {name: 'manufacturerCode', type: 33, conditions: [{type: 'statusEquals', value: 0}]},
                            {name: 'imageType', type: 33, conditions: [{type: 'statusEquals', value: 0}]},
                            {name: 'fileVersion', type: 35, conditions: [{type: 'statusEquals', value: 0}]},
                            {name: 'imageSize', type: 35, conditions: [{type: 'statusEquals', value: 0}]},
                        ],
                        name: 'queryNextImageResponse',
                    },
                    imageBlockResponse: {
                        ID: 5,
                        parameters: [
                            {name: 'status', type: 32},
                            {name: 'manufacturerCode', type: 33},
                            {name: 'imageType', type: 33},
                            {name: 'fileVersion', type: 35},
                            {name: 'fileOffset', type: 35},
                            {name: 'dataSize', type: 32},
                            {name: 'data', type: 1008},
                        ],
                        name: 'imageBlockResponse',
                    },
                    upgradeEndResponse: {
                        ID: 7,
                        parameters: [
                            {name: 'manufacturerCode', type: 33},
                            {name: 'imageType', type: 33},
                            {name: 'fileVersion', type: 35},
                            {name: 'currentTime', type: 35},
                            {name: 'upgradeTime', type: 35},
                        ],
                        name: 'upgradeEndResponse',
                    },
                },
            },
            command: {
                ID: 0,
                parameters: [
                    {name: 'payloadType', type: 32},
                    {name: 'queryJitter', type: 32},
                ],
                name: 'imageNotify',
            },
        };
        expect(deepClone(mocksendZclFrameToEndpoint.mock.calls[0][3])).toStrictEqual(expected);
        expect(mocksendZclFrameToEndpoint.mock.calls[0][4]).toBe(10000);
    });

    it('Endpoint waitForCommand', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        mocksendZclFrameToEndpoint.mockClear();
        const buffer = Buffer.from([24, 169, 10, 0, 0, 24, 1]);
        const frame = Zcl.Frame.fromBuffer(Zcl.Utils.getCluster('msOccupancySensing', undefined, {}).ID, Zcl.Header.fromBuffer(buffer), buffer, {});
        const promise = new Promise((resolve, reject) => resolve({clusterID: frame.cluster.ID, data: frame.toBuffer(), header: frame.header}));
        mockAdapterWaitFor.mockReturnValueOnce({promise, cancel: () => {}});
        const result = endpoint.waitForCommand('genOta', 'upgradeEndRequest', 10, 20);
        expect(mockAdapterWaitFor).toHaveBeenCalledTimes(1);
        expect(mockAdapterWaitFor).toHaveBeenCalledWith(129, 1, 1, 0, 10, 25, 6, 20);
        expect(result.cancel).toStrictEqual(expect.any(Function));
        expect(deepClone(await result.promise)).toStrictEqual({
            header: {
                commandIdentifier: 10,
                frameControl: {reservedBits: 0, direction: 1, disableDefaultResponse: true, frameType: 0, manufacturerSpecific: false},
                transactionSequenceNumber: 169,
            },
            payload: [{attrData: 1, attrId: 0, dataType: 24}],
        });
    });

    it('Endpoint waitForCommand error', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        mocksendZclFrameToEndpoint.mockClear();
        const promise = new Promise((resolve, reject) => reject(new Error('whoops!')));
        mockAdapterWaitFor.mockReturnValueOnce({promise, cancel: () => {}});
        const result = endpoint.waitForCommand('genOta', 'upgradeEndRequest', 10, 20);
        let error;
        try {
            await result.promise;
        } catch (e) {
            error = e;
        }
        expect(error).toStrictEqual(new Error('whoops!'));
    });

    it('Device without meta should set meta to {}', async () => {
        Device['lookup'] = {};
        const line = JSON.stringify({
            id: 3,
            type: 'EndDevice',
            ieeeAddr: '0x90fd9ffffe4b64ae',
            nwkAddr: 19468,
            manufId: 4476,
            manufName: 'IKEA of Sweden',
            powerSource: 'Battery',
            modelId: 'TRADFRI remote control',
            epList: [1],
            endpoints: {
                '1': {
                    profId: 49246,
                    epId: 1,
                    devId: 2096,
                    inClusterList: [0, 1, 3, 9, 2821, 4096],
                    outClusterList: [3, 4, 5, 6, 8, 25, 4096],
                    clusters: {},
                },
            },
            appVersion: 17,
            stackVersion: 87,
            hwVersion: 1,
            dateCode: '20170302',
            swBuildId: '1.2.214',
            zclVersion: 1,
            interviewCompleted: true,
            _id: 'fJ5pmjqKRYbNvslK',
        });
        fs.writeFileSync(options.databasePath, line + '\n');
        await controller.start();
        const expected = {
            ID: 3,
            _events: {},
            _eventsCount: 0,
            _pendingRequestTimeout: 0,
            _skipDefaultResponse: false,
            _applicationVersion: 17,
            _dateCode: '20170302',
            _customClusters: {},
            _endpoints: [
                {
                    _events: {},
                    _eventsCount: 0,
                    meta: {},
                    clusters: {},
                    ID: 1,
                    deviceID: 2096,
                    _binds: [],
                    _configuredReportings: [],
                    deviceIeeeAddress: '0x90fd9ffffe4b64ae',
                    deviceNetworkAddress: 19468,
                    inputClusters: [0, 1, 3, 9, 2821, 4096],
                    outputClusters: [3, 4, 5, 6, 8, 25, 4096],
                    pendingRequests: {ID: 1, deviceIeeeAddress: '0x90fd9ffffe4b64ae', sendInProgress: false},
                    profileID: 49246,
                },
            ],
            _hardwareVersion: 1,
            _ieeeAddr: '0x90fd9ffffe4b64ae',
            _interviewCompleted: true,
            _interviewing: false,
            _manufacturerID: 4476,
            _manufacturerName: 'IKEA of Sweden',
            meta: {},
            _modelID: 'TRADFRI remote control',
            _networkAddress: 19468,
            _powerSource: 'Battery',
            _softwareBuildID: '1.2.214',
            _stackVersion: 87,
            _type: 'EndDevice',
            _zclVersion: 1,
        };
        expect(deepClone(controller.getDeviceByIeeeAddr('0x90fd9ffffe4b64ae'))).toStrictEqual(expected);
    });

    it('Read from group', async () => {
        await controller.start();
        const group = await controller.createGroup(2);
        await group.read('genBasic', ['modelId', 0x01], {});
        expect(mocksendZclFrameToGroup).toHaveBeenCalledTimes(1);
        expect(mocksendZclFrameToGroup.mock.calls[0][0]).toBe(2);
        expect(deepClone(mocksendZclFrameToGroup.mock.calls[0][1])).toStrictEqual(
            deepClone(
                Zcl.Frame.create(Zcl.FrameType.GLOBAL, Zcl.Direction.CLIENT_TO_SERVER, true, undefined, 2, 'read', 0, [{attrId: 5}, {attrId: 1}], {}),
            ),
        );
        expect(mocksendZclFrameToGroup.mock.calls[0][2]).toBeUndefined();
    });

    it('Read from group fails', async () => {
        await controller.start();
        const group = await controller.createGroup(2);
        mocksendZclFrameToGroup.mockRejectedValueOnce(new Error('timeout'));
        let error;
        try {
            await group.read('genBasic', ['modelId', 0x01], {});
        } catch (e) {
            error = e;
        }
        expect(error).toStrictEqual(new Error(`Read 2 genBasic(["modelId",1], {"direction":0,"reservedBits":0}) failed (timeout)`));
    });

    it('Write to group', async () => {
        await controller.start();
        const group = await controller.createGroup(2);
        await group.write('genBasic', {0x0031: {value: 0x000b, type: 0x19}, deviceEnabled: true}, {});
        expect(mocksendZclFrameToGroup).toHaveBeenCalledTimes(1);
        expect(mocksendZclFrameToGroup.mock.calls[0][0]).toBe(2);
        expect(deepClone(mocksendZclFrameToGroup.mock.calls[0][1])).toStrictEqual(
            deepClone(
                Zcl.Frame.create(
                    Zcl.FrameType.GLOBAL,
                    Zcl.Direction.CLIENT_TO_SERVER,
                    true,
                    undefined,
                    2,
                    'write',
                    0,
                    [
                        {attrData: 11, attrId: 49, dataType: 25},
                        {attrData: true, attrId: 18, dataType: 16},
                    ],
                    {},
                ),
            ),
        );
        expect(mocksendZclFrameToGroup.mock.calls[0][2]).toBeUndefined();
    });

    it('Write to group with unknown attribute should fail', async () => {
        await controller.start();
        const group = await controller.createGroup(2);
        let error;
        try {
            await group.write('genBasic', {UNKNOWN: {value: 0x000b, type: 0x19}, deviceEnabled: true}, {});
        } catch (e) {
            error = e;
        }
        expect(error).toStrictEqual(new Error(`Unknown attribute 'UNKNOWN', specify either an existing attribute or a number`));
    });

    it('Write to group fails', async () => {
        await controller.start();
        const group = await controller.createGroup(2);
        mocksendZclFrameToGroup.mockRejectedValueOnce(new Error('timeout'));
        let error;
        try {
            await group.write('genBasic', {0x0031: {value: 0x000b, type: 0x19}}, {});
        } catch (e) {
            error = e;
        }
        expect(error).toStrictEqual(new Error(`Write 2 genBasic({"49":{"value":11,"type":25}}, {"direction":0,"reservedBits":0}) failed (timeout)`));
    });

    it('Write to endpoint custom attributes', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        mocksendZclFrameToEndpoint.mockClear();
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        const options = {manufacturerCode: 0x100b, disableDefaultResponse: true, timeout: 12, defaultResponseTimeout: 16};
        await endpoint.write('genBasic', {0x0031: {value: 0x000b, type: 0x19}}, options);
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(1);
        const call = mocksendZclFrameToEndpoint.mock.calls[0];
        expect(call[0]).toBe('0x129');
        expect(call[1]).toBe(129);
        expect(call[2]).toBe(1);
        expect(deepClone(call[3])).toStrictEqual({
            header: {
                frameControl: {reservedBits: 0, frameType: 0, direction: 0, disableDefaultResponse: true, manufacturerSpecific: true},
                transactionSequenceNumber: 11,
                manufacturerCode: 4107,
                commandIdentifier: 2,
            },
            payload: [{attrId: 49, attrData: 11, dataType: 25}],
            cluster: {
                ID: 0,
                attributes: {
                    zclVersion: {ID: 0, type: 32, name: 'zclVersion'},
                    appVersion: {ID: 1, type: 32, name: 'appVersion'},
                    stackVersion: {ID: 2, type: 32, name: 'stackVersion'},
                    hwVersion: {ID: 3, type: 32, name: 'hwVersion'},
                    manufacturerName: {ID: 4, type: 66, name: 'manufacturerName'},
                    modelId: {ID: 5, type: 66, name: 'modelId'},
                    dateCode: {ID: 6, type: 66, name: 'dateCode'},
                    powerSource: {ID: 7, type: 48, name: 'powerSource'},
                    appProfileVersion: {ID: 8, type: 48, name: 'appProfileVersion'},
                    genericDeviceType: {ID: 9, type: 48, name: 'genericDeviceType'},
                    productCode: {ID: 10, type: 65, name: 'productCode'},
                    productUrl: {ID: 11, type: 66, name: 'productUrl'},
                    manufacturerVersionDetails: {ID: 12, type: 66, name: 'manufacturerVersionDetails'},
                    serialNumber: {ID: 13, type: 66, name: 'serialNumber'},
                    productLabel: {ID: 14, type: 66, name: 'productLabel'},
                    locationDesc: {ID: 16, type: 66, name: 'locationDesc'},
                    physicalEnv: {ID: 17, type: 48, name: 'physicalEnv'},
                    deviceEnabled: {ID: 18, type: 16, name: 'deviceEnabled'},
                    alarmMask: {ID: 19, type: 24, name: 'alarmMask'},
                    disableLocalConfig: {ID: 20, type: 24, name: 'disableLocalConfig'},
                    swBuildId: {ID: 16384, type: 66, name: 'swBuildId'},
                    schneiderMeterRadioPower: {ID: 57856, manufacturerCode: 4190, name: 'schneiderMeterRadioPower', type: 40},
                },
                name: 'genBasic',
                commands: {
                    resetFactDefault: {ID: 0, parameters: [], name: 'resetFactDefault'},
                    tuyaSetup: {ID: 240, parameters: [], name: 'tuyaSetup'},
                },
                commandsResponse: {},
            },
            command: {
                ID: 2,
                name: 'write',
                parameters: [
                    {name: 'attrId', type: 33},
                    {name: 'dataType', type: 32},
                    {name: 'attrData', type: 1000},
                ],
                response: 4,
            },
        });
        expect(call[4]).toBe(12);
    });

    it('Write to endpoint custom attributes without specifying manufacturerCode', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        mocksendZclFrameToEndpoint.mockClear();
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        // @ts-expect-error private
        device._manufacturerID = 0x10f2;
        const endpoint = device.getEndpoint(1)!;
        await endpoint.write('hvacThermostat', {viessmannWindowOpenInternal: 1});
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(1);
        const call = mocksendZclFrameToEndpoint.mock.calls[0];
        expect(call[0]).toBe('0x129');
        expect(call[1]).toBe(129);
        expect(call[2]).toBe(1);
        expect({...deepClone(call[3]), cluster: {}}).toStrictEqual({
            header: {
                frameControl: {reservedBits: 0, frameType: 0, direction: 0, disableDefaultResponse: true, manufacturerSpecific: true},
                transactionSequenceNumber: 11,
                manufacturerCode: 4641,
                commandIdentifier: 2,
            },
            payload: [{attrId: 16384, attrData: 1, dataType: 48}],
            cluster: {},
            command: {
                ID: 2,
                name: 'write',
                parameters: [
                    {name: 'attrId', type: 33},
                    {name: 'dataType', type: 32},
                    {name: 'attrData', type: 1000},
                ],
                response: 4,
            },
        });
        expect(call[4]).toBe(10000);
    });

    it('WriteUndiv to endpoint custom attributes without response', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        mocksendZclFrameToEndpoint.mockClear();
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        const options = {
            manufacturerCode: 0x100b,
            disableDefaultResponse: true,
            timeout: 12,
            defaultResponseTimeout: 16,
            writeUndiv: true,
            disableResponse: true,
        };
        await endpoint.write('genBasic', {0x0031: {value: 0x000b, type: 0x19}}, options);
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(1);
        const call = mocksendZclFrameToEndpoint.mock.calls[0];
        expect(call[0]).toBe('0x129');
        expect(call[1]).toBe(129);
        expect(call[2]).toBe(1);
        expect(deepClone(call[3])).toStrictEqual({
            header: {
                frameControl: {reservedBits: 0, frameType: 0, direction: 0, disableDefaultResponse: true, manufacturerSpecific: true},
                transactionSequenceNumber: 11,
                manufacturerCode: 4107,
                commandIdentifier: 3,
            },
            payload: [{attrId: 49, attrData: 11, dataType: 25}],
            cluster: {
                ID: 0,
                attributes: {
                    zclVersion: {ID: 0, type: 32, name: 'zclVersion'},
                    appVersion: {ID: 1, type: 32, name: 'appVersion'},
                    stackVersion: {ID: 2, type: 32, name: 'stackVersion'},
                    hwVersion: {ID: 3, type: 32, name: 'hwVersion'},
                    manufacturerName: {ID: 4, type: 66, name: 'manufacturerName'},
                    modelId: {ID: 5, type: 66, name: 'modelId'},
                    dateCode: {ID: 6, type: 66, name: 'dateCode'},
                    powerSource: {ID: 7, type: 48, name: 'powerSource'},
                    appProfileVersion: {ID: 8, type: 48, name: 'appProfileVersion'},
                    genericDeviceType: {ID: 9, type: 48, name: 'genericDeviceType'},
                    productCode: {ID: 10, type: 65, name: 'productCode'},
                    productUrl: {ID: 11, type: 66, name: 'productUrl'},
                    manufacturerVersionDetails: {ID: 12, type: 66, name: 'manufacturerVersionDetails'},
                    serialNumber: {ID: 13, type: 66, name: 'serialNumber'},
                    productLabel: {ID: 14, type: 66, name: 'productLabel'},
                    locationDesc: {ID: 16, type: 66, name: 'locationDesc'},
                    physicalEnv: {ID: 17, type: 48, name: 'physicalEnv'},
                    deviceEnabled: {ID: 18, type: 16, name: 'deviceEnabled'},
                    alarmMask: {ID: 19, type: 24, name: 'alarmMask'},
                    disableLocalConfig: {ID: 20, type: 24, name: 'disableLocalConfig'},
                    swBuildId: {ID: 16384, type: 66, name: 'swBuildId'},
                    schneiderMeterRadioPower: {ID: 57856, manufacturerCode: 4190, name: 'schneiderMeterRadioPower', type: 40},
                },
                name: 'genBasic',
                commands: {
                    resetFactDefault: {ID: 0, parameters: [], name: 'resetFactDefault'},
                    tuyaSetup: {ID: 240, parameters: [], name: 'tuyaSetup'},
                },
                commandsResponse: {},
            },
            command: {
                ID: 3,
                name: 'writeUndiv',
                parameters: [
                    {name: 'attrId', type: 33},
                    {name: 'dataType', type: 32},
                    {name: 'attrData', type: 1000},
                ],
            },
        });
        expect(call[4]).toBe(12);
    });

    it('Write to endpoint with unknown string attribute', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        mocksendZclFrameToEndpoint.mockClear();
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        let error;
        try {
            await endpoint.write('genBasic', {UNKNOWN: {value: 0x000b, type: 0x19}});
        } catch (e) {
            error = e;
        }
        expect(error).toStrictEqual(new Error(`Unknown attribute 'UNKNOWN', specify either an existing attribute or a number`));
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(0);
    });

    it('Write to endpoint with mixed manufacturer attributes', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        mocksendZclFrameToEndpoint.mockClear();
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        // @ts-expect-error private
        device._manufacturerID = 0x10f2;
        const endpoint = device.getEndpoint(1)!;
        let error;
        try {
            await endpoint.write('hvacThermostat', {occupiedHeatingSetpoint: 2000, viessmannWindowOpenInternal: 1});
        } catch (e) {
            error = e;
        }
        expect(error).toStrictEqual(new Error("Cannot have attributes with different manufacturerCode in single 'write' call"));
    });

    it('Write response to endpoint with non ZCL attribute', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        mocksendZclFrameToEndpoint.mockClear();
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        await endpoint.writeResponse('genBasic', 99, {0x55: {status: 0x01}});
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(1);
        const call = mocksendZclFrameToEndpoint.mock.calls[0];
        expect(call[0]).toBe('0x129');
        expect(call[1]).toBe(129);
        expect(call[2]).toBe(1);
        expect(deepClone(call[3])).toStrictEqual({
            header: {
                frameControl: {reservedBits: 0, frameType: 0, direction: 1, disableDefaultResponse: true, manufacturerSpecific: false},
                transactionSequenceNumber: 99,
                commandIdentifier: 4,
            },
            payload: [{attrId: 85, status: 1}],
            cluster: {
                ID: 0,
                attributes: {
                    zclVersion: {ID: 0, type: 32, name: 'zclVersion'},
                    appVersion: {ID: 1, type: 32, name: 'appVersion'},
                    stackVersion: {ID: 2, type: 32, name: 'stackVersion'},
                    hwVersion: {ID: 3, type: 32, name: 'hwVersion'},
                    manufacturerName: {ID: 4, type: 66, name: 'manufacturerName'},
                    modelId: {ID: 5, type: 66, name: 'modelId'},
                    dateCode: {ID: 6, type: 66, name: 'dateCode'},
                    powerSource: {ID: 7, type: 48, name: 'powerSource'},
                    appProfileVersion: {ID: 8, type: 48, name: 'appProfileVersion'},
                    genericDeviceType: {ID: 9, type: 48, name: 'genericDeviceType'},
                    productCode: {ID: 10, type: 65, name: 'productCode'},
                    productUrl: {ID: 11, type: 66, name: 'productUrl'},
                    manufacturerVersionDetails: {ID: 12, type: 66, name: 'manufacturerVersionDetails'},
                    serialNumber: {ID: 13, type: 66, name: 'serialNumber'},
                    productLabel: {ID: 14, type: 66, name: 'productLabel'},
                    locationDesc: {ID: 16, type: 66, name: 'locationDesc'},
                    physicalEnv: {ID: 17, type: 48, name: 'physicalEnv'},
                    deviceEnabled: {ID: 18, type: 16, name: 'deviceEnabled'},
                    alarmMask: {ID: 19, type: 24, name: 'alarmMask'},
                    disableLocalConfig: {ID: 20, type: 24, name: 'disableLocalConfig'},
                    swBuildId: {ID: 16384, type: 66, name: 'swBuildId'},
                    schneiderMeterRadioPower: {ID: 57856, manufacturerCode: 4190, name: 'schneiderMeterRadioPower', type: 40},
                },
                name: 'genBasic',
                commands: {
                    resetFactDefault: {ID: 0, parameters: [], name: 'resetFactDefault'},
                    tuyaSetup: {ID: 240, parameters: [], name: 'tuyaSetup'},
                },
                commandsResponse: {},
            },
            command: {
                ID: 4,
                name: 'writeRsp',
                parameters: [
                    {name: 'status', type: 32},
                    {conditions: [{type: 'statusNotEquals', value: 0}], name: 'attrId', type: 33},
                ],
            },
        });
        expect(call[4]).toBe(10000);
    });

    it('Write response to endpoint with unknown string attribute', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        mocksendZclFrameToEndpoint.mockClear();
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        let error;
        try {
            await endpoint.writeResponse('genBasic', 99, {UNKNOWN: {status: 0x01}});
        } catch (e) {
            error = e;
        }
        expect(error).toStrictEqual(new Error(`Unknown attribute 'UNKNOWN', specify either an existing attribute or a number`));
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(0);
    });

    it('Write response to endpoint throw when transaction sequence number provided through options', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        mocksendZclFrameToEndpoint.mockClear();
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        let error;
        try {
            await endpoint.writeResponse('genBasic', 99, {UNKNOWN: {status: 0x01}}, {transactionSequenceNumber: 5});
        } catch (e) {
            error = e;
        }
        expect(error.message).toStrictEqual(`Use parameter`);
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(0);
    });

    it('Write response to endpoint with no status attribute specified', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        mocksendZclFrameToEndpoint.mockClear();
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        let error;
        try {
            await endpoint.writeResponse('genBasic', 99, {0x0001: {value: 0x55}});
        } catch (e) {
            error = e;
        }
        expect(error).toStrictEqual(new Error(`Missing attribute 'status'`));
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(0);
    });

    it('Write response to endpoint with ZCL attribute', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        mocksendZclFrameToEndpoint.mockClear();
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        await endpoint.writeResponse('genBasic', 99, {zclVersion: {status: 0x01}});
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(1);
        const call = mocksendZclFrameToEndpoint.mock.calls[0];
        expect(call[0]).toBe('0x129');
        expect(call[1]).toBe(129);
        expect(call[2]).toBe(1);
        expect(deepClone(call[3])).toStrictEqual({
            header: {
                frameControl: {reservedBits: 0, frameType: 0, direction: 1, disableDefaultResponse: true, manufacturerSpecific: false},
                transactionSequenceNumber: 99,
                commandIdentifier: 4,
            },
            payload: [{attrId: 0, status: 1}],
            cluster: {
                ID: 0,
                attributes: {
                    zclVersion: {ID: 0, type: 32, name: 'zclVersion'},
                    appVersion: {ID: 1, type: 32, name: 'appVersion'},
                    stackVersion: {ID: 2, type: 32, name: 'stackVersion'},
                    hwVersion: {ID: 3, type: 32, name: 'hwVersion'},
                    manufacturerName: {ID: 4, type: 66, name: 'manufacturerName'},
                    modelId: {ID: 5, type: 66, name: 'modelId'},
                    dateCode: {ID: 6, type: 66, name: 'dateCode'},
                    powerSource: {ID: 7, type: 48, name: 'powerSource'},
                    appProfileVersion: {ID: 8, type: 48, name: 'appProfileVersion'},
                    genericDeviceType: {ID: 9, type: 48, name: 'genericDeviceType'},
                    productCode: {ID: 10, type: 65, name: 'productCode'},
                    productUrl: {ID: 11, type: 66, name: 'productUrl'},
                    manufacturerVersionDetails: {ID: 12, type: 66, name: 'manufacturerVersionDetails'},
                    serialNumber: {ID: 13, type: 66, name: 'serialNumber'},
                    productLabel: {ID: 14, type: 66, name: 'productLabel'},
                    locationDesc: {ID: 16, type: 66, name: 'locationDesc'},
                    physicalEnv: {ID: 17, type: 48, name: 'physicalEnv'},
                    deviceEnabled: {ID: 18, type: 16, name: 'deviceEnabled'},
                    alarmMask: {ID: 19, type: 24, name: 'alarmMask'},
                    disableLocalConfig: {ID: 20, type: 24, name: 'disableLocalConfig'},
                    swBuildId: {ID: 16384, type: 66, name: 'swBuildId'},
                    schneiderMeterRadioPower: {ID: 57856, manufacturerCode: 4190, name: 'schneiderMeterRadioPower', type: 40},
                },
                name: 'genBasic',
                commands: {
                    resetFactDefault: {ID: 0, parameters: [], name: 'resetFactDefault'},
                    tuyaSetup: {ID: 240, parameters: [], name: 'tuyaSetup'},
                },
                commandsResponse: {},
            },
            command: {
                ID: 4,
                name: 'writeRsp',
                parameters: [
                    {name: 'status', type: 32},
                    {conditions: [{type: 'statusNotEquals', value: 0}], name: 'attrId', type: 33},
                ],
            },
        });
        expect(call[4]).toBe(10000);
    });

    it('WriteResponse error', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        mocksendZclFrameToEndpoint.mockRejectedValueOnce(new Error('timeout occurred'));
        let error;
        try {
            await endpoint.writeResponse('genBasic', 99, {zclVersion: {status: 0x01}});
        } catch (e) {
            error = e;
        }
        expect(error).toStrictEqual(
            new Error(
                `ZCL command 0x129/1 genBasic.writeRsp({"zclVersion":{"status":1}}, {"timeout":10000,"disableResponse":false,"disableRecovery":false,"disableDefaultResponse":true,"direction":1,"reservedBits":0,"transactionSequenceNumber":99,"writeUndiv":false}) failed (timeout occurred)`,
            ),
        );
    });

    it('Read from endpoint with string', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        mocksendZclFrameToEndpoint.mockClear();
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        await endpoint.read('genBasic', ['stackVersion']);
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(1);
        const call = mocksendZclFrameToEndpoint.mock.calls[0];
        expect(call[0]).toBe('0x129');
        expect(call[1]).toBe(129);
        expect(call[2]).toBe(1);
        expect(deepClone(call[3])).toStrictEqual({
            header: {
                frameControl: {reservedBits: 0, frameType: 0, direction: 0, disableDefaultResponse: true, manufacturerSpecific: false},
                transactionSequenceNumber: 11,
                commandIdentifier: 0,
            },
            payload: [{attrId: 2}],
            cluster: {
                ID: 0,
                attributes: {
                    zclVersion: {ID: 0, type: 32, name: 'zclVersion'},
                    appVersion: {ID: 1, type: 32, name: 'appVersion'},
                    stackVersion: {ID: 2, type: 32, name: 'stackVersion'},
                    hwVersion: {ID: 3, type: 32, name: 'hwVersion'},
                    manufacturerName: {ID: 4, type: 66, name: 'manufacturerName'},
                    modelId: {ID: 5, type: 66, name: 'modelId'},
                    dateCode: {ID: 6, type: 66, name: 'dateCode'},
                    powerSource: {ID: 7, type: 48, name: 'powerSource'},
                    appProfileVersion: {ID: 8, type: 48, name: 'appProfileVersion'},
                    genericDeviceType: {ID: 9, type: 48, name: 'genericDeviceType'},
                    productCode: {ID: 10, type: 65, name: 'productCode'},
                    productUrl: {ID: 11, type: 66, name: 'productUrl'},
                    manufacturerVersionDetails: {ID: 12, type: 66, name: 'manufacturerVersionDetails'},
                    serialNumber: {ID: 13, type: 66, name: 'serialNumber'},
                    productLabel: {ID: 14, type: 66, name: 'productLabel'},
                    locationDesc: {ID: 16, type: 66, name: 'locationDesc'},
                    physicalEnv: {ID: 17, type: 48, name: 'physicalEnv'},
                    deviceEnabled: {ID: 18, type: 16, name: 'deviceEnabled'},
                    alarmMask: {ID: 19, type: 24, name: 'alarmMask'},
                    disableLocalConfig: {ID: 20, type: 24, name: 'disableLocalConfig'},
                    swBuildId: {ID: 16384, type: 66, name: 'swBuildId'},
                    schneiderMeterRadioPower: {ID: 57856, manufacturerCode: 4190, name: 'schneiderMeterRadioPower', type: 40},
                },
                name: 'genBasic',
                commands: {
                    resetFactDefault: {ID: 0, parameters: [], name: 'resetFactDefault'},
                    tuyaSetup: {ID: 240, parameters: [], name: 'tuyaSetup'},
                },
                commandsResponse: {},
            },
            command: {ID: 0, name: 'read', parameters: [{name: 'attrId', type: 33}], response: 1},
        });
        expect(call[4]).toBe(10000);
    });

    it('Read from endpoint with custom attribute', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        mocksendZclFrameToEndpoint.mockClear();
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        // @ts-expect-error private
        device._manufacturerID = 0x10f2;
        const endpoint = device.getEndpoint(1)!;
        await endpoint.read('hvacThermostat', ['viessmannWindowOpenInternal']);
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(1);
        const call = mocksendZclFrameToEndpoint.mock.calls[0];
        expect(call[0]).toBe('0x129');
        expect(call[1]).toBe(129);
        expect(call[2]).toBe(1);
        expect({...deepClone(call[3]), cluster: {}}).toStrictEqual({
            header: {
                frameControl: {reservedBits: 0, frameType: 0, direction: 0, disableDefaultResponse: true, manufacturerSpecific: true},
                transactionSequenceNumber: 11,
                manufacturerCode: 4641,
                commandIdentifier: 0,
            },
            payload: [{attrId: 16384}],
            cluster: {},
            command: {ID: 0, name: 'read', parameters: [{name: 'attrId', type: 33}], response: 1},
        });
        expect(call[4]).toBe(10000);
    });

    it('Read mixed manufacturer attributes from endpoint', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        mocksendZclFrameToEndpoint.mockClear();
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        // @ts-expect-error private
        device._manufacturerID = 0x10f2;
        const endpoint = device.getEndpoint(1)!;
        let error;
        try {
            await endpoint.read('hvacThermostat', ['localTemp', 'viessmannWindowOpenInternal']);
        } catch (e) {
            error = e;
        }
        expect(error).toStrictEqual(new Error("Cannot have attributes with different manufacturerCode in single 'read' call"));
    });

    it('Read from endpoint unknown attribute with options', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        mocksendZclFrameToEndpoint.mockClear();
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        await endpoint.read('genBasic', [0xff22], {manufacturerCode: 0x115f, disableDefaultResponse: true});
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(1);
        const call = mocksendZclFrameToEndpoint.mock.calls[0];
        expect(call[0]).toBe('0x129');
        expect(call[1]).toBe(129);
        expect(call[2]).toBe(1);
        expect(deepClone(call[3])).toStrictEqual({
            header: {
                frameControl: {reservedBits: 0, frameType: 0, direction: 0, disableDefaultResponse: true, manufacturerSpecific: true},
                transactionSequenceNumber: 11,
                manufacturerCode: 4447,
                commandIdentifier: 0,
            },
            payload: [{attrId: 65314}],
            cluster: {
                ID: 0,
                attributes: {
                    zclVersion: {ID: 0, type: 32, name: 'zclVersion'},
                    appVersion: {ID: 1, type: 32, name: 'appVersion'},
                    stackVersion: {ID: 2, type: 32, name: 'stackVersion'},
                    hwVersion: {ID: 3, type: 32, name: 'hwVersion'},
                    manufacturerName: {ID: 4, type: 66, name: 'manufacturerName'},
                    modelId: {ID: 5, type: 66, name: 'modelId'},
                    dateCode: {ID: 6, type: 66, name: 'dateCode'},
                    powerSource: {ID: 7, type: 48, name: 'powerSource'},
                    appProfileVersion: {ID: 8, type: 48, name: 'appProfileVersion'},
                    genericDeviceType: {ID: 9, type: 48, name: 'genericDeviceType'},
                    productCode: {ID: 10, type: 65, name: 'productCode'},
                    productUrl: {ID: 11, type: 66, name: 'productUrl'},
                    manufacturerVersionDetails: {ID: 12, type: 66, name: 'manufacturerVersionDetails'},
                    serialNumber: {ID: 13, type: 66, name: 'serialNumber'},
                    productLabel: {ID: 14, type: 66, name: 'productLabel'},
                    locationDesc: {ID: 16, type: 66, name: 'locationDesc'},
                    physicalEnv: {ID: 17, type: 48, name: 'physicalEnv'},
                    deviceEnabled: {ID: 18, type: 16, name: 'deviceEnabled'},
                    alarmMask: {ID: 19, type: 24, name: 'alarmMask'},
                    disableLocalConfig: {ID: 20, type: 24, name: 'disableLocalConfig'},
                    swBuildId: {ID: 16384, type: 66, name: 'swBuildId'},
                    schneiderMeterRadioPower: {ID: 57856, manufacturerCode: 4190, name: 'schneiderMeterRadioPower', type: 40},
                },
                name: 'genBasic',
                commands: {
                    resetFactDefault: {ID: 0, parameters: [], name: 'resetFactDefault'},
                    tuyaSetup: {ID: 240, parameters: [], name: 'tuyaSetup'},
                },
                commandsResponse: {},
            },
            command: {ID: 0, name: 'read', parameters: [{name: 'attrId', type: 33}], response: 1},
        });
        expect(call[4]).toBe(10000);
    });

    it('Read response to endpoint with non ZCL attribute', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        mocksendZclFrameToEndpoint.mockClear();
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        await endpoint.readResponse('genBasic', 99, {0x55: {value: 0x000b, type: 0x19}});
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(1);
        const call = mocksendZclFrameToEndpoint.mock.calls[0];
        expect(call[0]).toBe('0x129');
        expect(call[1]).toBe(129);
        expect(call[2]).toBe(1);
        expect(deepClone(call[3])).toStrictEqual({
            header: {
                frameControl: {reservedBits: 0, frameType: 0, direction: 1, disableDefaultResponse: true, manufacturerSpecific: false},
                transactionSequenceNumber: 99,
                commandIdentifier: 1,
            },
            payload: [{attrId: 85, attrData: 11, dataType: 25, status: 0}],
            cluster: {
                ID: 0,
                attributes: {
                    zclVersion: {ID: 0, type: 32, name: 'zclVersion'},
                    appVersion: {ID: 1, type: 32, name: 'appVersion'},
                    stackVersion: {ID: 2, type: 32, name: 'stackVersion'},
                    hwVersion: {ID: 3, type: 32, name: 'hwVersion'},
                    manufacturerName: {ID: 4, type: 66, name: 'manufacturerName'},
                    modelId: {ID: 5, type: 66, name: 'modelId'},
                    dateCode: {ID: 6, type: 66, name: 'dateCode'},
                    powerSource: {ID: 7, type: 48, name: 'powerSource'},
                    appProfileVersion: {ID: 8, type: 48, name: 'appProfileVersion'},
                    genericDeviceType: {ID: 9, type: 48, name: 'genericDeviceType'},
                    productCode: {ID: 10, type: 65, name: 'productCode'},
                    productUrl: {ID: 11, type: 66, name: 'productUrl'},
                    manufacturerVersionDetails: {ID: 12, type: 66, name: 'manufacturerVersionDetails'},
                    serialNumber: {ID: 13, type: 66, name: 'serialNumber'},
                    productLabel: {ID: 14, type: 66, name: 'productLabel'},
                    locationDesc: {ID: 16, type: 66, name: 'locationDesc'},
                    physicalEnv: {ID: 17, type: 48, name: 'physicalEnv'},
                    deviceEnabled: {ID: 18, type: 16, name: 'deviceEnabled'},
                    alarmMask: {ID: 19, type: 24, name: 'alarmMask'},
                    disableLocalConfig: {ID: 20, type: 24, name: 'disableLocalConfig'},
                    swBuildId: {ID: 16384, type: 66, name: 'swBuildId'},
                    schneiderMeterRadioPower: {ID: 57856, manufacturerCode: 4190, name: 'schneiderMeterRadioPower', type: 40},
                },
                name: 'genBasic',
                commands: {
                    resetFactDefault: {ID: 0, parameters: [], name: 'resetFactDefault'},
                    tuyaSetup: {ID: 240, parameters: [], name: 'tuyaSetup'},
                },
                commandsResponse: {},
            },
            command: {
                ID: 1,
                name: 'readRsp',
                parameters: [
                    {name: 'attrId', type: 33},
                    {name: 'status', type: 32},
                    {name: 'dataType', type: 32, conditions: [{type: 'statusEquals', value: 0}]},
                    {name: 'attrData', type: 1000, conditions: [{type: 'statusEquals', value: 0}]},
                ],
            },
        });
        expect(call[4]).toBe(10000);
    });

    it('Read response to endpoint with unknown string attribute', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        mocksendZclFrameToEndpoint.mockClear();
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        let error;
        try {
            await endpoint.readResponse('genBasic', 99, {UNKNOWN: {value: 0x000b, type: 0x19}});
        } catch (e) {
            error = e;
        }
        expect(error).toStrictEqual(new Error(`Unknown attribute 'UNKNOWN', specify either an existing attribute or a number`));
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(0);
    });

    it('Read response to endpoint throw when transaction sequence number provided through options', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        mocksendZclFrameToEndpoint.mockClear();
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        let error;
        try {
            await endpoint.readResponse('genBasic', 99, {UNKNOWN: {value: 0x000b, type: 0x19}}, {transactionSequenceNumber: 5});
        } catch (e) {
            error = e;
        }
        expect(error.message).toStrictEqual(`Use parameter`);
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(0);
    });

    it('Configure reporting endpoint custom attributes', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        mocksendZclFrameToEndpoint.mockClear();
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        await endpoint.configureReporting('hvacThermostat', [
            {
                attribute: {ID: 0x4004, type: 41},
                minimumReportInterval: 0,
                maximumReportInterval: 3600,
                reportableChange: 25,
            },
        ]);

        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(1);
        const call = mocksendZclFrameToEndpoint.mock.calls[0];
        expect(call[0]).toBe('0x129');
        expect(call[1]).toBe(129);
        expect(call[2]).toBe(1);
        expect({...deepClone(call[3]), cluster: {}}).toStrictEqual({
            cluster: {},
            command: {
                ID: 6,
                name: 'configReport',
                parameters: [
                    {name: 'direction', type: 32},
                    {name: 'attrId', type: 33},
                    {conditions: [{type: 'directionEquals', value: 0}], name: 'dataType', type: 32},
                    {conditions: [{type: 'directionEquals', value: 0}], name: 'minRepIntval', type: 33},
                    {conditions: [{type: 'directionEquals', value: 0}], name: 'maxRepIntval', type: 33},
                    {
                        conditions: [
                            {type: 'directionEquals', value: 0},
                            {type: 'dataTypeValueTypeEquals', value: 'ANALOG'},
                        ],
                        name: 'repChange',
                        type: 1000,
                    },
                    {conditions: [{type: 'directionEquals', value: 1}], name: 'timeout', type: 33},
                ],
                response: 7,
            },
            header: {
                commandIdentifier: 6,
                frameControl: {direction: 0, disableDefaultResponse: true, frameType: 0, manufacturerSpecific: false, reservedBits: 0},
                transactionSequenceNumber: 11,
            },
            payload: [{attrId: 16388, dataType: 41, direction: 0, maxRepIntval: 3600, minRepIntval: 0, repChange: 25}],
        });
        expect(call[4]).toBe(10000);

        const hvacThermostat = Zcl.Utils.getCluster('hvacThermostat', undefined, {});
        expect(deepClone(endpoint.configuredReportings)).toStrictEqual([
            {
                cluster: deepClone(hvacThermostat),
                attribute: {ID: 0x4004, name: 'attr0', type: Zcl.DataType.UNKNOWN},
                minimumReportInterval: 0,
                maximumReportInterval: 3600,
                reportableChange: 25,
            },
        ]);
    });

    it('Remove endpoint from all groups', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device1 = controller.getDeviceByIeeeAddr('0x129')!;
        await mockAdapterEvents['deviceJoined']({networkAddress: 170, ieeeAddr: '0x170'});
        const device2 = controller.getDeviceByIeeeAddr('0x170')!;
        const group1 = await controller.createGroup(1);
        const group6 = await controller.createGroup(6);
        const group7 = await controller.createGroup(7);
        const endpoint1 = device1.getEndpoint(1)!;
        await group1.addMember(endpoint1);
        await group6.addMember(endpoint1);
        await group6.addMember(device2.getEndpoint(1)!);
        await group7.addMember(device2.getEndpoint(1)!);
        mocksendZclFrameToEndpoint.mockClear();
        await endpoint1.removeFromAllGroups();
        const call = mocksendZclFrameToEndpoint.mock.calls[0];
        expect(call[0]).toBe('0x129');
        expect(call[1]).toBe(129);
        expect(call[2]).toBe(1);
        expect(group1.members).toStrictEqual([]);
        expect(Array.from(group6.members)).toStrictEqual([device2.getEndpoint(1)]);
        expect(Array.from(group7.members)).toStrictEqual([device2.getEndpoint(1)]);
        expect(deepClone(call[3])).toStrictEqual({
            header: {
                frameControl: {reservedBits: 0, frameType: 1, direction: 0, disableDefaultResponse: true, manufacturerSpecific: false},
                transactionSequenceNumber: 25,
                commandIdentifier: 4,
            },
            payload: {},
            cluster: {
                ID: 4,
                attributes: {nameSupport: {ID: 0, type: 24, name: 'nameSupport'}},
                name: 'genGroups',
                commands: {
                    add: {
                        ID: 0,
                        response: 0,
                        parameters: [
                            {name: 'groupid', type: 33},
                            {name: 'groupname', type: 66},
                        ],
                        name: 'add',
                    },
                    view: {ID: 1, response: 1, parameters: [{name: 'groupid', type: 33}], name: 'view'},
                    getMembership: {
                        ID: 2,
                        response: 2,
                        parameters: [
                            {name: 'groupcount', type: 32},
                            {name: 'grouplist', type: 1002},
                        ],
                        name: 'getMembership',
                    },
                    miboxerSetZones: {ID: 240, name: 'miboxerSetZones', parameters: [{name: 'zones', type: 1012}]},
                    remove: {ID: 3, response: 3, parameters: [{name: 'groupid', type: 33}], name: 'remove'},
                    removeAll: {ID: 4, parameters: [], name: 'removeAll'},
                    addIfIdentifying: {
                        ID: 5,
                        parameters: [
                            {name: 'groupid', type: 33},
                            {name: 'groupname', type: 66},
                        ],
                        name: 'addIfIdentifying',
                    },
                },
                commandsResponse: {
                    addRsp: {
                        ID: 0,
                        parameters: [
                            {name: 'status', type: 32},
                            {name: 'groupid', type: 33},
                        ],
                        name: 'addRsp',
                    },
                    viewRsp: {
                        ID: 1,
                        parameters: [
                            {name: 'status', type: 32},
                            {name: 'groupid', type: 33},
                            {name: 'groupname', type: 66},
                        ],
                        name: 'viewRsp',
                    },
                    getMembershipRsp: {
                        ID: 2,
                        parameters: [
                            {name: 'capacity', type: 32},
                            {name: 'groupcount', type: 32},
                            {name: 'grouplist', type: 1002},
                        ],
                        name: 'getMembershipRsp',
                    },
                    removeRsp: {
                        ID: 3,
                        parameters: [
                            {name: 'status', type: 32},
                            {name: 'groupid', type: 33},
                        ],
                        name: 'removeRsp',
                    },
                },
            },
            command: {ID: 4, parameters: [], name: 'removeAll'},
        });
    });

    it('Load database', async () => {
        const database = `
        {"id":1,"type":"Coordinator","ieeeAddr":"0x0000012300000000","nwkAddr":0,"manufId":0,"epList":[11,6,5,4,3,2,1],"endpoints":{"1":{"profId":260,"epId":1,"devId":5,"inClusterList":[],"meta":{},"outClusterList":[],"clusters":{}},"2":{"profId":257,"epId":2,"devId":5,"inClusterList":[],"meta":{},"outClusterList":[],"clusters":{}},"3":{"profId":261,"epId":3,"devId":5,"inClusterList":[],"meta":{},"outClusterList":[],"clusters":{}},"4":{"profId":263,"epId":4,"devId":5,"inClusterList":[],"meta":{},"outClusterList":[],"clusters":{}},"5":{"profId":264,"epId":5,"devId":5,"inClusterList":[],"meta":{},"outClusterList":[],"clusters":{}},"6":{"profId":265,"epId":6,"devId":5,"inClusterList":[],"meta":{},"outClusterList":[],"clusters":{}},"11":{"profId":260,"epId":11,"devId":1024,"inClusterList":[],"meta":{},"outClusterList":[1280],"clusters":{}}},"interviewCompleted":false,"meta":{},"_id":"aM341ldunExFmJ3u"}
        {"id":2,"type":"Group","groupID":1,"members":[],"meta":{},"_id":"kiiAEst4irEEqG8T"}
        {"id":3,"type":"Router","ieeeAddr":"0x000b57fffec6a5b2","nwkAddr":40369,"manufId":4476,"manufName":"IKEA of Sweden","powerSource":"Mains (single phase)","modelId":"TRADFRI bulb E27 WS opal 980lm","epList":[1],"endpoints":{"1":{"profId":49246,"epId":1,"devId":544,"inClusterList":[0,3,4,5,6,8,768,2821,4096],"meta":{},"outClusterList":[5,25,32,4096],"clusters":{}}},"appVersion":17,"stackVersion":87,"hwVersion":1,"dateCode":"20170331","swBuildId":"1.2.217","zclVersion":1,"interviewCompleted":true,"meta":{"reporting":1},"_id":"pagvP2f9Bbj3o9TM"}
        {"id":4,"type":"EndDevice","ieeeAddr":"0x0017880104e45517","nwkAddr":6535,"manufId":4107,"manufName":"Philips","powerSource":"Battery","modelId":"RWL021","epList":[1,2],"endpoints":{"1":{"profId":49246,"epId":1,"devId":2096,"inClusterList":[0],"meta":{},"outClusterList":[0,3,4,6,8,5],"clusters":{}},"2":{"profId":260,"epId":2,"devId":12,"inClusterList":[0,1,3,15,64512],"meta":{},"outClusterList":[25],"clusters":{}}},"appVersion":2,"stackVersion":1,"hwVersion":1,"dateCode":"20160302","swBuildId":"5.45.1.17846","zclVersion":1,"interviewCompleted":true,"meta":{"configured":1},"_id":"qxhymbX6H2GXDw8Z"}
        {"$$indexCreated":{"fieldName":"id","unique":true,"sparse":false}}
        {"id":4,"type":"EndDevice","ieeeAddr":"0x0017880104e45517","nwkAddr":6536,"manufId":4107,"manufName":"Philips","powerSource":"Battery","modelId":"RWL021","epList":[1,2],"endpoints":{"1":{"profId":49246,"epId":1,"devId":2096,"inClusterList":[0],"meta":{},"outClusterList":[0,3,4,6,8,5],"clusters":{}},"2":{"profId":260,"epId":2,"devId":12,"inClusterList":[0,1,3,15,64512],"meta":{},"outClusterList":[25],"clusters":{}}},"appVersion":2,"stackVersion":1,"hwVersion":1,"dateCode":"20160302","swBuildId":"5.45.1.17846","zclVersion":1,"interviewCompleted":true,"meta":{"configured":1},"_id":"qxhymbX6H2GXDw8Z"}
        {"id":4,"type":"EndDevice","ieeeAddr":"0x0017880104e45517","lastSeen":123,"nwkAddr":6538,"manufId":4107,"manufName":"Philips","powerSource":"Battery","modelId":"RWL021","epList":[1,2],"endpoints":{"1":{"profId":49246,"epId":1,"devId":2096,"inClusterList":[0],"meta":{},"outClusterList":[0,3,4,6,8,5],"binds":[{"type":"endpoint","endpointID":1,"deviceIeeeAddr":"0x000b57fffec6a5b2"}],"configuredReportings":[{"cluster":1,"attrId":0,"minRepIntval":1,"maxRepIntval":20,"repChange":2}],"clusters":{"genBasic":{"dir":{"value":3},"attrs":{"modelId":"RWL021"}}}},"2":{"profId":260,"epId":2,"devId":12,"inClusterList":[0,1,3,15,64512],"meta":{},"outClusterList":[25],"clusters":{}}},"appVersion":2,"stackVersion":1,"hwVersion":1,"dateCode":"20160302","swBuildId":"5.45.1.17846","zclVersion":1,"interviewCompleted":true,"meta":{"configured":1},"_id":"qxhymbX6H2GXDw8Z"}
        {"id":5,"type":"Group","groupID":2,"members":[{"deviceIeeeAddr": "0x000b57fffec6a5b2", "endpointID": 1}, {"deviceIeeeAddr": "notExisting", "endpointID": 1}],"meta":{},"_id":"kiiAEst4irEEqG8K"}
        {"id":6,"type":"EndDevice","ieeeAddr":"0x0017880104e45518","nwkAddr":6536,"manufId":4107,"manufName":"Philips","powerSource":"Battery","modelId":"RWL021","epList":[1,2],"endpoints":{"1":{"profId":49246,"epId":1,"devId":2096,"inClusterList":[0],"meta":{},"outClusterList":[0,3,4,6,8,5],"clusters":{}},"2":{"profId":260,"epId":2,"devId":12,"inClusterList":[0,1,3,15,32,64512],"meta":{},"outClusterList":[25],"clusters":{}}},"appVersion":2,"stackVersion":1,"hwVersion":1,"dateCode":"20160302","swBuildId":"5.45.1.17846","zclVersion":1,"interviewCompleted":true,"meta":{"configured":1},"_id":"qxhymbX6H2GXDw8Z", "checkinInterval": 123456}
        `;
        fs.writeFileSync(options.databasePath, database);
        await controller.start();
        expect(controller.getDevices().length).toBe(4);
        expect(deepClone(controller.getDeviceByIeeeAddr('0x0000012300000000'))).toStrictEqual({
            ID: 1,
            _events: {},
            _eventsCount: 0,
            _pendingRequestTimeout: 0,
            _customClusters: {},
            _endpoints: [
                {
                    deviceID: 5,
                    _events: {},
                    _eventsCount: 0,
                    inputClusters: [],
                    outputClusters: [],
                    profileID: 260,
                    ID: 1,
                    clusters: {},
                    deviceIeeeAddress: '0x0000012300000000',
                    deviceNetworkAddress: 0,
                    _binds: [],
                    _configuredReportings: [],
                    meta: {},
                    pendingRequests: {ID: 1, deviceIeeeAddress: '0x0000012300000000', sendInProgress: false},
                },
                {
                    deviceID: 5,
                    inputClusters: [],
                    outputClusters: [],
                    profileID: 257,
                    ID: 2,
                    clusters: {},
                    deviceIeeeAddress: '0x0000012300000000',
                    deviceNetworkAddress: 0,
                    _binds: [],
                    _configuredReportings: [],
                    _events: {},
                    _eventsCount: 0,
                    meta: {},
                    pendingRequests: {ID: 2, deviceIeeeAddress: '0x0000012300000000', sendInProgress: false},
                },
                {
                    deviceID: 5,
                    inputClusters: [],
                    outputClusters: [],
                    profileID: 261,
                    ID: 3,
                    clusters: {},
                    deviceIeeeAddress: '0x0000012300000000',
                    deviceNetworkAddress: 0,
                    _binds: [],
                    _configuredReportings: [],
                    _events: {},
                    _eventsCount: 0,
                    meta: {},
                    pendingRequests: {ID: 3, deviceIeeeAddress: '0x0000012300000000', sendInProgress: false},
                },
                {
                    deviceID: 5,
                    inputClusters: [],
                    outputClusters: [],
                    profileID: 263,
                    ID: 4,
                    clusters: {},
                    deviceIeeeAddress: '0x0000012300000000',
                    deviceNetworkAddress: 0,
                    _binds: [],
                    _configuredReportings: [],
                    _events: {},
                    _eventsCount: 0,
                    meta: {},
                    pendingRequests: {ID: 4, deviceIeeeAddress: '0x0000012300000000', sendInProgress: false},
                },
                {
                    deviceID: 5,
                    inputClusters: [],
                    outputClusters: [],
                    profileID: 264,
                    ID: 5,
                    clusters: {},
                    deviceIeeeAddress: '0x0000012300000000',
                    deviceNetworkAddress: 0,
                    _binds: [],
                    _configuredReportings: [],
                    _events: {},
                    _eventsCount: 0,
                    meta: {},
                    pendingRequests: {ID: 5, deviceIeeeAddress: '0x0000012300000000', sendInProgress: false},
                },
                {
                    deviceID: 5,
                    inputClusters: [],
                    outputClusters: [],
                    profileID: 265,
                    ID: 6,
                    clusters: {},
                    deviceIeeeAddress: '0x0000012300000000',
                    deviceNetworkAddress: 0,
                    _binds: [],
                    _configuredReportings: [],
                    _events: {},
                    _eventsCount: 0,
                    meta: {},
                    pendingRequests: {ID: 6, deviceIeeeAddress: '0x0000012300000000', sendInProgress: false},
                },
                {
                    deviceID: 1024,
                    inputClusters: [],
                    outputClusters: [1280],
                    profileID: 260,
                    ID: 11,
                    clusters: {},
                    deviceIeeeAddress: '0x0000012300000000',
                    deviceNetworkAddress: 0,
                    _binds: [],
                    _configuredReportings: [],
                    _events: {},
                    _eventsCount: 0,
                    meta: {},
                    pendingRequests: {ID: 11, deviceIeeeAddress: '0x0000012300000000', sendInProgress: false},
                },
            ],
            _ieeeAddr: '0x0000012300000000',
            _interviewCompleted: false,
            _interviewing: false,
            _manufacturerID: 0,
            _networkAddress: 0,
            _type: 'Coordinator',
            _skipDefaultResponse: false,
            meta: {},
        });
        expect(deepClone(controller.getDeviceByIeeeAddr('0x000b57fffec6a5b2'))).toStrictEqual({
            ID: 3,
            _events: {},
            _eventsCount: 0,
            _pendingRequestTimeout: 0,
            _skipDefaultResponse: false,
            _applicationVersion: 17,
            _dateCode: '20170331',
            _customClusters: {},
            _endpoints: [
                {
                    _events: {},
                    _eventsCount: 0,
                    meta: {},
                    _binds: [],
                    _configuredReportings: [],
                    clusters: {},
                    ID: 1,
                    deviceID: 544,
                    deviceIeeeAddress: '0x000b57fffec6a5b2',
                    deviceNetworkAddress: 40369,
                    inputClusters: [0, 3, 4, 5, 6, 8, 768, 2821, 4096],
                    outputClusters: [5, 25, 32, 4096],
                    pendingRequests: {ID: 1, deviceIeeeAddress: '0x000b57fffec6a5b2', sendInProgress: false},
                    profileID: 49246,
                },
            ],
            _hardwareVersion: 1,
            _ieeeAddr: '0x000b57fffec6a5b2',
            _interviewCompleted: true,
            _interviewing: false,
            _manufacturerID: 4476,
            _manufacturerName: 'IKEA of Sweden',
            meta: {reporting: 1},
            _modelID: 'TRADFRI bulb E27 WS opal 980lm',
            _networkAddress: 40369,
            _powerSource: 'Mains (single phase)',
            _softwareBuildID: '1.2.217',
            _stackVersion: 87,
            _type: 'Router',
            _zclVersion: 1,
        });
        expect(deepClone(controller.getDeviceByIeeeAddr('0x0017880104e45517'))).toStrictEqual({
            ID: 4,
            _events: {},
            _eventsCount: 0,
            _pendingRequestTimeout: 0,
            _applicationVersion: 2,
            _dateCode: '20160302',
            _customClusters: {},
            _endpoints: [
                {
                    deviceID: 2096,
                    _events: {},
                    _eventsCount: 0,
                    inputClusters: [0],
                    outputClusters: [0, 3, 4, 6, 8, 5],
                    profileID: 49246,
                    ID: 1,
                    clusters: {genBasic: {dir: {value: 3}, attributes: {modelId: 'RWL021'}}},
                    deviceIeeeAddress: '0x0017880104e45517',
                    deviceNetworkAddress: 6538,
                    _binds: [{type: 'endpoint', endpointID: 1, deviceIeeeAddr: '0x000b57fffec6a5b2'}],
                    _configuredReportings: [{cluster: 1, attrId: 0, minRepIntval: 1, maxRepIntval: 20, repChange: 2}],
                    meta: {},
                    pendingRequests: {ID: 1, deviceIeeeAddress: '0x0017880104e45517', sendInProgress: false},
                },
                {
                    deviceID: 12,
                    inputClusters: [0, 1, 3, 15, 64512],
                    outputClusters: [25],
                    profileID: 260,
                    ID: 2,
                    clusters: {},
                    deviceIeeeAddress: '0x0017880104e45517',
                    deviceNetworkAddress: 6538,
                    _binds: [],
                    _configuredReportings: [],
                    _events: {},
                    _eventsCount: 0,
                    meta: {},
                    pendingRequests: {ID: 2, deviceIeeeAddress: '0x0017880104e45517', sendInProgress: false},
                },
            ],
            _hardwareVersion: 1,
            _ieeeAddr: '0x0017880104e45517',
            _interviewCompleted: true,
            _interviewing: false,
            _lastSeen: 123,
            _manufacturerID: 4107,
            _manufacturerName: 'Philips',
            _modelID: 'RWL021',
            _networkAddress: 6538,
            _powerSource: 'Battery',
            _softwareBuildID: '5.45.1.17846',
            _stackVersion: 1,
            _type: 'EndDevice',
            _zclVersion: 1,
            _skipDefaultResponse: false,
            meta: {configured: 1},
        });
        expect(deepClone(controller.getDeviceByIeeeAddr('0x0017880104e45518'))).toStrictEqual({
            ID: 6,
            _checkinInterval: 123456,
            _events: {},
            _eventsCount: 0,
            _pendingRequestTimeout: 123456000,
            _applicationVersion: 2,
            _dateCode: '20160302',
            _customClusters: {},
            _endpoints: [
                {
                    deviceID: 2096,
                    _events: {},
                    _eventsCount: 0,
                    inputClusters: [0],
                    outputClusters: [0, 3, 4, 6, 8, 5],
                    profileID: 49246,
                    ID: 1,
                    clusters: {},
                    deviceIeeeAddress: '0x0017880104e45518',
                    deviceNetworkAddress: 6536,
                    _binds: [],
                    _configuredReportings: [],
                    meta: {},
                    pendingRequests: {ID: 1, deviceIeeeAddress: '0x0017880104e45518', sendInProgress: false},
                },
                {
                    deviceID: 12,
                    inputClusters: [0, 1, 3, 15, 32, 64512],
                    outputClusters: [25],
                    profileID: 260,
                    ID: 2,
                    clusters: {},
                    deviceIeeeAddress: '0x0017880104e45518',
                    deviceNetworkAddress: 6536,
                    _binds: [],
                    _configuredReportings: [],
                    _events: {},
                    _eventsCount: 0,
                    meta: {},
                    pendingRequests: {ID: 2, deviceIeeeAddress: '0x0017880104e45518', sendInProgress: false},
                },
            ],
            _hardwareVersion: 1,
            _ieeeAddr: '0x0017880104e45518',
            _interviewCompleted: true,
            _interviewing: false,
            _manufacturerID: 4107,
            _manufacturerName: 'Philips',
            _modelID: 'RWL021',
            _networkAddress: 6536,
            _powerSource: 'Battery',
            _softwareBuildID: '5.45.1.17846',
            _stackVersion: 1,
            _type: 'EndDevice',
            _zclVersion: 1,
            _skipDefaultResponse: false,
            meta: {configured: 1},
        });
        expect((await controller.getGroups()).length).toBe(2);

        const group1 = controller.getGroupByID(1)!;
        expect(deepClone(group1)).toStrictEqual(deepClone({_events: {}, _eventsCount: 0, databaseID: 2, groupID: 1, _members: new Set(), meta: {}}));
        const group2 = controller.getGroupByID(2)!;
        expect(deepClone(group2)).toStrictEqual(
            deepClone({
                _events: {},
                _eventsCount: 0,
                databaseID: 5,
                groupID: 2,
                _members: new Set([
                    {
                        meta: {},
                        _binds: [],
                        _configuredReportings: [],
                        clusters: {},
                        ID: 1,
                        _events: {},
                        _eventsCount: 0,
                        deviceID: 544,
                        deviceIeeeAddress: '0x000b57fffec6a5b2',
                        deviceNetworkAddress: 40369,
                        inputClusters: [0, 3, 4, 5, 6, 8, 768, 2821, 4096],
                        outputClusters: [5, 25, 32, 4096],
                        pendingRequests: {ID: 1, deviceIeeeAddress: '0x000b57fffec6a5b2', sendInProgress: false},
                        profileID: 49246,
                    },
                ]),
                meta: {},
            }),
        );
    });

    it('Shouldnt load device from group databaseentry', async () => {
        expect(() => {
            // @ts-ignore
            Device.fromDatabaseEntry({type: 'Group', endpoints: []});
        }).toThrow('Cannot load device from group');
    });

    it('Should throw datbase basic crud errors', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        expect(() => {
            // @ts-expect-error mock
            controller.database.insert({id: 2});
        }).toThrow(`DatabaseEntry with ID '2' already exists`);

        expect(() => {
            // @ts-expect-error mock
            controller.database.remove(3);
        }).toThrow(`DatabaseEntry with ID '3' does not exist`);

        expect(() => {
            // @ts-expect-error mock
            controller.database.update({id: 3});
        }).toThrow(`DatabaseEntry with ID '3' does not exist`);
    });

    it('Should save received attributes', async () => {
        let buffer = Buffer.from([24, 169, 10, 0, 0, 24, 1]);
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        let frame = Zcl.Frame.fromBuffer(Zcl.Utils.getCluster('msOccupancySensing', undefined, {}).ID, Zcl.Header.fromBuffer(buffer), buffer, {});
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            address: 129,
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: 1,
            linkquality: 50,
            groupID: 1,
        });
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.endpoints[0];
        expect(endpoint.getClusterAttributeValue('msOccupancySensing', 'occupancy')).toBe(1);
        expect(endpoint.getClusterAttributeValue('genBasic', 'modelId')).toBeUndefined();

        buffer = Buffer.from([24, 169, 10, 0, 0, 24, 0]);
        frame = Zcl.Frame.fromBuffer(Zcl.Utils.getCluster('msOccupancySensing', undefined, {}).ID, Zcl.Header.fromBuffer(buffer), buffer, {});
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            address: 129,
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: 1,
            linkquality: 50,
            groupID: 1,
        });

        expect(endpoint.getClusterAttributeValue('msOccupancySensing', 'occupancy')).toBe(0);
    });

    it('Emit read from device', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const frame = Zcl.Frame.create(0, 0, true, undefined, 40, 0, 1, [{attrId: 0}, {attrId: 9999}], {});
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            address: 129,
            // Attrid 9999 does not exist in ZCL
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: 1,
            linkquality: 19,
            groupID: 10,
        });

        const expected = {
            type: 'read',
            device: {
                ID: 2,
                _applicationVersion: 2,
                _dateCode: '201901',
                _pendingRequestTimeout: 0,
                _customClusters: {},
                _endpoints: [
                    {
                        deviceID: 5,
                        inputClusters: [0, 1],
                        outputClusters: [2],
                        pendingRequests: {ID: 1, deviceIeeeAddress: '0x129', sendInProgress: false},
                        profileID: 99,
                        ID: 1,
                        clusters: {},
                        deviceIeeeAddress: '0x129',
                        deviceNetworkAddress: 129,
                        _binds: [],
                        _configuredReportings: [],
                        _events: {},
                        _eventsCount: 0,
                        meta: {},
                    },
                ],
                _hardwareVersion: 3,
                _events: {},
                _eventsCount: 0,
                _ieeeAddr: '0x129',
                _interviewCompleted: true,
                _interviewing: false,
                _lastSeen: Date.now(),
                _linkquality: 19,
                _skipDefaultResponse: false,
                _manufacturerID: 1212,
                _manufacturerName: 'KoenAndCo',
                _modelID: 'myModelID',
                _networkAddress: 129,
                _powerSource: 'Mains (single phase)',
                _softwareBuildID: '1.01',
                _stackVersion: 101,
                _type: 'Router',
                _zclVersion: 1,
                meta: {},
            },
            endpoint: {
                deviceID: 5,
                inputClusters: [0, 1],
                outputClusters: [2],
                pendingRequests: {ID: 1, deviceIeeeAddress: '0x129', sendInProgress: false},
                profileID: 99,
                ID: 1,
                clusters: {},
                deviceIeeeAddress: '0x129',
                deviceNetworkAddress: 129,
                _binds: [],
                _configuredReportings: [],
                _events: {},
                _eventsCount: 0,
                meta: {},
            },
            data: ['mainsVoltage', 9999],
            linkquality: 19,
            groupID: 10,
            cluster: 'genPowerCfg',
            meta: {
                zclTransactionSequenceNumber: 40,
                frameControl: {
                    reservedBits: 0,
                    direction: 0,
                    disableDefaultResponse: true,
                    frameType: 0,
                    manufacturerSpecific: false,
                },
            },
        };

        expect(events.message.length).toBe(1);
        expect(deepClone(events.message[0])).toStrictEqual(expected);
    });

    it('Emit write from device', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const frame = Zcl.Frame.create(0, 0, true, undefined, 40, 2, 10, [{attrId: 16389, dataType: 32, attrData: 3}], {});
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            address: 129,
            // Attrid 9999 does not exist in ZCL
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: 1,
            linkquality: 19,
            groupID: 10,
        });

        const expected = {
            type: 'write',
            device: {
                ID: 2,
                _events: {},
                _eventsCount: 0,
                _applicationVersion: 2,
                _dateCode: '201901',
                _pendingRequestTimeout: 0,
                _customClusters: {},
                _endpoints: [
                    {
                        meta: {},
                        deviceID: 5,
                        _events: {},
                        _eventsCount: 0,
                        inputClusters: [0, 1],
                        outputClusters: [2],
                        pendingRequests: {ID: 1, deviceIeeeAddress: '0x129', sendInProgress: false},
                        profileID: 99,
                        ID: 1,
                        clusters: {},
                        deviceIeeeAddress: '0x129',
                        deviceNetworkAddress: 129,
                        _binds: [],
                        _configuredReportings: [],
                    },
                ],
                _hardwareVersion: 3,
                _ieeeAddr: '0x129',
                _interviewCompleted: true,
                _interviewing: false,
                _lastSeen: Date.now(),
                _linkquality: 19,
                _skipDefaultResponse: false,
                _manufacturerID: 1212,
                _manufacturerName: 'KoenAndCo',
                _modelID: 'myModelID',
                _networkAddress: 129,
                _powerSource: 'Mains (single phase)',
                _softwareBuildID: '1.01',
                _stackVersion: 101,
                _type: 'Router',
                _zclVersion: 1,
                meta: {},
            },
            endpoint: {
                _events: {},
                _eventsCount: 0,
                deviceID: 5,
                inputClusters: [0, 1],
                outputClusters: [2],
                pendingRequests: {ID: 1, deviceIeeeAddress: '0x129', sendInProgress: false},
                profileID: 99,
                ID: 1,
                clusters: {},
                deviceIeeeAddress: '0x129',
                deviceNetworkAddress: 129,
                _binds: [],
                _configuredReportings: [],
                meta: {},
            },
            data: {
                '16389': 3,
            },
            linkquality: 19,
            groupID: 10,
            cluster: 'genTime',
            meta: {
                zclTransactionSequenceNumber: 40,
                frameControl: {
                    reservedBits: 0,
                    direction: 0,
                    disableDefaultResponse: true,
                    frameType: 0,
                    manufacturerSpecific: false,
                },
            },
        };

        expect(events.message.length).toBe(1);
        expect(deepClone(events.message[0])).toStrictEqual(expected);
    });

    it('Endpoint command error', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        mocksendZclFrameToEndpoint.mockRejectedValueOnce(new Error('timeout occurred'));
        let error;
        try {
            await endpoint.command('genOnOff', 'toggle', {});
        } catch (e) {
            error = e;
        }
        expect(error).toStrictEqual(
            new Error(
                `ZCL command 0x129/1 genOnOff.toggle({}, {"timeout":10000,"disableResponse":false,"disableRecovery":false,"disableDefaultResponse":false,"direction":0,"reservedBits":0,"writeUndiv":false}) failed (timeout occurred)`,
            ),
        );
    });

    it('Endpoint commandResponse error', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        mocksendZclFrameToEndpoint.mockRejectedValueOnce(new Error('timeout occurred'));
        let error;
        try {
            await endpoint.commandResponse('genOta', 'imageNotify', {payloadType: 0, queryJitter: 1}, undefined, undefined);
        } catch (e) {
            error = e;
        }
        expect(error).toStrictEqual(
            new Error(
                `CommandResponse 0x129/1 genOta.imageNotify({"payloadType":0,"queryJitter":1}, {"timeout":10000,"disableResponse":false,"disableRecovery":false,"disableDefaultResponse":true,"direction":1,"reservedBits":0,"writeUndiv":false}) failed (timeout occurred)`,
            ),
        );
    });

    it('Endpoint commandResponse error when transactionSequenceNumber provided through options', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        mocksendZclFrameToEndpoint.mockRejectedValueOnce(new Error('timeout occurred'));
        let error;
        try {
            await endpoint.commandResponse('genOta', 'imageNotify', {payloadType: 0, queryJitter: 1}, {transactionSequenceNumber: 10}, undefined);
        } catch (e) {
            error = e;
        }
        expect(error.message).toStrictEqual(`Use parameter`);
    });

    it('ConfigureReporting error', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        mocksendZclFrameToEndpoint.mockRejectedValueOnce(new Error('timeout occurred'));
        let error;
        try {
            await endpoint.configureReporting('genOnOff', [
                {attribute: 'onOff', minimumReportInterval: 0, maximumReportInterval: 2, reportableChange: 10},
            ]);
        } catch (e) {
            error = e;
        }
        expect(error).toStrictEqual(
            new Error(
                `ZCL command 0x129/1 genOnOff.configReport([{"attribute":"onOff","minimumReportInterval":0,"maximumReportInterval":2,"reportableChange":10}], {"timeout":10000,"disableResponse":false,"disableRecovery":false,"disableDefaultResponse":true,"direction":0,"reservedBits":0,"writeUndiv":false}) failed (timeout occurred)`,
            ),
        );
    });

    it('DefaultResponse error', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        mocksendZclFrameToEndpoint.mockRejectedValueOnce(new Error('timeout occurred'));
        let error;
        try {
            await endpoint.defaultResponse(1, 0, 1, 3);
        } catch (e) {
            error = e;
        }
        expect(error).toStrictEqual(
            new Error(
                `ZCL command 0x129/1 genPowerCfg.defaultRsp({"cmdId":1,"statusCode":0}, {"timeout":10000,"disableResponse":false,"disableRecovery":false,"disableDefaultResponse":true,"direction":1,"reservedBits":0,"transactionSequenceNumber":3,"writeUndiv":false}) failed (timeout occurred)`,
            ),
        );
    });

    it('DefaultResponse error when transactionSequenceNumber provided through options', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        mocksendZclFrameToEndpoint.mockRejectedValueOnce(new Error('timeout occurred'));
        let error;
        try {
            await endpoint.defaultResponse(1, 0, 1, 3, {transactionSequenceNumber: 10});
        } catch (e) {
            error = e;
        }
        expect(error.message).toStrictEqual(`Use parameter`);
    });

    it('Skip unbind if not bound', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        await mockAdapterEvents['deviceJoined']({networkAddress: 170, ieeeAddr: '0x170'});
        const endpoint = controller.getDeviceByIeeeAddr('0x129')?.getEndpoint(1)!;
        const target = controller.getDeviceByIeeeAddr('0x170')?.getEndpoint(1)!;
        mockAdapterSendZdo.mockClear();
        await endpoint.unbind('genOnOff', target);
        expect(mockAdapterSendZdo).toHaveBeenCalledTimes(0);
    });

    it('Handle unbind with number not matching any group', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const endpoint = controller.getDeviceByIeeeAddr('0x129')!.getEndpoint(1)!;
        let error;
        try {
            await endpoint.unbind('genOnOff', 1);
        } catch (e) {
            error = e;
        }
        expect(error).toStrictEqual(new Error(`Unbind 0x129/1 genOnOff invalid target '1' (no group with this ID exists).`));
    });

    it('Unbind against unbound cluster', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        await mockAdapterEvents['deviceJoined']({networkAddress: 170, ieeeAddr: '0x170'});
        const endpoint = controller.getDeviceByIeeeAddr('0x129')!.getEndpoint(1)!;
        const target = controller.getDeviceByIeeeAddr('0x170')!.getEndpoint(1)!;
        await endpoint.bind('genOnOff', target);
        mockAdapterSendZdo.mockClear();

        sendZdoResponseStatus = Zdo.Status.NO_ENTRY;

        await endpoint.unbind('genOnOff', target);

        const zdoPayload = Zdo.Buffalo.buildRequest(
            false,
            Zdo.ClusterId.UNBIND_REQUEST,
            '0x129',
            1,
            Zcl.Clusters.genOnOff.ID,
            Zdo.UNICAST_BINDING,
            '0x170',
            0,
            1,
        );
        expect(mockAdapterSendZdo).toHaveBeenCalledWith('0x129', 129, Zdo.ClusterId.UNBIND_REQUEST, zdoPayload, false);
        expect(endpoint.binds).toStrictEqual([]);
    });

    it('Unbind error', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        await mockAdapterEvents['deviceJoined']({networkAddress: 170, ieeeAddr: '0x170'});
        const endpoint = controller.getDeviceByIeeeAddr('0x129')!.getEndpoint(1)!;
        const target = controller.getDeviceByIeeeAddr('0x170')!.getEndpoint(1)!;
        await endpoint.bind('genOnOff', target);
        mockAdapterSendZdo.mockClear();

        sendZdoResponseStatus = Zdo.Status.INVALID_INDEX;

        await expect(endpoint.unbind('genOnOff', target)).rejects.toThrow(`Unbind 0x129/1 genOnOff from '0x170/1' failed (Status 'INVALID_INDEX')`);

        const zdoPayload = Zdo.Buffalo.buildRequest(
            false,
            Zdo.ClusterId.UNBIND_REQUEST,
            '0x129',
            1,
            Zcl.Clusters.genOnOff.ID,
            Zdo.UNICAST_BINDING,
            '0x170',
            0,
            1,
        );
        expect(mockAdapterSendZdo).toHaveBeenCalledWith('0x129', 129, Zdo.ClusterId.UNBIND_REQUEST, zdoPayload, false);
    });

    it('Bind error', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        await mockAdapterEvents['deviceJoined']({networkAddress: 170, ieeeAddr: '0x170'});
        const endpoint = controller.getDeviceByIeeeAddr('0x129')!.getEndpoint(1)!;
        const target = controller.getDeviceByIeeeAddr('0x170')!.getEndpoint(1)!;
        mockAdapterSendZdo.mockClear();

        sendZdoResponseStatus = Zdo.Status.INVALID_INDEX;

        await expect(endpoint.bind('genOnOff', target)).rejects.toThrow(`Bind 0x129/1 genOnOff from '0x170/1' failed (Status 'INVALID_INDEX')`);

        const zdoPayload = Zdo.Buffalo.buildRequest(
            false,
            Zdo.ClusterId.BIND_REQUEST,
            '0x129',
            1,
            Zcl.Clusters.genOnOff.ID,
            Zdo.UNICAST_BINDING,
            '0x170',
            0,
            1,
        );
        expect(mockAdapterSendZdo).toHaveBeenCalledWith('0x129', 129, Zdo.ClusterId.BIND_REQUEST, zdoPayload, false);
    });

    it('ReadResponse error', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        mocksendZclFrameToEndpoint.mockRejectedValueOnce(new Error('timeout occurred'));
        let error;
        try {
            await endpoint.readResponse('genOnOff', 1, [{onOff: 1}]);
        } catch (e) {
            error = e;
        }
        expect(error).toStrictEqual(
            new Error(
                `ZCL command 0x129/1 genOnOff.readRsp([{"onOff":1}], {"timeout":10000,"disableResponse":false,"disableRecovery":false,"disableDefaultResponse":true,"direction":1,"reservedBits":0,"transactionSequenceNumber":1,"writeUndiv":false}) failed (timeout occurred)`,
            ),
        );
    });

    it('Read error', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        mocksendZclFrameToEndpoint.mockRejectedValueOnce(new Error('timeout occurred'));
        let error;
        try {
            await endpoint.read('genOnOff', ['onOff']);
        } catch (e) {
            error = e;
        }
        expect(error).toStrictEqual(
            new Error(
                `ZCL command 0x129/1 genOnOff.read(["onOff"], {"timeout":10000,"disableResponse":false,"disableRecovery":false,"disableDefaultResponse":true,"direction":0,"reservedBits":0,"writeUndiv":false}) failed (timeout occurred)`,
            ),
        );
    });

    it('Read with disable response', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        mocksendZclFrameToEndpoint.mockReturnValueOnce(null);
        let error;
        try {
            await endpoint.read('genOnOff', ['onOff'], {disableResponse: true});
        } catch (e) {
            error = e;
        }
        expect(error).toBeUndefined();
    });

    it('Write error', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        mocksendZclFrameToEndpoint.mockRejectedValueOnce(new Error('timeout occurred'));
        let error;
        try {
            await endpoint.write('genOnOff', {onOff: 1});
        } catch (e) {
            error = e;
        }
        expect(error).toStrictEqual(
            new Error(
                `ZCL command 0x129/1 genOnOff.write({"onOff":1}, {"timeout":10000,"disableResponse":false,"disableRecovery":false,"disableDefaultResponse":true,"direction":0,"reservedBits":0,"writeUndiv":false}) failed (timeout occurred)`,
            ),
        );
    });

    it('Write with disable response', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        mocksendZclFrameToEndpoint.mockReturnValueOnce(null);
        let error;
        try {
            await endpoint.write('genOnOff', {onOff: 1}, {disableResponse: true});
        } catch (e) {
            error = e;
        }
        expect(error).toBeUndefined();
    });

    it('Group command error', async () => {
        await controller.start();
        const group = await controller.createGroup(2);
        mocksendZclFrameToGroup.mockRejectedValueOnce(new Error('timeout'));
        let error;
        try {
            await group.command('genOnOff', 'toggle', {});
        } catch (e) {
            error = e;
        }
        expect(error).toStrictEqual(new Error(`Command 2 genOnOff.toggle({}) failed (timeout)`));
    });

    it('Write structured', async () => {
        await controller.start();
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        mocksendZclFrameToEndpoint.mockReturnValueOnce(null);
        let error;
        try {
            await endpoint.writeStructured('genPowerCfg', {});
        } catch (e) {
            error = e;
        }
        expect(error).toBeUndefined();
    });

    it('Write structured with disable response', async () => {
        await controller.start();
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        mocksendZclFrameToEndpoint.mockReturnValueOnce(null);
        let error;
        try {
            await endpoint.writeStructured('genPowerCfg', {}, {disableResponse: true});
        } catch (e) {
            error = e;
        }
        expect(error).toBeUndefined();
    });

    it('Write structured error', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        mocksendZclFrameToEndpoint.mockRejectedValueOnce(new Error('timeout occurred'));
        let error;
        try {
            await endpoint.writeStructured('genPowerCfg', {});
        } catch (e) {
            error = e;
        }
        expect(error).toStrictEqual(
            new Error(
                `ZCL command 0x129/1 genPowerCfg.writeStructured({}, {"timeout":10000,"disableResponse":false,"disableRecovery":false,"disableDefaultResponse":true,"direction":0,"reservedBits":0,"writeUndiv":false}) failed (timeout occurred)`,
            ),
        );
    });

    it('Green power', async () => {
        await controller.start();
        const data = {
            options: 0,
            srcID: 0x0046f4fe,
            frameCounter: 228,
            commandID: 0xe0,
            payloadSize: 27,
            commandFrame: {
                deviceID: 0x02,
                options: 0x81,
                extendedOptions: 0xf2,
                securityKey: Buffer.from([0xf1, 0xec, 0x92, 0xab, 0xff, 0x8f, 0x13, 0x63, 0xe1, 0x46, 0xbe, 0xb5, 0x18, 0xc9, 0x0c, 0xab]),
                keyMic: 0xd5d446a4,
                outgoingCounter: 0x000004e4,
            },
        };
        const frame = Zcl.Frame.create(1, 0, true, undefined, 10, 'commissioningNotification', 33, data, {});
        vi.spyOn(Zcl.Frame, 'fromBuffer').mockReturnValueOnce(frame); // Mock because no Buffalo write for 0xe0 is implemented
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: true,
            address: 0x46f4fe,
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: ZSpec.GP_ENDPOINT,
            linkquality: 50,
            groupID: 1,
        });

        const dataResponse = {
            options: 0x00e548,
            srcID: 0x0046f4fe,
            sinkGroupID: 0x0b84,
            deviceID: 2,
            frameCounter: 1252,
            gpdKey: [29, 213, 18, 52, 213, 52, 152, 88, 183, 49, 101, 110, 209, 248, 244, 140],
        };
        const frameResponse = Zcl.Frame.create(1, 1, true, undefined, 2, 'pairing', 33, dataResponse, {});

        expect(mocksendZclFrameToAll.mock.calls[0][0]).toBe(ZSpec.GP_ENDPOINT);
        expect(deepClone(mocksendZclFrameToAll.mock.calls[0][1])).toStrictEqual(deepClone(frameResponse));
        expect(mocksendZclFrameToAll.mock.calls[0][2]).toBe(ZSpec.GP_ENDPOINT);
        expect(mocksendZclFrameToAll).toHaveBeenCalledTimes(1);

        // When joins again, shouldnt emit duplicate event
        vi.spyOn(Zcl.Frame, 'fromBuffer').mockReturnValueOnce(frame); // Mock because no Buffalo write for 0xe0 is implemented
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: true,
            address: 0xf4fe,
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: ZSpec.GP_ENDPOINT,
            linkquality: 50,
            groupID: 1,
        });

        expect(events.deviceJoined.length).toBe(1);
        expect(deepClone(events.deviceJoined[0])).toStrictEqual({
            device: {
                ID: 2,
                _pendingRequestTimeout: 0,
                _skipDefaultResponse: false,
                _customClusters: {},
                _endpoints: [
                    {
                        inputClusters: [],
                        outputClusters: [],
                        pendingRequests: {ID: ZSpec.GP_ENDPOINT, deviceIeeeAddress: '0x000000000046f4fe', sendInProgress: false},
                        ID: ZSpec.GP_ENDPOINT,
                        clusters: {},
                        deviceIeeeAddress: '0x000000000046f4fe',
                        deviceNetworkAddress: 0xf4fe,
                        _binds: [],
                        _configuredReportings: [],
                        _events: {},
                        _eventsCount: 0,
                        meta: {},
                    },
                ],
                _events: {},
                _eventsCount: 0,
                _ieeeAddr: '0x000000000046f4fe',
                _interviewCompleted: true,
                _interviewing: false,
                _lastSeen: Date.now(),
                _linkquality: 50,
                _modelID: 'GreenPower_2',
                _networkAddress: 0xf4fe,
                _type: 'GreenPower',
                meta: {},
            },
        });
        expect(events.deviceInterview.length).toBe(1);
        expect(deepClone(events.deviceInterview[0])).toStrictEqual({
            status: 'successful',
            device: {
                ID: 2,
                _pendingRequestTimeout: 0,
                _skipDefaultResponse: false,
                _customClusters: {},
                _endpoints: [],
                _events: {},
                _eventsCount: 0,
                _ieeeAddr: '0x000000000046f4fe',
                _interviewCompleted: true,
                _interviewing: false,
                _modelID: 'GreenPower_2',
                _networkAddress: 0xf4fe,
                _type: 'GreenPower',
                meta: {},
            },
        });
        expect(controller.getDeviceByIeeeAddr('0x000000000046f4fe')!.networkAddress).toBe(0xf4fe);
        expect(events.message.length).toBe(2);

        // Green power device send message
        events.message = [];
        expect(events.message.length).toBe(0);
        const dataToggle = {
            options: 0,
            srcID: 0x0046f4fe,
            frameCounter: 228,
            commandID: 0x22,
            payloadSize: 255,
            commandFrame: {},
        };
        const frameToggle = Zcl.Frame.create(1, 0, true, undefined, 10, 'notification', 33, dataToggle, {});
        vi.spyOn(Zcl.Frame, 'fromBuffer').mockReturnValueOnce(frameToggle); // Mock because no Buffalo write for 0x22 is implemented
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            address: 0xf4fe,
            clusterID: frameToggle.cluster.ID,
            data: frameToggle.toBuffer(),
            header: frameToggle.header,
            endpoint: ZSpec.GP_ENDPOINT,
            linkquality: 50,
            groupID: 1,
        });

        expect(events.message.length).toBe(1);
        const expected = {
            type: 'commandNotification',
            device: {
                ID: 2,
                _events: {},
                _eventsCount: 0,
                _pendingRequestTimeout: 0,
                _customClusters: {},
                _endpoints: [
                    {
                        inputClusters: [],
                        meta: {},
                        outputClusters: [],
                        pendingRequests: {ID: ZSpec.GP_ENDPOINT, deviceIeeeAddress: '0x000000000046f4fe', sendInProgress: false},
                        ID: ZSpec.GP_ENDPOINT,
                        _events: {},
                        _eventsCount: 0,
                        clusters: {},
                        deviceIeeeAddress: '0x000000000046f4fe',
                        deviceNetworkAddress: 0xf4fe,
                        _binds: [],
                        _configuredReportings: [],
                    },
                ],
                _ieeeAddr: '0x000000000046f4fe',
                _interviewCompleted: true,
                _interviewing: false,
                _lastSeen: Date.now(),
                _linkquality: 50,
                _skipDefaultResponse: false,
                _modelID: 'GreenPower_2',
                _networkAddress: 0xf4fe,
                _type: 'GreenPower',
                meta: {},
            },
            endpoint: {
                inputClusters: [],
                meta: {},
                outputClusters: [],
                pendingRequests: {ID: ZSpec.GP_ENDPOINT, deviceIeeeAddress: '0x000000000046f4fe', sendInProgress: false},
                ID: ZSpec.GP_ENDPOINT,
                _events: {},
                _eventsCount: 0,
                clusters: {},
                deviceIeeeAddress: '0x000000000046f4fe',
                deviceNetworkAddress: 0xf4fe,
                _binds: [],
                _configuredReportings: [],
            },
            data: {options: 0, srcID: 0x46f4fe, frameCounter: 228, commandID: 34, payloadSize: 255, commandFrame: {}},
            linkquality: 50,
            groupID: 1,
            cluster: 'greenPower',
            meta: {
                zclTransactionSequenceNumber: 10,
                frameControl: {reservedBits: 0, frameType: 1, direction: 0, disableDefaultResponse: true, manufacturerSpecific: false},
            },
        };
        expect(deepClone(events.message[0])).toStrictEqual(expected);

        await mockAdapterEvents[''];
    });

    it('Should handle comissioning frame gracefully', async () => {
        await controller.start();
        mockLogger.error.mockClear();
        const buffer = Buffer.from([25, 10, 2, 11, 254, 0]);
        const frame = Zcl.Frame.fromBuffer(Zcl.Clusters.greenPower.ID, Zcl.Header.fromBuffer(buffer)!, buffer, {});
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: true,
            address: 0x46f4fe,
            clusterID: frame.cluster.ID,
            data: buffer,
            header: frame.header,
            endpoint: ZSpec.GP_ENDPOINT,
            linkquality: 50,
            groupID: 1,
        });

        expect(mockLogger.error).toHaveBeenCalledTimes(0);
        expect(mockLogger.debug).toHaveBeenCalledWith(`Received unhandled command '0x2' from '4650238'`, `zh:controller:greenpower`);
    });

    it('Should ignore invalid green power frame', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        device.addCustomCluster('myCustomCluster', {
            ID: 9123,
            commands: {},
            commandsResponse: {},
            attributes: {superAttribute: {ID: 0, type: Zcl.DataType.UINT8}},
        });
        const buffer = Buffer.from([24, 169, 99, 0, 1, 24, 3, 0, 0, 24, 1]);
        const header = Zcl.Header.fromBuffer(buffer);
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            address: 129,
            clusterID: 33,
            data: buffer,
            header,
            endpoint: 1,
            linkquality: 50,
            groupID: 1,
        });
        expect(events.message.length).toBe(0);
    });

    it('Green power channel request', async () => {
        await controller.start();
        const srcID = 0x0046f4fe;
        // mock device as already joined to avoid zclPayload triggering unknown device identification
        await mockAdapterEvents['deviceJoined']({ieeeAddr: '0x000000000046f4fe', networkAddress: srcID & 0xffff});

        // Channel Request
        const data = {
            options: 0,
            srcID,
            frameCounter: 228,
            commandID: 0xe3,
            gppNwkAddr: 0x1234,
            payloadSize: 27,
            commandFrame: {
                nextChannel: 10,
                nextNextChannel: 15,
            },
        };
        const frame = Zcl.Frame.create(1, 0, true, undefined, 10, 'commissioningNotification', 33, data, {});
        vi.spyOn(Zcl.Frame, 'fromBuffer').mockReturnValueOnce(frame); // Mock because no Buffalo write for 0xe3 is implemented
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: true,
            address: srcID & 0xffff,
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: ZSpec.GP_ENDPOINT,
            linkquality: 50,
            groupID: 1,
        });

        const commissioningReply = {
            options: 0,
            tempMaster: 0x1234,
            tempMasterTx: 10,
            srcID,
            gpdCmd: 0xf3,
            gpdPayload: {
                commandID: 0xf3,
                options: 4,
            },
        };

        const frameResponse = Zcl.Frame.create(1, 1, true, undefined, 2, 'response', 33, commissioningReply, {});

        expect(mocksendZclFrameToAll).toHaveBeenCalledTimes(1);
        expect(mocksendZclFrameToAll.mock.calls[0][0]).toBe(ZSpec.GP_ENDPOINT);
        expect(deepClone(mocksendZclFrameToAll.mock.calls[0][1])).toStrictEqual(deepClone(frameResponse));
        expect(mocksendZclFrameToAll.mock.calls[0][2]).toBe(ZSpec.GP_ENDPOINT);
    });

    it('Green power rxOnCap', async () => {
        await controller.start();
        const data = {
            options: 0,
            srcID: 0x0046f4fe,
            frameCounter: 228,
            commandID: 0xe0,
            gppNwkAddr: 0x1234,
            payloadSize: 27,
            commandFrame: {
                deviceID: 0x02,
                options: 0x83,
                extendedOptions: 0xf2,
                securityKey: Buffer.from([0xf1, 0xec, 0x92, 0xab, 0xff, 0x8f, 0x13, 0x63, 0xe1, 0x46, 0xbe, 0xb5, 0x18, 0xc9, 0x0c, 0xab]),
                keyMic: 0xd5d446a4,
                outgoingCounter: 0x000004e4,
            },
        };
        const frame = Zcl.Frame.create(1, 0, true, undefined, 10, 'commissioningNotification', 33, data, {});
        vi.spyOn(Zcl.Frame, 'fromBuffer').mockReturnValueOnce(frame); // Mock because no Buffalo write for 0xe0 is implemented
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: true,
            address: 0x46f4fe,
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: ZSpec.GP_ENDPOINT,
            linkquality: 50,
            groupID: 1,
        });

        const device = controller.getDeviceByIeeeAddr('0x000000000046f4fe')!;
        const networkParameters = await controller.getNetworkParameters();

        const commissioningReply = {
            options: 0,
            tempMaster: 0x1234,
            tempMasterTx: networkParameters.channel - 11,
            srcID: 0x0046f4fe,
            gpdCmd: 0xf0,
            gpdPayload: {
                commandID: 0xf0,
                options: 0b00000000, // Disable encryption
            },
        };

        const frameResponse = Zcl.Frame.create(1, 1, true, undefined, 2, 'response', 33, commissioningReply, {});

        expect(mocksendZclFrameToAll).toHaveBeenCalledTimes(2);
        expect(mocksendZclFrameToAll.mock.calls[0][0]).toBe(ZSpec.GP_ENDPOINT);
        expect(deepClone(mocksendZclFrameToAll.mock.calls[0][1])).toStrictEqual(deepClone(frameResponse));
        expect(mocksendZclFrameToAll.mock.calls[0][2]).toBe(ZSpec.GP_ENDPOINT);

        const pairingData = {
            options: 424,
            srcID: 0x0046f4fe,
            sinkGroupID: 0x0b84,
            deviceID: 2,
        };
        const pairing = Zcl.Frame.create(1, 1, true, undefined, 3, 'pairing', 33, pairingData, {});

        expect(mocksendZclFrameToAll.mock.calls[1][0]).toBe(ZSpec.GP_ENDPOINT);
        expect(deepClone(mocksendZclFrameToAll.mock.calls[1][1])).toStrictEqual(deepClone(pairing));
        expect(mocksendZclFrameToAll.mock.calls[1][2]).toBe(ZSpec.GP_ENDPOINT);

        mocksendZclFrameToAll.mockClear();
        // Test green power response on endpoint object
        const payload = {
            options: 0b000,
            tempMaster: 0x1234,
            tempMasterTx: networkParameters.channel - 11,
            srcID: 0x0046f4fe,
            gpdCmd: 0xfe,
            gpdPayload: {
                commandID: 0xfe,
                buffer: Buffer.alloc(1),
            },
        };

        await device.getEndpoint(ZSpec.GP_ENDPOINT)!.commandResponse('greenPower', 'response', payload, {
            srcEndpoint: ZSpec.GP_ENDPOINT,
            disableDefaultResponse: true,
        });

        const response = Zcl.Frame.create(1, 1, true, undefined, 4, 'response', 33, payload, {});

        expect(mocksendZclFrameToAll).toHaveBeenCalledTimes(1);
        expect(mocksendZclFrameToAll.mock.calls[0][0]).toBe(ZSpec.GP_ENDPOINT);
        expect(deepClone(mocksendZclFrameToAll.mock.calls[0][1])).toStrictEqual(deepClone(response));
        expect(mocksendZclFrameToAll.mock.calls[0][2]).toBe(ZSpec.GP_ENDPOINT);
    });

    it('Green power unicast', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const srcID = 0x017171f8;
        const gppDevice = controller.getDeviceByIeeeAddr('0x129')!;
        const data = {
            options: 0x800, // Proxy info present
            srcID,
            frameCounter: 248,
            commandID: 0xe0,
            payloadSize: 46,
            commandFrame: {
                deviceID: 0x02,
                options: 0xc5,
                extendedOptions: 0xf2,
                gpdClientClusters: Buffer.alloc(0),
                gpdServerClusters: Buffer.alloc(0),
                manufacturerID: 0,
                modelID: 0,
                numClientClusters: 0,
                numServerClusters: 0,
                securityKey: Buffer.from([0x21, 0x7f, 0x8c, 0xb2, 0x90, 0xd9, 0x90, 0x14, 0x15, 0xd0, 0x5c, 0xb1, 0x64, 0x7c, 0x44, 0x6c]),
                keyMic: 0xf80547fa,
                outgoingCounter: 0x000011f8,
                applicationInfo: 0x04,
                numGdpCommands: 17,
                gpdCommandIdList: Buffer.from([0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x22, 0x60, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68]),
            },
            gppNwkAddr: gppDevice.networkAddress,
            gppGddLink: 0xd8,
        };

        const expectedFrame = Zcl.Frame.create(1, 0, true, undefined, 100, 'commissioningNotification', 33, data, {});

        const buffer = Buffer.from([
            0x11, 0x64, 0x04, 0x00, 0x08, 0xf8, 0x71, 0x71, 0x01, 0xf8, 0x00, 0x00, 0x00, 0xe0, 0x2e, 0x02, 0xc5, 0xf2, 0x21, 0x7f, 0x8c, 0xb2, 0x90,
            0xd9, 0x90, 0x14, 0x15, 0xd0, 0x5c, 0xb1, 0x64, 0x7c, 0x44, 0x6c, 0xfa, 0x47, 0x05, 0xf8, 0xf8, 0x11, 0x00, 0x00, 0x04, 0x11, 0x10, 0x11,
            0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x22, 0x60, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x81, 0x00, 0xd8,
        ]);
        const receivedFrame = Zcl.Frame.fromBuffer(33, Zcl.Header.fromBuffer(buffer), buffer, {});

        expect(deepClone(receivedFrame)).toStrictEqual(deepClone(expectedFrame));
        vi.spyOn(Zcl.Frame, 'fromBuffer').mockReturnValueOnce(expectedFrame); // Mock because no Buffalo write for 0xe0 is implemented
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            address: gppDevice.networkAddress,
            clusterID: expectedFrame.cluster.ID,
            data: expectedFrame.toBuffer(),
            header: expectedFrame.header,
            endpoint: ZSpec.GP_ENDPOINT,
            linkquality: 50,
            groupID: 0,
        });

        const dataResponse = {
            options: 0x00e568,
            srcID,
            sinkIEEEAddr: '0x0000012300000000',
            sinkNwkAddr: 0,
            deviceID: 2,
            frameCounter: 4600,
            gpdKey: [0x09, 0x3c, 0xed, 0x1d, 0xbf, 0x25, 0x63, 0xf9, 0x29, 0x5c, 0x0d, 0x3d, 0x9f, 0xc5, 0x76, 0xe1],
        };
        const frameResponse = Zcl.Frame.create(1, 1, true, undefined, 11, 'pairing', 33, dataResponse, {});

        expect(mocksendZclFrameToEndpoint).toHaveBeenLastCalledWith(
            gppDevice.ieeeAddr,
            gppDevice.networkAddress,
            ZSpec.GP_ENDPOINT,
            expect.any(Object),
            10000,
            false,
            false,
            ZSpec.GP_ENDPOINT,
        );
        expect(deepClone(mocksendZclFrameToEndpoint.mock.calls[mocksendZclFrameToEndpoint.mock.calls.length - 1][3])).toStrictEqual(
            deepClone(frameResponse),
        );

        // When joins again, shouldnt emit duplicate event
        vi.spyOn(Zcl.Frame, 'fromBuffer').mockReturnValueOnce(expectedFrame); // Mock because no Buffalo write for 0xe0 is implemented
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            address: 129,
            clusterID: expectedFrame.cluster.ID,
            data: expectedFrame.toBuffer(),
            header: expectedFrame.header,
            endpoint: ZSpec.GP_ENDPOINT,
            linkquality: 50,
            groupID: 0,
        });

        expect(events.deviceJoined.length).toBe(2); // gpp + gpd
        expect(deepClone(events.deviceJoined[1])).toStrictEqual({
            device: {
                ID: 3,
                _events: {},
                _eventsCount: 0,
                _pendingRequestTimeout: 0,
                _skipDefaultResponse: false,
                _customClusters: {},
                _endpoints: [
                    {
                        ID: ZSpec.GP_ENDPOINT,
                        _binds: [],
                        _configuredReportings: [],
                        _events: {},
                        _eventsCount: 0,
                        clusters: {},
                        deviceIeeeAddress: '0x00000000017171f8',
                        deviceNetworkAddress: 0x71f8,
                        inputClusters: [],
                        meta: {},
                        outputClusters: [],
                        pendingRequests: {ID: ZSpec.GP_ENDPOINT, deviceIeeeAddress: '0x00000000017171f8', sendInProgress: false},
                    },
                ],
                _ieeeAddr: '0x00000000017171f8',
                _interviewCompleted: true,
                _interviewing: false,
                _lastSeen: Date.now(),
                _linkquality: 50,
                _modelID: 'GreenPower_2',
                _networkAddress: 0x71f8,
                _type: 'GreenPower',
                meta: {},
            },
        });
        console.log(events.deviceInterview);
        expect(events.deviceInterview.length).toBe(3); // gpp[started] + gpp[successful] + gpd
        expect(deepClone(events.deviceInterview[2])).toStrictEqual({
            status: 'successful',
            device: {
                ID: 3,
                _events: {},
                _eventsCount: 0,
                _pendingRequestTimeout: 0,
                _skipDefaultResponse: false,
                _customClusters: {},
                _endpoints: [],
                _ieeeAddr: '0x00000000017171f8',
                _interviewCompleted: true,
                _interviewing: false,
                _modelID: 'GreenPower_2',
                _networkAddress: 0x71f8,
                _type: 'GreenPower',
                meta: {},
            },
        });
        expect(controller.getDeviceByIeeeAddr('0x00000000017171f8')!.networkAddress).toBe(0x71f8);
        expect(events.message.length).toBe(2);

        // Green power device send message
        events.message = [];
        expect(events.message.length).toBe(0);
        const dataScene = {
            options: 0x5488,
            srcID,
            frameCounter: 4601,
            commandID: 0x13,
            payloadSize: 0,
            commandFrame: {},
            gppNwkAddr: 129,
            gppGddLink: 0xd8,
        };
        const frameScene = Zcl.Frame.create(1, 0, true, undefined, 10, 'notification', 33, dataScene, {});
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            address: srcID & 0xffff,
            clusterID: frameScene.cluster.ID,
            data: frameScene.toBuffer(),
            header: frameScene.header,
            endpoint: ZSpec.GP_ENDPOINT,
            linkquality: 50,
            groupID: 0,
        });

        expect(events.message.length).toBe(1);
        const expected = {
            type: 'commandNotification',
            device: {
                _events: {},
                _eventsCount: 0,
                ID: 3,
                _type: 'GreenPower',
                _ieeeAddr: '0x00000000017171f8',
                _networkAddress: 29176,
                _customClusters: {},
                _endpoints: [
                    {
                        _events: {},
                        _eventsCount: 0,
                        ID: ZSpec.GP_ENDPOINT,
                        inputClusters: [],
                        outputClusters: [],
                        deviceNetworkAddress: 29176,
                        deviceIeeeAddress: '0x00000000017171f8',
                        clusters: {},
                        _binds: [],
                        _configuredReportings: [],
                        meta: {},
                        pendingRequests: {sendInProgress: false, ID: ZSpec.GP_ENDPOINT, deviceIeeeAddress: '0x00000000017171f8'},
                    },
                ],
                _modelID: 'GreenPower_2',
                _interviewCompleted: true,
                _interviewing: false,
                _skipDefaultResponse: false,
                meta: {},
                _lastSeen: Date.now(),
                _pendingRequestTimeout: 0,
                _linkquality: 50,
            },
            endpoint: {
                _events: {},
                _eventsCount: 0,
                ID: ZSpec.GP_ENDPOINT,
                inputClusters: [],
                outputClusters: [],
                deviceNetworkAddress: 29176,
                deviceIeeeAddress: '0x00000000017171f8',
                clusters: {},
                _binds: [],
                _configuredReportings: [],
                meta: {},
                pendingRequests: {sendInProgress: false, ID: ZSpec.GP_ENDPOINT, deviceIeeeAddress: '0x00000000017171f8'},
            },
            data: {
                options: 21640,
                srcID: 24211960,
                frameCounter: 4601,
                commandID: 19,
                payloadSize: 0,
                commandFrame: {raw: {type: 'Buffer', data: [129, 0, 216]}},
                gppNwkAddr: 129,
                gppGddLink: 216,
            },
            linkquality: 50,
            groupID: 0,
            cluster: 'greenPower',
            meta: {
                zclTransactionSequenceNumber: 10,
                frameControl: {reservedBits: 0, frameType: 1, direction: 0, disableDefaultResponse: true, manufacturerSpecific: false},
            },
        };
        expect(deepClone(events.message[0])).toStrictEqual(expected);

        // Remove green power device from network
        const removeCommand = {
            options: 0x002550,
            srcID,
        };
        const removeFrame = Zcl.Frame.create(1, 1, true, undefined, 13, 'pairing', 33, removeCommand, {});

        events.message = [];
        const device = controller.getDeviceByIeeeAddr('0x00000000017171f8')!!;
        await device.removeFromNetwork();
        expect(mocksendZclFrameToAll.mock.calls[0][0]).toBe(ZSpec.GP_ENDPOINT);
        expect(deepClone(mocksendZclFrameToAll.mock.calls[0][1])).toStrictEqual(deepClone(removeFrame));
        expect(mocksendZclFrameToAll.mock.calls[0][2]).toBe(ZSpec.GP_ENDPOINT);
        expect(mocksendZclFrameToAll).toHaveBeenCalledTimes(1);
        expect(controller.getDeviceByIeeeAddr('0x00000000017171f8')).toBeUndefined();

        expect(Device.byIeeeAddr('0x00000000017171f8')).toBeUndefined();
        expect(deepClone(Device.byIeeeAddr('0x00000000017171f8', true))).toStrictEqual({
            ID: 3,
            _events: {},
            _eventsCount: 0,
            _pendingRequestTimeout: 0,
            _skipDefaultResponse: false,
            _customClusters: {},
            _endpoints: [
                {
                    ID: ZSpec.GP_ENDPOINT,
                    _binds: [],
                    _configuredReportings: [],
                    _events: {},
                    _eventsCount: 0,
                    clusters: {},
                    deviceIeeeAddress: '0x00000000017171f8',
                    deviceNetworkAddress: 0x71f8,
                    inputClusters: [],
                    meta: {},
                    outputClusters: [],
                    pendingRequests: {ID: ZSpec.GP_ENDPOINT, deviceIeeeAddress: '0x00000000017171f8', sendInProgress: false},
                },
            ],
            _ieeeAddr: '0x00000000017171f8',
            _interviewCompleted: false,
            _interviewing: false,
            _lastSeen: Date.now(),
            _linkquality: 50,
            _modelID: 'GreenPower_2',
            _networkAddress: 0x71f8,
            _type: 'GreenPower',
            meta: {},
        });

        // Re-add device
        vi.spyOn(Zcl.Frame, 'fromBuffer').mockReturnValueOnce(expectedFrame); // Mock because no Buffalo write for 0xe0 is implemented
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            address: 129,
            clusterID: expectedFrame.cluster.ID,
            data: expectedFrame.toBuffer(),
            header: expectedFrame.header,
            endpoint: ZSpec.GP_ENDPOINT,
            linkquality: 50,
            groupID: 0,
        });

        expect(deepClone(Device.byIeeeAddr('0x00000000017171f8'))).toStrictEqual({
            ID: 3,
            _events: {},
            _eventsCount: 0,
            _pendingRequestTimeout: 0,
            _skipDefaultResponse: false,
            _customClusters: {},
            _endpoints: [
                {
                    ID: ZSpec.GP_ENDPOINT,
                    _binds: [],
                    _configuredReportings: [],
                    _events: {},
                    _eventsCount: 0,
                    clusters: {},
                    deviceIeeeAddress: '0x00000000017171f8',
                    deviceNetworkAddress: 0x71f8,
                    inputClusters: [],
                    meta: {},
                    outputClusters: [],
                    pendingRequests: {ID: ZSpec.GP_ENDPOINT, deviceIeeeAddress: '0x00000000017171f8', sendInProgress: false},
                },
            ],
            _ieeeAddr: '0x00000000017171f8',
            _interviewCompleted: true,
            _interviewing: false,
            _lastSeen: Date.now(),
            _linkquality: 50,
            _modelID: 'GreenPower_2',
            _networkAddress: 0x71f8,
            _type: 'GreenPower',
            meta: {},
        });
    });

    it('Get input/ouptut clusters', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 172, ieeeAddr: '0x172'});
        const device = controller.getDeviceByIeeeAddr('0x172')!;
        const endpoint = device.getEndpoint(11)!;
        expect(endpoint.getInputClusters().map((c) => c.name)).toStrictEqual([
            'genBasic',
            'genIdentify',
            'genGroups',
            'genScenes',
            'genOnOff',
            'genLevelCtrl',
            'lightingColorCtrl',
            '62301',
        ]);
        expect(endpoint.getOutputClusters().map((c) => c.name)).toStrictEqual(['genDeviceTempCfg']);
    });

    it('Report to endpoint custom attributes', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        mocksendZclFrameToEndpoint.mockClear();
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        const options = {manufacturerCode: 0x100b, disableDefaultResponse: true, timeout: 12, defaultResponseTimeout: 16};
        await endpoint.report('genBasic', {0x0031: {value: 0x000b, type: 0x19}}, options);
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(1);
        const call = mocksendZclFrameToEndpoint.mock.calls[0];
        expect(call[0]).toBe('0x129');
        expect(call[1]).toBe(129);
        expect(call[2]).toBe(1);
        expect(deepClone(call[3])).toStrictEqual({
            header: {
                frameControl: {reservedBits: 0, frameType: 0, direction: 0, disableDefaultResponse: true, manufacturerSpecific: true},
                transactionSequenceNumber: 11,
                manufacturerCode: 4107,
                commandIdentifier: 10,
            },
            payload: [{attrId: 49, attrData: 11, dataType: 25}],
            cluster: {
                ID: 0,
                attributes: {
                    zclVersion: {ID: 0, type: 32, name: 'zclVersion'},
                    appVersion: {ID: 1, type: 32, name: 'appVersion'},
                    stackVersion: {ID: 2, type: 32, name: 'stackVersion'},
                    hwVersion: {ID: 3, type: 32, name: 'hwVersion'},
                    manufacturerName: {ID: 4, type: 66, name: 'manufacturerName'},
                    modelId: {ID: 5, type: 66, name: 'modelId'},
                    dateCode: {ID: 6, type: 66, name: 'dateCode'},
                    powerSource: {ID: 7, type: 48, name: 'powerSource'},
                    appProfileVersion: {ID: 8, type: 48, name: 'appProfileVersion'},
                    genericDeviceType: {ID: 9, type: 48, name: 'genericDeviceType'},
                    productCode: {ID: 10, type: 65, name: 'productCode'},
                    productUrl: {ID: 11, type: 66, name: 'productUrl'},
                    manufacturerVersionDetails: {ID: 12, type: 66, name: 'manufacturerVersionDetails'},
                    serialNumber: {ID: 13, type: 66, name: 'serialNumber'},
                    productLabel: {ID: 14, type: 66, name: 'productLabel'},
                    locationDesc: {ID: 16, type: 66, name: 'locationDesc'},
                    physicalEnv: {ID: 17, type: 48, name: 'physicalEnv'},
                    deviceEnabled: {ID: 18, type: 16, name: 'deviceEnabled'},
                    alarmMask: {ID: 19, type: 24, name: 'alarmMask'},
                    disableLocalConfig: {ID: 20, type: 24, name: 'disableLocalConfig'},
                    swBuildId: {ID: 16384, type: 66, name: 'swBuildId'},
                    schneiderMeterRadioPower: {ID: 57856, manufacturerCode: 4190, name: 'schneiderMeterRadioPower', type: 40},
                },
                name: 'genBasic',
                commands: {
                    resetFactDefault: {ID: 0, parameters: [], name: 'resetFactDefault'},
                    tuyaSetup: {ID: 240, parameters: [], name: 'tuyaSetup'},
                },
                commandsResponse: {},
            },
            command: {
                ID: 10,
                name: 'report',
                parameters: [
                    {name: 'attrId', type: 33},
                    {name: 'dataType', type: 32},
                    {name: 'attrData', type: 1000},
                ],
            },
        });
        expect(call[4]).toBe(12);
    });

    it('Report to endpoint with unknown string attribute', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        mocksendZclFrameToEndpoint.mockClear();
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        let error;
        try {
            await endpoint.report('genBasic', {UNKNOWN: {value: 0x000b, type: 0x19}});
        } catch (e) {
            error = e;
        }
        expect(error).toStrictEqual(new Error(`Unknown attribute 'UNKNOWN', specify either an existing attribute or a number`));
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(0);
    });

    it('Report error', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        mocksendZclFrameToEndpoint.mockRejectedValueOnce(new Error('timeout occurred'));
        let error;
        try {
            await endpoint.report('genOnOff', {onOff: 1});
        } catch (e) {
            error = e;
        }
        expect(error).toStrictEqual(
            new Error(
                `ZCL command 0x129/1 genOnOff.report({"onOff":1}, {"timeout":10000,"disableResponse":false,"disableRecovery":false,"disableDefaultResponse":true,"direction":0,"reservedBits":0,"writeUndiv":false}) failed (timeout occurred)`,
            ),
        );
    });

    it('Write to device with pendingRequestTimeout > 0', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 174, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        device.pendingRequestTimeout = 10000;
        const endpoint = device.getEndpoint(1)!;
        const buffer = Buffer.from([24, 169, 10, 0, 0, 24, 1]);
        const frame = Zcl.Frame.fromBuffer(Zcl.Utils.getCluster('msOccupancySensing', undefined, {}).ID, Zcl.Header.fromBuffer(buffer), buffer, {});
        const data = {
            wasBroadcast: false,
            address: '0x129',
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: 1,
            linkquality: 50,
            groupID: 1,
        };
        // We need to wait for the data to be queued
        // @ts-expect-error private
        const origQueueRequest = endpoint.pendingRequests.queue;
        // @ts-expect-error private
        endpoint.pendingRequests.queue = async (req) => {
            // @ts-expect-error private
            const f = origQueueRequest.call(endpoint.pendingRequests, req);
            vi.advanceTimersByTime(10);
            return f;
        };
        // @ts-expect-error private
        endpoint.pendingRequests.add(new Request(async () => {}, frame, 100));
        mocksendZclFrameToEndpoint.mockClear();
        mocksendZclFrameToEndpoint.mockImplementationOnce(async () => {
            throw new Error('Dogs barking too hard');
        });
        mocksendZclFrameToEndpoint.mockReturnValueOnce(null);
        const nextTick = new Promise(process.nextTick);
        const result = endpoint.write('genOnOff', {onOff: 1}, {disableResponse: true});
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(1);

        await nextTick;
        await mockAdapterEvents['zclPayload'](data);
        await result;
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(2);
        expect(await result).toBe(undefined);
        await mockAdapterEvents['zclPayload'](data);
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(2);
    });

    it('Write to device with pendingRequestTimeout > 0, override default sendPolicy', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 174, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        device.pendingRequestTimeout = 10000;
        const endpoint = device.getEndpoint(1)!;

        // @ts-expect-error private
        endpoint.pendingRequests.add(
            // @ts-expect-error mock
            new Request(async () => {}, {}, 100),
        );
        mocksendZclFrameToEndpoint.mockClear();
        mocksendZclFrameToEndpoint.mockImplementationOnce(async () => {
            throw new Error('Dogs barking too hard');
        });
        mocksendZclFrameToEndpoint.mockImplementationOnce(async () => {
            throw new Error('Cats barking too hard');
        });
        try {
            await endpoint.write('genOnOff', {onOff: 1}, {disableResponse: true, sendPolicy: 'immediate'});
        } catch (error) {
            expect(error.message).toStrictEqual(
                `ZCL command 0x129/1 genOnOff.write({\"onOff\":1}, {"timeout":10000,"disableResponse":true,"disableRecovery":false,"disableDefaultResponse":true,"direction":0,"reservedBits":0,"writeUndiv":false,"sendPolicy":"immediate"}) failed (Dogs barking too hard)`,
            );
        }
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(1);
        // @ts-expect-error private
        expect(endpoint.pendingRequests.size).toStrictEqual(1);
    });

    it('Write to device with pendingRequestTimeout > 0, error', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        device.checkinInterval = 10;
        const buffer = Buffer.from([24, 169, 10, 0, 0, 24, 1]);
        const frame = Zcl.Frame.fromBuffer(Zcl.Utils.getCluster('msOccupancySensing', undefined, {}).ID, Zcl.Header.fromBuffer(buffer), buffer, {});
        const data = {
            wasBroadcast: false,
            address: '0x129',
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: 1,
            linkquality: 50,
            groupID: 1,
        };
        expect(device.pendingRequestTimeout).toStrictEqual(10000);
        const endpoint = device.getEndpoint(1)!;
        // We need to wait for the data to be queued
        // @ts-expect-error private
        const origQueueRequest = endpoint.pendingRequests.queue;
        // @ts-expect-error private
        endpoint.pendingRequests.queue = async (req) => {
            // @ts-expect-error private
            const f = origQueueRequest.call(endpoint.pendingRequests, req);
            vi.advanceTimersByTime(10);
            return f;
        };
        const origSendPendingRequests = endpoint.sendPendingRequests;
        endpoint.sendPendingRequests = async (fastpoll) => {
            const f = await origSendPendingRequests.call(endpoint, fastpoll);
            vi.advanceTimersByTime(10);
            return f;
        };
        // @ts-expect-error private
        endpoint.pendingRequests.add(
            new Request(
                async () => {},
                frame,
                100,
                undefined,
                undefined,
                () => {},
                () => {},
            ),
        );

        mocksendZclFrameToEndpoint.mockClear();
        mocksendZclFrameToEndpoint.mockImplementationOnce(async () => {
            throw new Error('Cats barking too hard');
        });
        mocksendZclFrameToEndpoint.mockImplementationOnce(async () => {
            throw new Error('Dogs barking too hard');
        });
        let nextTick = new Promise(process.nextTick);
        const result = endpoint.write('genOnOff', {onOff: 1}, {disableResponse: true});
        await nextTick;
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(1);

        nextTick = new Promise(process.nextTick);
        await mockAdapterEvents['zclPayload'](data);
        await nextTick;
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(2);
        await vi.advanceTimersByTimeAsync(100000);
        let error;
        try {
            await mockAdapterEvents['zclPayload'](data);
            await result;
        } catch (e) {
            error = e;
        }
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(2);
        expect(error.message).toStrictEqual(
            `ZCL command 0x129/1 genOnOff.write({\"onOff\":1}, {"timeout":10000,"disableResponse":true,"disableRecovery":false,"disableDefaultResponse":true,"direction":0,"reservedBits":0,"writeUndiv":false}) failed (Dogs barking too hard)`,
        );
    });

    it('Write to device with pendingRequestTimeout > 0, replace queued messages', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        device.pendingRequestTimeout = 10000;
        const endpoint = device.getEndpoint(1)!;

        // We need to wait for the data to be queued, but not for the promise to resolve
        // @ts-expect-error private
        const origQueueRequest = endpoint.pendingRequests.queue;
        // @ts-expect-error private
        endpoint.pendingRequests.queue = async (req) => {
            // @ts-expect-error private
            const f = origQueueRequest.call(endpoint.pendingRequests, req);
            vi.advanceTimersByTime(10);
            return f;
        };

        //add a request with empty data and a ZclFrame to the queue
        // @ts-expect-error private
        endpoint.pendingRequests.add(
            // @ts-expect-error mock
            new Request(async () => {}, {}, 100),
        );
        // Queue content:
        // 1. empty request
        mocksendZclFrameToEndpoint.mockClear();
        mocksendZclFrameToEndpoint.mockImplementationOnce(async () => {
            throw new Error('Error one');
        });
        mocksendZclFrameToEndpoint.mockImplementationOnce(async () => {
            throw new Error('Error two');
        });
        mocksendZclFrameToEndpoint.mockImplementationOnce(async () => {
            throw new Error('Error three');
        });
        mocksendZclFrameToEndpoint.mockImplementationOnce(async () => {
            throw new Error('Error four');
        });
        mocksendZclFrameToEndpoint.mockImplementationOnce(async () => {
            throw new Error('Error five');
        });
        mocksendZclFrameToEndpoint.mockImplementationOnce(async () => {
            throw new Error('Error six');
        });
        mocksendZclFrameToEndpoint.mockImplementationOnce(async () => {
            throw new Error('Error seven');
        });
        mocksendZclFrameToEndpoint.mockImplementationOnce(async () => {
            throw new Error('Error eight');
        });
        mocksendZclFrameToEndpoint.mockImplementationOnce(async () => {});
        mocksendZclFrameToEndpoint.mockImplementationOnce(async () => {
            throw new Error('Dogs barking too hard');
        });

        const createResponse = (attrData: number) => {
            const frame = Zcl.Frame.create(
                0,
                1,
                true,
                undefined,
                10,
                'readRsp',
                'genOnOff',
                [{attrId: 16385, dataType: 33, attrData, status: 0}],
                {},
            );
            return {clusterID: frame.cluster.ID, header: frame.header, data: frame.toBuffer()};
        };
        mocksendZclFrameToEndpoint.mockReturnValueOnce(createResponse(1));
        mocksendZclFrameToEndpoint.mockReturnValueOnce(createResponse(2));
        mocksendZclFrameToEndpoint.mockReturnValueOnce(createResponse(3));
        mocksendZclFrameToEndpoint.mockReturnValueOnce(createResponse(4));

        let result1, result2: Promise<any>;
        let nextTick = new Promise(process.nextTick);
        endpoint.write('genOnOff', {onOff: 0, startUpOnOff: 0}, {disableResponse: true});
        await nextTick;
        // Queue content:
        // 1. empty
        // 2. ZCL write 'genOnOff' {onOff: 0, startUpOnOff: 0}
        // @ts-expect-error private
        expect(endpoint.pendingRequests.size).toStrictEqual(2);
        result1 = endpoint.write('genOnOff', {onOff: 0}, {disableResponse: true});
        await new Promise(process.nextTick);
        // Queue content:
        // 1. empty
        // 2. ZCL write 'genOnOff' {startUpOnOff: 0}
        // 3. ZCL write 'genOnOff' {onOff: 0} --> result1
        // @ts-expect-error private
        expect(endpoint.pendingRequests.size).toStrictEqual(3);
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(2);

        //add another non-ZCL request, should go directly to queue without errors
        // @ts-expect-error private
        const result6 = endpoint.sendRequest(
            // @ts-expect-error mock
            5,
            [],
            () => {
                throw new Error(`1`);
            },
        );
        await new Promise(process.nextTick);
        // Queue content:
        // 1. empty
        // 2. ZCL write 'genOnOff' {startUpOnOff: 0}
        // 3. ZCL write 'genOnOff' {onOff: 0}
        // 4. add 1
        // @ts-expect-error private
        expect(endpoint.pendingRequests.size).toStrictEqual(4);
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(2);

        let error = null;
        try {
            // Add the same ZCL request with different payload again, the first one should be rejected and removed from the queue
            result2 = endpoint.write('genOnOff', {onOff: 1}, {disableResponse: true});
            await expect(await result1).rejects.toBe('asas');
        } catch (e) {
            error = e;
            // Queue content:
            // 1. empty
            // 2. ZCL write 'genOnOff' {startUpOnOff: 0}
            // 3. add 1
            // 4. ZCL write 'genOnOff' {onOff: 1} --> result2
            // @ts-expect-error private
            expect(endpoint.pendingRequests.size).toStrictEqual(4);
        }
        // Now add the same ZCL request with same payload again. The previous one should *not* be rejected but removed from the queue
        const result3 = endpoint.write('genOnOff', {onOff: 1}, {disableResponse: true});
        await new Promise(process.nextTick);
        // Queue content:
        // 1. empty
        // 2. ZCL write 'genOnOff' {startUpOnOff: 0}
        // 3. add 1
        // 4. ZCL write 'genOnOff' {onOff: 1} --> result2, result3
        // @ts-expect-error private
        expect(endpoint.pendingRequests.size).toStrictEqual(4);

        // writeUndiv request should not be divided, so both should go to the queue
        endpoint.write('genOnOff', {onOff: 0, startUpOnOff: 0}, {disableResponse: true, writeUndiv: true});
        await new Promise(process.nextTick);
        endpoint.write('genOnOff', {startUpOnOff: 1}, {disableResponse: true, writeUndiv: true});
        await new Promise(process.nextTick);
        // Queue content:
        // 1. empty
        // 2. ZCL write 'genOnOff' {startUpOnOff: 0}
        // 3. add 1
        // 4. ZCL write 'genOnOff' {onOff: 1} --> result2, result3
        // 5. ZCL writeUndiv 'genOnOff' {onOff: 0, startUpOnOff: 0}
        // 6. ZCL writeUndiv 'genOnOff' {startUpOnOff: 1}
        // @ts-expect-error private
        expect(endpoint.pendingRequests.size).toStrictEqual(6);

        // read requests should be combined to one
        const result4 = endpoint.read('genOnOff', ['onOff'], {disableResponse: false});
        await new Promise(process.nextTick);
        const result5 = endpoint.read('genOnOff', ['onOff'], {disableResponse: false});
        await new Promise(process.nextTick);
        // Queue content:
        // 1. empty
        // 2. ZCL write 'genOnOff' {startUpOnOff: 0}
        // 3. add 1
        // 4. ZCL write 'genOnOff' {onOff: 1} --> result2, result3
        // 5. ZCL writeUndiv 'genOnOff' {onOff: 0, startUpOnOff: 0}
        // 6. ZCL writeUndiv 'genOnOff' {startUpOnOff: 1}
        // 7. ZCL read 'genOnOff' --> result4, result5
        // @ts-expect-error private
        expect(endpoint.pendingRequests.size).toStrictEqual(7);
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(8);

        // Implicit checkin, there are 5 ZclFrames and 2 other requests left in the queue:
        const buffer = Buffer.from([24, 169, 10, 0, 0, 24, 1]);
        const frame = Zcl.Frame.fromBuffer(Zcl.Utils.getCluster('msOccupancySensing', undefined, {}).ID, Zcl.Header.fromBuffer(buffer), buffer, {});
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            address: '0x129',
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: 1,
            linkquality: 50,
            groupID: 1,
        });

        await expect(result4).resolves.toStrictEqual({onTime: 3});
        await expect(result5).resolves.toStrictEqual({onTime: 3});
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(13);
        expect(mocksendZclFrameToEndpoint.mock.calls[8][3].payload).toStrictEqual([{attrData: 0, attrId: 16387, dataType: 48}]);
        expect(mocksendZclFrameToEndpoint.mock.calls[9][3].payload).toStrictEqual([{attrData: 1, attrId: 0, dataType: 16}]);
        expect(mocksendZclFrameToEndpoint.mock.calls[10][3].payload).toStrictEqual([
            {attrData: 0, attrId: 0, dataType: 16},
            {attrData: 0, attrId: 16387, dataType: 48},
        ]);
        expect(mocksendZclFrameToEndpoint.mock.calls[11][3].payload).toStrictEqual([{attrData: 1, attrId: 16387, dataType: 48}]);
    });

    it('Write to device with pendingRequestTimeout > 0, discard messages after expiration', async () => {
        let updatedMockedDate = new Date(mockedDate);
        updatedMockedDate.setSeconds(updatedMockedDate.getSeconds() + 1000);
        vi.setSystemTime(updatedMockedDate);
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 174, ieeeAddr: '0x174'});
        const device = controller.getDeviceByIeeeAddr('0x174')!;
        MOCK_DEVICES[174]!.attributes![1].checkinInterval = 3996; //999 seconds

        await device.interview();
        const endpoint = device.getEndpoint(1)!;
        expect(device.checkinInterval).toBe(999);
        expect(device.pendingRequestTimeout).toBe(999000);
        mocksendZclFrameToEndpoint.mockClear();
        mocksendZclFrameToEndpoint.mockImplementationOnce(async () => {
            throw new Error('Dogs barking too hard');
        });

        // We need to send the data after it's been queued, but before we await
        // the promise. Hijacking queueRequest seems easiest.
        // @ts-expect-error private
        const origQueueRequest = endpoint.pendingRequests.queue;
        // @ts-expect-error private
        endpoint.pendingRequests.queue = async (req) => {
            // @ts-expect-error private
            const f = origQueueRequest.call(endpoint.pendingRequests, req);
            const buffer = Buffer.from([24, 169, 10, 0, 0, 24, 1]);
            const frame = Zcl.Frame.fromBuffer(
                Zcl.Utils.getCluster('msOccupancySensing', undefined, {}).ID,
                Zcl.Header.fromBuffer(buffer),
                buffer,
                {},
            );
            await mockAdapterEvents['zclPayload']({
                wasBroadcast: false,
                address: 174,
                clusterID: frame.cluster.ID,
                data: frame.toBuffer(),
                header: frame.header,
                endpoint: 1,
                linkquality: 50,
                groupID: 1,
            });
            return f;
        };

        // @ts-expect-error private
        endpoint.pendingRequests.add(
            // @ts-expect-error mock
            new Request(async () => {}, {}, 100),
        );
        const result = endpoint.write('genOnOff', {onOff: 10}, {disableResponse: true});
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(1);

        updatedMockedDate.setSeconds(updatedMockedDate.getSeconds() + 1001000);
        vi.setSystemTime(updatedMockedDate);
        let error = null;
        try {
            await result;
        } catch (e) {
            error = e;
        }
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(1);
        // @ts-expect-error private
        expect(endpoint.pendingRequests.size).toBe(0);
    });

    it('Implicit checkin while send already in progress', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 174, ieeeAddr: '0x174'});
        const device = controller.getDeviceByIeeeAddr('0x174')!;
        await device.interview();
        mocksendZclFrameToEndpoint.mockClear();
        mocksendZclFrameToEndpoint.mockImplementationOnce(() => {
            throw new Error('dogs barking too hard');
        });
        const endpoint = device.getEndpoint(1)!;
        // @ts-expect-error private
        const origQueueRequest = endpoint.pendingRequests.queue;
        // @ts-expect-error private
        endpoint.pendingRequests.queue = async (req) => {
            // @ts-expect-error private
            const f = origQueueRequest.call(endpoint.pendingRequests, req);
            vi.advanceTimersByTime(10);
            return f;
        };
        // @ts-expect-error private
        endpoint.pendingRequests.add(
            new Request(
                async () => {
                    await endpoint.sendPendingRequests(false);
                },
                // @ts-expect-error mock
                {},
                100,
            ),
        );
        const nextTick = new Promise(process.nextTick);
        const result = endpoint.write('genOnOff', {onOff: 10}, {disableResponse: true});
        await nextTick;
        await endpoint.sendPendingRequests(false);
        await result;
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(2);
        // @ts-expect-error private
        expect(endpoint.pendingRequests.size).toBe(0);
    });

    it('Write to device with pendingRequestTimeout > 0, send bulk messages', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 174, ieeeAddr: '0x174'});
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x174')!;
        await device.interview();
        const endpoint = device.getEndpoint(1)!;
        mocksendZclFrameToEndpoint.mockClear();
        mocksendZclFrameToEndpoint.mockReturnValueOnce(null);

        // onZclData is called via mockAdapterEvents, but we need to wait until it has finished
        const origOnZclData = device.onZclData;
        device.onZclData = async (a, b, c) => {
            const f = origOnZclData.call(device, a, b, c);
            vi.advanceTimersByTime(10);
            return f;
        };
        const nextTick = new Promise(process.nextTick);

        const result = endpoint.write('genOnOff', {onOff: 1}, {disableResponse: true, sendPolicy: 'bulk'});
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(0);

        const buffer = Buffer.from([24, 169, 10, 0, 0, 24, 1]);
        let frame = Zcl.Frame.fromBuffer(Zcl.Utils.getCluster('msOccupancySensing', undefined, {}).ID, Zcl.Header.fromBuffer(buffer), buffer, {});
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            address: 174,
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: 1,
            linkquality: 50,
            groupID: 1,
        });

        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(0);

        frame = Zcl.Frame.create(
            Zcl.FrameType.SPECIFIC,
            Zcl.Direction.SERVER_TO_CLIENT,
            true,
            1,
            1,
            'checkin',
            Zcl.Utils.getCluster('genPollCtrl', undefined, {}).ID,
            {},
            {},
        );
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            address: 174,
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: 1,
            linkquality: 52,
            groupID: undefined,
        });

        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(3);

        const checkinrsp = mocksendZclFrameToEndpoint.mock.calls[0];
        expect(checkinrsp[0]).toBe('0x174');
        expect(checkinrsp[1]).toBe(174);
        expect(checkinrsp[2]).toBe(1);
        expect(checkinrsp[3].cluster.name).toBe('genPollCtrl');
        expect(checkinrsp[3].command.name).toBe('checkinRsp');
        expect(checkinrsp[3].payload).toStrictEqual({startFastPolling: true, fastPollTimeout: 0});

        expect(await result).toBe(undefined);

        const cmd = mocksendZclFrameToEndpoint.mock.calls[1];
        expect(cmd[0]).toBe('0x174');
        expect(cmd[1]).toBe(174);
        expect(cmd[2]).toBe(1);
        expect(cmd[3].cluster.name).toBe('genOnOff');

        await nextTick;
        expect(mocksendZclFrameToEndpoint).toHaveBeenCalledTimes(3);
        const fastpollstop = mocksendZclFrameToEndpoint.mock.calls[2];
        expect(fastpollstop[0]).toBe('0x174');
        expect(fastpollstop[1]).toBe(174);
        expect(fastpollstop[2]).toBe(1);
        expect(fastpollstop[3].cluster.name).toBe('genPollCtrl');
        expect(fastpollstop[3].command.name).toBe('fastPollStop');
        expect(fastpollstop[3].payload).toStrictEqual({});
    });

    it('Handle retransmitted Xiaomi messages', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 175, ieeeAddr: '0x175'});
        await mockAdapterEvents['deviceJoined']({networkAddress: 171, ieeeAddr: '0x171'});

        const frame = Zcl.Frame.create(0, 0, true, undefined, 40, 0, 1, [{attrId: 0}, {attrId: 9999}], {});
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            address: 175,
            // Attrid 9999 does not exist in ZCL
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: 1,
            linkquality: 19,
            groupID: 171,
        });

        const expected = {
            type: 'read',
            device: {
                ID: 3,
                _applicationVersion: 2,
                _dateCode: '201901',
                _pendingRequestTimeout: 0,
                _customClusters: {},
                _endpoints: [
                    {
                        deviceID: 5,
                        inputClusters: [0, 1, 2],
                        outputClusters: [2],
                        profileID: 99,
                        ID: 1,
                        clusters: {},
                        deviceIeeeAddress: '0x171',
                        deviceNetworkAddress: 171,
                        _binds: [],
                        _configuredReportings: [],
                        _events: {},
                        _eventsCount: 0,
                        meta: {},
                        pendingRequests: {ID: 1, deviceIeeeAddress: '0x171', sendInProgress: false},
                    },
                    {
                        inputClusters: [],
                        outputClusters: [],
                        ID: 2,
                        clusters: {},
                        deviceIeeeAddress: '0x171',
                        deviceNetworkAddress: 171,
                        _binds: [],
                        _configuredReportings: [],
                        _events: {},
                        _eventsCount: 0,
                        meta: {},
                        pendingRequests: {ID: 2, deviceIeeeAddress: '0x171', sendInProgress: false},
                    },
                    {
                        inputClusters: [],
                        outputClusters: [],
                        ID: 3,
                        clusters: {},
                        deviceIeeeAddress: '0x171',
                        deviceNetworkAddress: 171,
                        _binds: [],
                        _configuredReportings: [],
                        _events: {},
                        _eventsCount: 0,
                        meta: {},
                        pendingRequests: {ID: 3, deviceIeeeAddress: '0x171', sendInProgress: false},
                    },
                    {
                        inputClusters: [],
                        outputClusters: [],
                        ID: 4,
                        clusters: {},
                        deviceIeeeAddress: '0x171',
                        deviceNetworkAddress: 171,
                        _binds: [],
                        _configuredReportings: [],
                        _events: {},
                        _eventsCount: 0,
                        meta: {},
                        pendingRequests: {ID: 4, deviceIeeeAddress: '0x171', sendInProgress: false},
                    },
                    {
                        inputClusters: [],
                        outputClusters: [],
                        ID: 5,
                        clusters: {},
                        deviceIeeeAddress: '0x171',
                        deviceNetworkAddress: 171,
                        _binds: [],
                        _configuredReportings: [],
                        _events: {},
                        _eventsCount: 0,
                        meta: {},
                        pendingRequests: {ID: 5, deviceIeeeAddress: '0x171', sendInProgress: false},
                    },
                    {
                        inputClusters: [],
                        outputClusters: [],
                        ID: 6,
                        clusters: {},
                        deviceIeeeAddress: '0x171',
                        deviceNetworkAddress: 171,
                        _binds: [],
                        _configuredReportings: [],
                        _events: {},
                        _eventsCount: 0,
                        meta: {},
                        pendingRequests: {ID: 6, deviceIeeeAddress: '0x171', sendInProgress: false},
                    },
                ],
                _events: {},
                _eventsCount: 0,
                _hardwareVersion: 3,
                _ieeeAddr: '0x171',
                _interviewCompleted: true,
                _interviewing: false,
                _lastSeen: Date.now(),
                _manufacturerID: 1212,
                _manufacturerName: 'Xioami',
                _modelID: 'lumi.remote.b286opcn01',
                _networkAddress: 171,
                _powerSource: 'Mains (single phase)',
                _softwareBuildID: '1.01',
                _stackVersion: 101,
                _type: 'EndDevice',
                _zclVersion: 1,
                _linkquality: 19,
                _skipDefaultResponse: false,
                meta: {},
            },
            endpoint: {
                deviceID: 5,
                inputClusters: [0, 1, 2],
                outputClusters: [2],
                profileID: 99,
                ID: 1,
                clusters: {},
                deviceIeeeAddress: '0x171',
                deviceNetworkAddress: 171,
                _binds: [],
                _configuredReportings: [],
                _events: {},
                _eventsCount: 0,
                meta: {},
                pendingRequests: {ID: 1, deviceIeeeAddress: '0x171', sendInProgress: false},
            },
            data: ['mainsVoltage', 9999],
            linkquality: 19,
            groupID: 171,
            cluster: 'genPowerCfg',
            meta: {
                zclTransactionSequenceNumber: 40,
                frameControl: {reservedBits: 0, frameType: 0, direction: 0, disableDefaultResponse: true, manufacturerSpecific: false},
            },
        };
        expect(events.message.length).toBe(1);
        expect(deepClone(events.message[0])).toStrictEqual(expected);
    });

    it('Shouldnt throw error on coordinatorCheck when adapter doesnt support backups', async () => {
        mockAdapterSupportsBackup.mockReturnValue(false);
        await controller.start();
        await expect(controller.coordinatorCheck()).rejects.toHaveProperty(
            'message',
            `Coordinator does not coordinator check because it doesn't support backups`,
        );
    });

    it('Should do a coordinator check', async () => {
        mockAdapterSupportsBackup.mockReturnValue(true);
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const result = await controller.coordinatorCheck();
        expect(result.missingRouters.length).toBe(1);
        expect(result.missingRouters[0].ieeeAddr).toBe('0x129');
    });

    // ZCLFrame with manufacturer specific flag and manufacturer code defined, to generic device
    // ZCLFrameConverter should not modify specific frames!
    it('Should resolve manufacturer specific cluster attribute names on specific ZCL frames: generic target device', async () => {
        const buffer = Buffer.from([28, 33, 16, 13, 1, 2, 240, 0, 48, 4]);
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});

        const frame = Zcl.Frame.fromBuffer(
            Zcl.Utils.getCluster('closuresWindowCovering', undefined, {}).ID,
            Zcl.Header.fromBuffer(buffer),
            buffer,
            {},
        );
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            address: '0x129',
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: 1,
            linkquality: 50,
            groupID: 0,
        });
        expect(events.message.length).toBe(1);
        expect(events.message[0].data).toMatchObject({calibrationMode: 4});
        expect(events.message[0].data).not.toMatchObject({tuyaMotorReversal: 4});
    });

    // ZCLFrame with manufacturer specific flag and manufacturer code defined, to specific device
    // ZCLFrameConverter should not modify specific frames!
    it('Should resolve manufacturer specific cluster attribute names on specific ZCL frames: specific target device', async () => {
        const buffer = Buffer.from([28, 33, 16, 13, 1, 2, 240, 0, 48, 4]);
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 177, ieeeAddr: '0x177'});
        const frame = Zcl.Frame.fromBuffer(
            Zcl.Utils.getCluster('closuresWindowCovering', undefined, {}).ID,
            Zcl.Header.fromBuffer(buffer),
            buffer,
            {},
        );
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            address: '0x177',
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: 1,
            linkquality: 50,
            groupID: 0,
        });
        expect(events.message.length).toBe(1);
        expect(events.message[0].data).toMatchObject({calibrationMode: 4});
        expect(events.message[0].data).not.toMatchObject({tuyaMotorReversal: 4});
    });

    // ZCLFrame without manufacturer specific flag or manufacturer code set, to generic device
    it('Should resolve generic cluster attribute names on generic ZCL frames: generic target device', async () => {
        const buffer = Buffer.from([24, 242, 10, 2, 240, 48, 4]);
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const frame = Zcl.Frame.fromBuffer(
            Zcl.Utils.getCluster('closuresWindowCovering', undefined, {}).ID,
            Zcl.Header.fromBuffer(buffer),
            buffer,
            {},
        );
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            address: '0x129',
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: 1,
            linkquality: 50,
            groupID: 0,
        });
        expect(events.message.length).toBe(1);
        expect(events.message[0].data).toMatchObject({tuyaMotorReversal: 4});
        expect(events.message[0].data).not.toMatchObject({calibrationMode: 4});
    });

    // ZCLFrame without manufacturer specific flag set or manufacturer code set, to specific device (Legrand only)
    it('Should resolve manufacturer specific cluster attribute names on generic ZCL frames: Legrand target device', async () => {
        const buffer = Buffer.from([24, 242, 10, 2, 240, 48, 4]);
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 177, ieeeAddr: '0x177'});
        const frame = Zcl.Frame.fromBuffer(
            Zcl.Utils.getCluster('closuresWindowCovering', undefined, {}).ID,
            Zcl.Header.fromBuffer(buffer),
            buffer,
            {},
        );
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            address: '0x177',
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: 1,
            linkquality: 50,
            groupID: 0,
        });
        expect(events.message.length).toBe(1);
        expect(events.message[0].data).toMatchObject({calibrationMode: 4});
        expect(events.message[0].data).not.toMatchObject({tuyaMotorReversal: 4});
    });

    it('zclCommand', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        mocksendZclFrameToEndpoint.mockReturnValueOnce(null);
        let error;
        try {
            await endpoint.zclCommand('genOnOff', 'discover', {startAttrId: 1, maxAttrIds: 255});
        } catch (e) {
            error = e;
        }
        expect(error).toBeUndefined();
    });

    it('zclCommand with error', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        const device = controller.getDeviceByIeeeAddr('0x129')!;
        const endpoint = device.getEndpoint(1)!;
        console.log(endpoint);
        mocksendZclFrameToEndpoint.mockRejectedValueOnce(new Error('timeout occurred'));
        let error;
        try {
            await endpoint.zclCommand('genOnOff', 'discover', {startAttrId: 1, maxAttrIds: 255});
        } catch (e) {
            error = e;
        }
        expect(error).toStrictEqual(
            new Error(
                `ZCL command 0x129/1 genOnOff.discover({"startAttrId":1,"maxAttrIds":255}, {"timeout":10000,"disableResponse":false,"disableRecovery":false,"disableDefaultResponse":true,"direction":0,"reservedBits":0,"writeUndiv":false}) failed (timeout occurred)`,
            ),
        );
    });

    it('Interview on coordinator', async () => {
        await controller.start();
        mockAdapterSendZdo.mockClear();
        const device = controller.getDeviceByNetworkAddress(ZSpec.COORDINATOR_ADDRESS)!;
        const deviceNodeDescSpy = vi.spyOn(device, 'updateNodeDescriptor');

        await device.interview(true);

        expect(deviceNodeDescSpy).toHaveBeenCalledTimes(1);
        expect(mockAdapterSendZdo).toHaveBeenCalledTimes(4); // nodeDesc + activeEp + simpleDesc x2
    });

    it('Device node descriptor fails', async () => {
        await controller.start();
        mockAdapterSendZdo.mockClear();
        const device = controller.getDeviceByNetworkAddress(ZSpec.COORDINATOR_ADDRESS)!;
        sendZdoResponseStatus = Zdo.Status.INSUFFICIENT_SPACE;

        await expect(device.updateNodeDescriptor()).rejects.toThrow(`Status 'INSUFFICIENT_SPACE'`);
        expect(mockAdapterSendZdo).toHaveBeenCalledTimes(1);
    });

    it('Device active endpoints fails', async () => {
        await controller.start();
        mockAdapterSendZdo.mockClear();
        const device = controller.getDeviceByNetworkAddress(ZSpec.COORDINATOR_ADDRESS)!;
        sendZdoResponseStatus = Zdo.Status.INSUFFICIENT_SPACE;

        await expect(device.updateActiveEndpoints()).rejects.toThrow(`Status 'INSUFFICIENT_SPACE'`);
        expect(mockAdapterSendZdo).toHaveBeenCalledTimes(1);
    });

    it('Endpoint simple descriptor fails', async () => {
        await controller.start();
        mockAdapterSendZdo.mockClear();
        const device = controller.getDeviceByNetworkAddress(ZSpec.COORDINATOR_ADDRESS)!;
        const endpoint = device.getEndpoint(1)!;
        sendZdoResponseStatus = Zdo.Status.INSUFFICIENT_SPACE;

        await expect(endpoint.updateSimpleDescriptor()).rejects.toThrow(`Status 'INSUFFICIENT_SPACE'`);
        expect(mockAdapterSendZdo).toHaveBeenCalledTimes(1);
    });

    it('Node Descriptor on R21 device', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 162, ieeeAddr: '0x162'});

        expect(mockLogger.info).toHaveBeenCalledWith(
            `Device '0x162' is only compliant to revision '21' of the ZigBee specification (current revision: ${ZSpec.ZIGBEE_REVISION}).`,
            `zh:controller:device`,
        );
    });

    it('Node Descriptor on R pre-21 device', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 161, ieeeAddr: '0x161'});

        expect(mockLogger.info).toHaveBeenCalledWith(
            `Device '0x161' is only compliant to revision 'pre-21' of the ZigBee specification (current revision: ${ZSpec.ZIGBEE_REVISION}).`,
            `zh:controller:device`,
        );
    });

    it('Device requests network address - unchanged', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        mockAdapterSendZdo.mockClear();
        const device = controller.getDeviceByNetworkAddress(129)!;
        expect(device.ieeeAddr).toStrictEqual('0x129');

        mockAdapterSendZdo.mockImplementationOnce(async () => {
            const zdoResponse = [
                Zdo.Status.SUCCESS,
                {
                    eui64: '0x129',
                    nwkAddress: 129,
                    startIndex: 0,
                    assocDevList: [],
                } as NetworkAddressResponse,
            ];

            await mockAdapterEvents['zdoResponse'](Zdo.ClusterId.NETWORK_ADDRESS_RESPONSE, zdoResponse);
            return zdoResponse;
        });

        await device.requestNetworkAddress();

        expect(mockAdapterSendZdo).toHaveBeenCalledTimes(1);
        const zdoPayload = Zdo.Buffalo.buildRequest(false, Zdo.ClusterId.NETWORK_ADDRESS_REQUEST, '0x129', false, 0);
        expect(mockAdapterSendZdo).toHaveBeenCalledWith(
            '0x129',
            ZSpec.BroadcastAddress.RX_ON_WHEN_IDLE,
            Zdo.ClusterId.NETWORK_ADDRESS_REQUEST,
            zdoPayload,
            true,
        );

        expect(controller.getDeviceByIeeeAddr('0x129')!.networkAddress).toBe(129);
    });

    it('Device requests network address - changed', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 129, ieeeAddr: '0x129'});
        mockAdapterSendZdo.mockClear();
        const device = controller.getDeviceByNetworkAddress(129)!;
        expect(device.ieeeAddr).toStrictEqual('0x129');

        mockAdapterSendZdo.mockImplementationOnce(async () => {
            const zdoResponse = [
                Zdo.Status.SUCCESS,
                {
                    eui64: '0x129',
                    nwkAddress: 9999,
                    startIndex: 0,
                    assocDevList: [],
                } as NetworkAddressResponse,
            ];

            await mockAdapterEvents['zdoResponse'](Zdo.ClusterId.NETWORK_ADDRESS_RESPONSE, zdoResponse);
            return zdoResponse;
        });

        await device.requestNetworkAddress();

        expect(mockAdapterSendZdo).toHaveBeenCalledTimes(1);
        const zdoPayload = Zdo.Buffalo.buildRequest(false, Zdo.ClusterId.NETWORK_ADDRESS_REQUEST, '0x129', false, 0);
        expect(mockAdapterSendZdo).toHaveBeenCalledWith(
            '0x129',
            ZSpec.BroadcastAddress.RX_ON_WHEN_IDLE,
            Zdo.ClusterId.NETWORK_ADDRESS_REQUEST,
            zdoPayload,
            true,
        );

        expect(controller.getDeviceByIeeeAddr('0x129')!.networkAddress).toBe(9999);
        expect(controller.getDeviceByIeeeAddr('0x129')!.getEndpoint(1)!.deviceNetworkAddress).toBe(9999);
        expect(controller.getDeviceByNetworkAddress(129)).toBeUndefined();
        expect(controller.getDeviceByNetworkAddress(9999)!.ieeeAddr).toStrictEqual('0x129');
    });

    it('Device remove from network fails', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 140, ieeeAddr: '0x140'});
        const device = controller.getDeviceByIeeeAddr('0x140')!;
        sendZdoResponseStatus = Zdo.Status.INVALID_INDEX;

        await expect(device.removeFromNetwork()).rejects.toThrow(`Status 'INVALID_INDEX'`);

        const zdoPayload = Zdo.Buffalo.buildRequest(false, Zdo.ClusterId.LEAVE_REQUEST, '0x140', Zdo.LeaveRequestFlags.WITHOUT_REJOIN);
        expect(mockAdapterSendZdo).toHaveBeenCalledWith('0x140', 140, Zdo.ClusterId.LEAVE_REQUEST, zdoPayload, false);
        expect(controller.getDeviceByIeeeAddr('0x140')).toBeDefined();
    });

    it('Device LQI table fails', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 140, ieeeAddr: '0x140'});
        const device = controller.getDeviceByIeeeAddr('0x140')!;
        sendZdoResponseStatus = Zdo.Status.INVALID_INDEX;

        await expect(device.lqi()).rejects.toThrow(`Status 'INVALID_INDEX'`);

        const zdoPayload = Zdo.Buffalo.buildRequest(false, Zdo.ClusterId.LQI_TABLE_REQUEST, 0);
        expect(mockAdapterSendZdo).toHaveBeenCalledWith('0x140', 140, Zdo.ClusterId.LQI_TABLE_REQUEST, zdoPayload, false);
        expect(controller.getDeviceByIeeeAddr('0x140')).toBeDefined();
    });

    it('Device routing table fails', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 140, ieeeAddr: '0x140'});
        const device = controller.getDeviceByIeeeAddr('0x140')!;
        sendZdoResponseStatus = Zdo.Status.INVALID_INDEX;

        await expect(device.routingTable()).rejects.toThrow(`Status 'INVALID_INDEX'`);

        const zdoPayload = Zdo.Buffalo.buildRequest(false, Zdo.ClusterId.ROUTING_TABLE_REQUEST, 0);
        expect(mockAdapterSendZdo).toHaveBeenCalledWith('0x140', 140, Zdo.ClusterId.ROUTING_TABLE_REQUEST, zdoPayload, false);
        expect(controller.getDeviceByIeeeAddr('0x140')).toBeDefined();
    });

    it('Device LQI table with more than 1 request', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 140, ieeeAddr: '0x140'});
        const device = controller.getDeviceByIeeeAddr('0x140')!;
        mockAdapterSendZdo
            .mockImplementationOnce(() => {
                return [
                    Zdo.Status.SUCCESS,
                    {
                        neighborTableEntries: 3,
                        startIndex: 0,
                        entryList: [
                            {...LQI_TABLE_ENTRY_DEFAULTS, eui64: '0x160', nwkAddress: 160, lqi: 20, relationship: 2, depth: 5},
                            {...LQI_TABLE_ENTRY_DEFAULTS, eui64: '0x170', nwkAddress: 170, lqi: 21, relationship: 4, depth: 8},
                        ],
                    },
                ];
            })
            .mockImplementationOnce(() => {
                return [
                    Zdo.Status.SUCCESS,
                    {
                        neighborTableEntries: 3,
                        startIndex: 2,
                        entryList: [{...LQI_TABLE_ENTRY_DEFAULTS, eui64: '0x180', nwkAddress: 180, lqi: 200, relationship: 4, depth: 2}],
                    },
                ];
            });

        const result = await device.lqi();
        expect(result).toStrictEqual({
            neighbors: [
                {ieeeAddr: '0x160', networkAddress: 160, linkquality: 20, relationship: 2, depth: 5},
                {ieeeAddr: '0x170', networkAddress: 170, linkquality: 21, relationship: 4, depth: 8},
                {ieeeAddr: '0x180', networkAddress: 180, linkquality: 200, relationship: 4, depth: 2},
            ],
        });
    });

    it('Device routing table with more than 1 request', async () => {
        await controller.start();
        await mockAdapterEvents['deviceJoined']({networkAddress: 140, ieeeAddr: '0x140'});
        const device = controller.getDeviceByIeeeAddr('0x140')!;
        mockAdapterSendZdo
            .mockImplementationOnce(() => {
                return [
                    Zdo.Status.SUCCESS,
                    {
                        routingTableEntries: 3,
                        startIndex: 0,
                        entryList: [
                            {...ROUTING_TABLE_ENTRY_DEFAULTS, destinationAddress: 120, status: 'ACTIVE', nextHopAddress: 1},
                            {...ROUTING_TABLE_ENTRY_DEFAULTS, destinationAddress: 130, status: 'DISCOVERY_FAILED', nextHopAddress: 2},
                        ],
                    },
                ];
            })
            .mockImplementationOnce(() => {
                return [
                    Zdo.Status.SUCCESS,
                    {
                        routingTableEntries: 3,
                        startIndex: 2,
                        entryList: [{...ROUTING_TABLE_ENTRY_DEFAULTS, destinationAddress: 140, status: 'INACTIVE', nextHopAddress: 3}],
                    },
                ];
            });

        const result = await device.routingTable();
        expect(result).toStrictEqual({
            table: [
                {destinationAddress: 120, status: 'ACTIVE', nextHop: 1},
                {destinationAddress: 130, status: 'DISCOVERY_FAILED', nextHop: 2},
                {destinationAddress: 140, status: 'INACTIVE', nextHop: 3},
            ],
        });
    });

    it('Adapter permitJoin fails during stop', async () => {
        await controller.start();
        mockAdapterPermitJoin.mockRejectedValueOnce('timeout');
        await controller.stop();

        expect(mockLogger.error).toHaveBeenCalledWith(`Failed to disable join on stop: timeout`, 'zh:controller');
    });

    it('Adapter stop fails after adapter disconnected', async () => {
        await controller.start();
        mockAdapterStop.mockRejectedValueOnce('timeout');
        await mockAdapterEvents['disconnected']();

        expect(mockLogger.error).toHaveBeenCalledWith(`Failed to stop adapter on disconnect: timeout`, 'zh:controller');
    });

    it('Device network address changed while Z2M was offline, received no notification on start', async () => {
        const oldNwkAddress = 40369;
        const newNwkAddress = 12345;
        const database = `
        {"id":1,"type":"Coordinator","ieeeAddr":"0x0000012300000000","nwkAddr":0,"manufId":0,"epList":[11,6,5,4,3,2,1],"endpoints":{"1":{"profId":260,"epId":1,"devId":5,"inClusterList":[],"meta":{},"outClusterList":[],"clusters":{}},"2":{"profId":257,"epId":2,"devId":5,"inClusterList":[],"meta":{},"outClusterList":[],"clusters":{}},"3":{"profId":261,"epId":3,"devId":5,"inClusterList":[],"meta":{},"outClusterList":[],"clusters":{}},"4":{"profId":263,"epId":4,"devId":5,"inClusterList":[],"meta":{},"outClusterList":[],"clusters":{}},"5":{"profId":264,"epId":5,"devId":5,"inClusterList":[],"meta":{},"outClusterList":[],"clusters":{}},"6":{"profId":265,"epId":6,"devId":5,"inClusterList":[],"meta":{},"outClusterList":[],"clusters":{}},"11":{"profId":260,"epId":11,"devId":1024,"inClusterList":[],"meta":{},"outClusterList":[1280],"clusters":{}}},"interviewCompleted":false,"meta":{},"_id":"aM341ldunExFmJ3u"}
        {"id":3,"type":"Router","ieeeAddr":"0x000b57fffec6a5b2","nwkAddr":${oldNwkAddress},"manufId":4476,"manufName":"IKEA of Sweden","powerSource":"Mains (single phase)","modelId":"TRADFRI bulb E27 WS opal 980lm","epList":[1],"endpoints":{"1":{"profId":49246,"epId":1,"devId":544,"inClusterList":[0,3,4,5,6,8,768,2821,4096],"meta":{},"outClusterList":[5,25,32,4096],"clusters":{}}},"appVersion":17,"stackVersion":87,"hwVersion":1,"dateCode":"20170331","swBuildId":"1.2.217","zclVersion":1,"interviewCompleted":true,"meta":{"reporting":1},"_id":"pagvP2f9Bbj3o9TM"}
        `;
        fs.writeFileSync(options.databasePath, database);
        await controller.start();
        events.lastSeenChanged = [];
        events.deviceNetworkAddressChanged = [];

        const device = controller.getDeviceByIeeeAddr('0x000b57fffec6a5b2')!;
        expect(device.networkAddress).toStrictEqual(oldNwkAddress);

        mockAdapterSendZdo.mockImplementationOnce(async () => {
            const zdoResponse = [
                Zdo.Status.SUCCESS,
                {
                    eui64: '0x000b57fffec6a5b2',
                    nwkAddress: newNwkAddress,
                    startIndex: 0,
                    assocDevList: [],
                } as IEEEAddressResponse,
            ];

            await mockAdapterEvents['zdoResponse'](Zdo.ClusterId.IEEE_ADDRESS_RESPONSE, zdoResponse);
            return zdoResponse;
        });

        const frame = Zcl.Frame.create(0, 1, true, undefined, 10, 'readRsp', 0, [{attrId: 5, status: 0, dataType: 66, attrData: 'new.model.id'}], {});
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            address: newNwkAddress,
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: 1,
            linkquality: 50,
            groupID: 1,
        });

        expect(device.networkAddress).toStrictEqual(newNwkAddress);
        expect(device.modelID).toBe('new.model.id');
        expect(events.lastSeenChanged.length).toBe(2); // zdoResponse + zclPayload
        expect(events.lastSeenChanged[0].device.networkAddress).toBe(newNwkAddress);
        expect(events.deviceNetworkAddressChanged.length).toBe(1);
        expect(events.deviceNetworkAddressChanged[0].device.networkAddress).toBe(newNwkAddress);
    });

    it('Device network address changed while Z2M was running, received no notification', async () => {
        const oldNwkAddress = 40369;
        const newNwkAddress = 12345;
        const database = `
        {"id":1,"type":"Coordinator","ieeeAddr":"0x0000012300000000","nwkAddr":0,"manufId":0,"epList":[11,6,5,4,3,2,1],"endpoints":{"1":{"profId":260,"epId":1,"devId":5,"inClusterList":[],"meta":{},"outClusterList":[],"clusters":{}},"2":{"profId":257,"epId":2,"devId":5,"inClusterList":[],"meta":{},"outClusterList":[],"clusters":{}},"3":{"profId":261,"epId":3,"devId":5,"inClusterList":[],"meta":{},"outClusterList":[],"clusters":{}},"4":{"profId":263,"epId":4,"devId":5,"inClusterList":[],"meta":{},"outClusterList":[],"clusters":{}},"5":{"profId":264,"epId":5,"devId":5,"inClusterList":[],"meta":{},"outClusterList":[],"clusters":{}},"6":{"profId":265,"epId":6,"devId":5,"inClusterList":[],"meta":{},"outClusterList":[],"clusters":{}},"11":{"profId":260,"epId":11,"devId":1024,"inClusterList":[],"meta":{},"outClusterList":[1280],"clusters":{}}},"interviewCompleted":false,"meta":{},"_id":"aM341ldunExFmJ3u"}
        {"id":4,"type":"EndDevice","ieeeAddr":"0x0017880104e45517","lastSeen":123,"nwkAddr":${oldNwkAddress},"manufId":4107,"manufName":"Philips","powerSource":"Battery","modelId":"RWL021","epList":[1,2],"endpoints":{"1":{"profId":49246,"epId":1,"devId":2096,"inClusterList":[0],"meta":{},"outClusterList":[0,3,4,6,8,5],"binds":[{"type":"endpoint","endpointID":1,"deviceIeeeAddr":"0x000b57fffec6a5b2"}],"configuredReportings":[{"cluster":1,"attrId":0,"minRepIntval":1,"maxRepIntval":20,"repChange":2}],"clusters":{"genBasic":{"dir":{"value":3},"attrs":{"modelId":"RWL021"}}}},"2":{"profId":260,"epId":2,"devId":12,"inClusterList":[0,1,3,15,64512],"meta":{},"outClusterList":[25],"clusters":{}}},"appVersion":2,"stackVersion":1,"hwVersion":1,"dateCode":"20160302","swBuildId":"5.45.1.17846","zclVersion":1,"interviewCompleted":true,"meta":{"configured":1},"_id":"qxhymbX6H2GXDw8Z"}
        `;
        fs.writeFileSync(options.databasePath, database);
        await controller.start();
        events.lastSeenChanged = [];
        events.deviceNetworkAddressChanged = [];

        const device = controller.getDeviceByIeeeAddr('0x0017880104e45517')!;
        expect(device.networkAddress).toStrictEqual(oldNwkAddress);

        mockAdapterSendZdo.mockImplementationOnce(async () => {
            const zdoResponse = [
                Zdo.Status.SUCCESS,
                {
                    eui64: '0x0017880104e45517',
                    nwkAddress: newNwkAddress,
                    startIndex: 0,
                    assocDevList: [],
                } as IEEEAddressResponse,
            ];

            await mockAdapterEvents['zdoResponse'](Zdo.ClusterId.IEEE_ADDRESS_RESPONSE, zdoResponse);
            return zdoResponse;
        });

        const frame = Zcl.Frame.create(0, 1, true, undefined, 10, 'readRsp', 0, [{attrId: 5, status: 0, dataType: 66, attrData: 'new.model.id'}], {});
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            address: oldNwkAddress,
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: 1,
            linkquality: 50,
            groupID: 1,
        });

        expect(device.networkAddress).toStrictEqual(oldNwkAddress);
        expect(device.modelID).toBe('new.model.id');

        const frame2 = Zcl.Frame.create(
            0,
            1,
            true,
            undefined,
            10,
            'readRsp',
            0,
            [{attrId: 5, status: 0, dataType: 66, attrData: 'new.model.id2'}],
            {},
        );
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            address: newNwkAddress,
            clusterID: frame2.cluster.ID,
            data: frame2.toBuffer(),
            header: frame2.header,
            endpoint: 1,
            linkquality: 50,
            groupID: 1,
        });

        expect(device.networkAddress).toStrictEqual(newNwkAddress);
        expect(device.modelID).toBe('new.model.id2');
        expect(events.lastSeenChanged.length).toBe(3); // zdoResponse + zclPayload x2
        expect(events.lastSeenChanged[0].device.networkAddress).toBe(newNwkAddress);
        expect(events.deviceNetworkAddressChanged.length).toBe(1);
        expect(events.deviceNetworkAddressChanged[0].device.networkAddress).toBe(newNwkAddress);
    });

    it('Device network address changed while Z2M was offline - fails to retrieve new one', async () => {
        const oldNwkAddress = 40369;
        const newNwkAddress = 12345;
        const database = `
        {"id":1,"type":"Coordinator","ieeeAddr":"0x0000012300000000","nwkAddr":0,"manufId":0,"epList":[11,6,5,4,3,2,1],"endpoints":{"1":{"profId":260,"epId":1,"devId":5,"inClusterList":[],"meta":{},"outClusterList":[],"clusters":{}},"2":{"profId":257,"epId":2,"devId":5,"inClusterList":[],"meta":{},"outClusterList":[],"clusters":{}},"3":{"profId":261,"epId":3,"devId":5,"inClusterList":[],"meta":{},"outClusterList":[],"clusters":{}},"4":{"profId":263,"epId":4,"devId":5,"inClusterList":[],"meta":{},"outClusterList":[],"clusters":{}},"5":{"profId":264,"epId":5,"devId":5,"inClusterList":[],"meta":{},"outClusterList":[],"clusters":{}},"6":{"profId":265,"epId":6,"devId":5,"inClusterList":[],"meta":{},"outClusterList":[],"clusters":{}},"11":{"profId":260,"epId":11,"devId":1024,"inClusterList":[],"meta":{},"outClusterList":[1280],"clusters":{}}},"interviewCompleted":false,"meta":{},"_id":"aM341ldunExFmJ3u"}
        {"id":3,"type":"Router","ieeeAddr":"0x000b57fffec6a5b2","nwkAddr":${oldNwkAddress},"manufId":4476,"manufName":"IKEA of Sweden","powerSource":"Mains (single phase)","modelId":"TRADFRI bulb E27 WS opal 980lm","epList":[1],"endpoints":{"1":{"profId":49246,"epId":1,"devId":544,"inClusterList":[0,3,4,5,6,8,768,2821,4096],"meta":{},"outClusterList":[5,25,32,4096],"clusters":{}}},"appVersion":17,"stackVersion":87,"hwVersion":1,"dateCode":"20170331","swBuildId":"1.2.217","zclVersion":1,"interviewCompleted":true,"meta":{"reporting":1},"_id":"pagvP2f9Bbj3o9TM"}
        `;
        fs.writeFileSync(options.databasePath, database);
        await controller.start();
        events.lastSeenChanged = [];
        events.deviceNetworkAddressChanged = [];

        const device = controller.getDeviceByIeeeAddr('0x000b57fffec6a5b2')!;
        expect(device.networkAddress).toStrictEqual(oldNwkAddress);

        mockAdapterSendZdo.mockImplementationOnce(async () => {
            const zdoResponse = [Zdo.Status.INV_REQUESTTYPE, undefined];

            await mockAdapterEvents['zdoResponse'](Zdo.ClusterId.IEEE_ADDRESS_RESPONSE, zdoResponse);
            return zdoResponse;
        });

        const frame = Zcl.Frame.create(0, 1, true, undefined, 10, 'readRsp', 0, [{attrId: 5, status: 0, dataType: 66, attrData: 'new.model.id'}], {});
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            address: newNwkAddress,
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: 1,
            linkquality: 50,
            groupID: 1,
        });

        expect(device.networkAddress).toStrictEqual(oldNwkAddress);
        expect(device.modelID).toBe('TRADFRI bulb E27 WS opal 980lm');
        expect(mockLogger.debug).toHaveBeenCalledWith(
            `Failed to retrieve IEEE address for device '${newNwkAddress}': Error: Status 'INV_REQUESTTYPE'`,
            'zh:controller',
        );
        expect(events.lastSeenChanged.length).toBe(0);
        expect(events.deviceNetworkAddressChanged.length).toBe(0);
    });

    it('Device network address changed while Z2M was offline, no duplicate triggering of IEEE request', async () => {
        const oldNwkAddress = 40369;
        const newNwkAddress = 12345;
        const database = `
        {"id":1,"type":"Coordinator","ieeeAddr":"0x0000012300000000","nwkAddr":0,"manufId":0,"epList":[11,6,5,4,3,2,1],"endpoints":{"1":{"profId":260,"epId":1,"devId":5,"inClusterList":[],"meta":{},"outClusterList":[],"clusters":{}},"2":{"profId":257,"epId":2,"devId":5,"inClusterList":[],"meta":{},"outClusterList":[],"clusters":{}},"3":{"profId":261,"epId":3,"devId":5,"inClusterList":[],"meta":{},"outClusterList":[],"clusters":{}},"4":{"profId":263,"epId":4,"devId":5,"inClusterList":[],"meta":{},"outClusterList":[],"clusters":{}},"5":{"profId":264,"epId":5,"devId":5,"inClusterList":[],"meta":{},"outClusterList":[],"clusters":{}},"6":{"profId":265,"epId":6,"devId":5,"inClusterList":[],"meta":{},"outClusterList":[],"clusters":{}},"11":{"profId":260,"epId":11,"devId":1024,"inClusterList":[],"meta":{},"outClusterList":[1280],"clusters":{}}},"interviewCompleted":false,"meta":{},"_id":"aM341ldunExFmJ3u"}
        {"id":3,"type":"Router","ieeeAddr":"0x000b57fffec6a5b2","nwkAddr":${oldNwkAddress},"manufId":4476,"manufName":"IKEA of Sweden","powerSource":"Mains (single phase)","modelId":"TRADFRI bulb E27 WS opal 980lm","epList":[1],"endpoints":{"1":{"profId":49246,"epId":1,"devId":544,"inClusterList":[0,3,4,5,6,8,768,2821,4096],"meta":{},"outClusterList":[5,25,32,4096],"clusters":{}}},"appVersion":17,"stackVersion":87,"hwVersion":1,"dateCode":"20170331","swBuildId":"1.2.217","zclVersion":1,"interviewCompleted":true,"meta":{"reporting":1},"_id":"pagvP2f9Bbj3o9TM"}
        `;
        fs.writeFileSync(options.databasePath, database);
        await controller.start();
        events.lastSeenChanged = [];
        events.deviceNetworkAddressChanged = [];
        mockAdapterSendZdo.mockClear();
        const identifyUnknownDeviceSpy = vi.spyOn(controller, 'identifyUnknownDevice');

        const device = controller.getDeviceByIeeeAddr('0x000b57fffec6a5b2')!;
        expect(device.networkAddress).toStrictEqual(oldNwkAddress);

        const frame = Zcl.Frame.create(0, 1, true, undefined, 10, 'readRsp', 0, [{attrId: 5, status: 0, dataType: 66, attrData: 'new.model.id'}], {});
        const zclPayload = {
            wasBroadcast: false,
            address: newNwkAddress,
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: 1,
            linkquality: 50,
            groupID: 1,
        };

        mockAdapterSendZdo.mockImplementationOnce(async () => {
            await mockAdapterEvents['zclPayload'](zclPayload);

            const zdoResponse = [
                Zdo.Status.SUCCESS,
                {
                    eui64: '0x000b57fffec6a5b2',
                    nwkAddress: newNwkAddress,
                    startIndex: 0,
                    assocDevList: [],
                } as IEEEAddressResponse,
            ];

            await mockAdapterEvents['zdoResponse'](Zdo.ClusterId.IEEE_ADDRESS_RESPONSE, zdoResponse);
            return zdoResponse;
        });

        await mockAdapterEvents['zclPayload'](zclPayload);

        expect(device.networkAddress).toStrictEqual(newNwkAddress);
        expect(device.modelID).toBe('new.model.id');
        expect(identifyUnknownDeviceSpy).toHaveBeenCalledTimes(2);
        expect(mockAdapterSendZdo).toHaveBeenCalledTimes(1);
        expect(events.lastSeenChanged.length).toBe(2); // zdoResponse + zclPayload (second ignored)
        expect(events.lastSeenChanged[0].device.networkAddress).toBe(newNwkAddress);
        expect(events.deviceNetworkAddressChanged.length).toBe(1);
        expect(events.deviceNetworkAddressChanged[0].device.networkAddress).toBe(newNwkAddress);
    });

    it('Device network address changed while Z2M was offline, no spamming of IEEE request when device doesnt respond', async () => {
        const nwkAddress = 40369;
        await controller.start();
        events.lastSeenChanged = [];
        events.deviceNetworkAddressChanged = [];
        mockAdapterSendZdo.mockClear();
        mockAdapterSendZdo.mockRejectedValueOnce(new Error('timeout'));
        const identifyUnknownDeviceSpy = vi.spyOn(controller, 'identifyUnknownDevice');

        const frame = Zcl.Frame.create(0, 1, true, undefined, 10, 'readRsp', 0, [{attrId: 5, status: 0, dataType: 66, attrData: 'new.model.id'}], {});
        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            address: nwkAddress,
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: 1,
            linkquality: 50,
            groupID: 1,
        });

        expect(mockAdapterSendZdo).toHaveBeenCalledTimes(1);
        expect(identifyUnknownDeviceSpy).toHaveBeenCalledTimes(1);
        expect(mockLogger.debug).toHaveBeenCalledWith(`Failed to retrieve IEEE address for device '${nwkAddress}': Error: timeout`, 'zh:controller');

        await mockAdapterEvents['zclPayload']({
            wasBroadcast: false,
            address: nwkAddress,
            clusterID: frame.cluster.ID,
            data: frame.toBuffer(),
            header: frame.header,
            endpoint: 1,
            linkquality: 50,
            groupID: 1,
        });

        expect(mockAdapterSendZdo).toHaveBeenCalledTimes(1);
        expect(identifyUnknownDeviceSpy).toHaveBeenCalledTimes(2);
        expect(events.lastSeenChanged.length).toBe(0);
        expect(events.deviceNetworkAddressChanged.length).toBe(0);
    });
});

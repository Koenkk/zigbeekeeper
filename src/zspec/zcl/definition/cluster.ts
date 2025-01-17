/* eslint max-len: 0 */

import {BuffaloZclDataType, DataType, ParameterCondition} from './enums';
import {ManufacturerCode} from './manufacturerCode';
import {Status} from './status';
import {ClusterDefinition, ClusterName} from './tstype';

export const Clusters: Readonly<Record<ClusterName, Readonly<ClusterDefinition>>> = {
    genBasic: {
        ID: 0,
        attributes: {
            zclVersion: {ID: 0, type: DataType.UINT8},
            appVersion: {ID: 1, type: DataType.UINT8},
            stackVersion: {ID: 2, type: DataType.UINT8},
            hwVersion: {ID: 3, type: DataType.UINT8},
            manufacturerName: {ID: 4, type: DataType.CHAR_STR},
            modelId: {ID: 5, type: DataType.CHAR_STR},
            dateCode: {ID: 6, type: DataType.CHAR_STR},
            powerSource: {ID: 7, type: DataType.ENUM8},
            appProfileVersion: {ID: 8, type: DataType.ENUM8},
            genericDeviceType: {ID: 9, type: DataType.ENUM8},
            productCode: {ID: 10, type: DataType.OCTET_STR},
            productUrl: {ID: 11, type: DataType.CHAR_STR},
            manufacturerVersionDetails: {ID: 12, type: DataType.CHAR_STR},
            serialNumber: {ID: 13, type: DataType.CHAR_STR},
            productLabel: {ID: 14, type: DataType.CHAR_STR},
            locationDesc: {ID: 16, type: DataType.CHAR_STR},
            physicalEnv: {ID: 17, type: DataType.ENUM8},
            deviceEnabled: {ID: 18, type: DataType.BOOLEAN},
            alarmMask: {ID: 19, type: DataType.BITMAP8},
            disableLocalConfig: {ID: 20, type: DataType.BITMAP8},
            swBuildId: {ID: 0x4000, type: DataType.CHAR_STR},
            schneiderMeterRadioPower: {ID: 0xe200, type: DataType.INT8, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
        },
        commands: {
            resetFactDefault: {
                ID: 0,
                parameters: [],
            },
            tuyaSetup: {
                ID: 0xf0,
                parameters: [],
            },
        },
        commandsResponse: {},
    },
    genPowerCfg: {
        ID: 1,
        attributes: {
            mainsVoltage: {ID: 0, type: DataType.UINT16},
            mainsFrequency: {ID: 1, type: DataType.UINT8},
            mainsAlarmMask: {ID: 16, type: DataType.BITMAP8},
            mainsVoltMinThres: {ID: 17, type: DataType.UINT16},
            mainsVoltMaxThres: {ID: 18, type: DataType.UINT16},
            mainsVoltageDwellTripPoint: {ID: 19, type: DataType.UINT16},
            batteryVoltage: {ID: 32, type: DataType.UINT8},
            batteryPercentageRemaining: {ID: 33, type: DataType.UINT8},
            batteryManufacturer: {ID: 48, type: DataType.CHAR_STR},
            batterySize: {ID: 49, type: DataType.ENUM8},
            batteryAHrRating: {ID: 50, type: DataType.UINT16},
            batteryQuantity: {ID: 51, type: DataType.UINT8},
            batteryRatedVoltage: {ID: 52, type: DataType.UINT8},
            batteryAlarmMask: {ID: 53, type: DataType.BITMAP8},
            batteryVoltMinThres: {ID: 54, type: DataType.UINT8},
            batteryVoltThres1: {ID: 55, type: DataType.UINT8},
            batteryVoltThres2: {ID: 56, type: DataType.UINT8},
            batteryVoltThres3: {ID: 57, type: DataType.UINT8},
            batteryPercentMinThres: {ID: 58, type: DataType.UINT8},
            batteryPercentThres1: {ID: 59, type: DataType.UINT8},
            batteryPercentThres2: {ID: 60, type: DataType.UINT8},
            batteryPercentThres3: {ID: 61, type: DataType.UINT8},
            batteryAlarmState: {ID: 62, type: DataType.BITMAP32},
        },
        commands: {},
        commandsResponse: {},
    },
    genDeviceTempCfg: {
        ID: 2,
        attributes: {
            currentTemperature: {ID: 0, type: DataType.INT16},
            minTempExperienced: {ID: 1, type: DataType.INT16},
            maxTempExperienced: {ID: 2, type: DataType.INT16},
            overTempTotalDwell: {ID: 3, type: DataType.UINT16},
            devTempAlarmMask: {ID: 16, type: DataType.BITMAP8},
            lowTempThres: {ID: 17, type: DataType.INT16},
            highTempThres: {ID: 18, type: DataType.INT16},
            lowTempDwellTripPoint: {ID: 19, type: DataType.UINT24},
            highTempDwellTripPoint: {ID: 20, type: DataType.UINT24},
        },
        commands: {},
        commandsResponse: {},
    },
    genIdentify: {
        ID: 3,
        attributes: {
            identifyTime: {ID: 0, type: DataType.UINT16},
            identifyCommissionState: {ID: 1, type: DataType.UNKNOWN},
        },
        commands: {
            identify: {
                ID: 0,
                parameters: [{name: 'identifytime', type: DataType.UINT16}],
            },
            identifyQuery: {
                ID: 1,
                parameters: [],
            },
            ezmodeInvoke: {
                ID: 2,
                parameters: [{name: 'action', type: DataType.UINT8}],
            },
            updateCommissionState: {
                ID: 3,
                parameters: [
                    {name: 'action', type: DataType.UINT8},
                    {name: 'commstatemask', type: DataType.UINT8},
                ],
            },
            triggerEffect: {
                ID: 64,
                parameters: [
                    {name: 'effectid', type: DataType.UINT8},
                    {name: 'effectvariant', type: DataType.UINT8},
                ],
            },
        },
        commandsResponse: {
            identifyQueryRsp: {
                ID: 0,
                parameters: [{name: 'timeout', type: DataType.UINT16}],
            },
        },
    },
    genGroups: {
        ID: 4,
        attributes: {
            nameSupport: {ID: 0, type: DataType.BITMAP8},
        },
        commands: {
            add: {
                ID: 0,
                response: 0,
                parameters: [
                    {name: 'groupid', type: DataType.UINT16},
                    {name: 'groupname', type: DataType.CHAR_STR},
                ],
            },
            view: {
                ID: 1,
                response: 1,
                parameters: [{name: 'groupid', type: DataType.UINT16}],
            },
            getMembership: {
                ID: 2,
                response: 2,
                parameters: [
                    {name: 'groupcount', type: DataType.UINT8},
                    {name: 'grouplist', type: BuffaloZclDataType.LIST_UINT16},
                ],
            },
            remove: {
                ID: 3,
                response: 3,
                parameters: [{name: 'groupid', type: DataType.UINT16}],
            },
            removeAll: {
                ID: 4,
                parameters: [],
            },
            addIfIdentifying: {
                ID: 5,
                parameters: [
                    {name: 'groupid', type: DataType.UINT16},
                    {name: 'groupname', type: DataType.CHAR_STR},
                ],
            },
            miboxerSetZones: {
                ID: 0xf0,
                parameters: [{name: 'zones', type: BuffaloZclDataType.LIST_MIBOXER_ZONES}],
            },
        },
        commandsResponse: {
            addRsp: {
                ID: 0,
                parameters: [
                    {name: 'status', type: DataType.UINT8},
                    {name: 'groupid', type: DataType.UINT16},
                ],
            },
            viewRsp: {
                ID: 1,
                parameters: [
                    {name: 'status', type: DataType.UINT8},
                    {name: 'groupid', type: DataType.UINT16},
                    {name: 'groupname', type: DataType.CHAR_STR},
                ],
            },
            getMembershipRsp: {
                ID: 2,
                parameters: [
                    {name: 'capacity', type: DataType.UINT8},
                    {name: 'groupcount', type: DataType.UINT8},
                    {name: 'grouplist', type: BuffaloZclDataType.LIST_UINT16},
                ],
            },
            removeRsp: {
                ID: 3,
                parameters: [
                    {name: 'status', type: DataType.UINT8},
                    {name: 'groupid', type: DataType.UINT16},
                ],
            },
        },
    },
    genScenes: {
        ID: 5,
        attributes: {
            count: {ID: 0, type: DataType.UINT8},
            currentScene: {ID: 1, type: DataType.UINT8},
            currentGroup: {ID: 2, type: DataType.UINT16},
            sceneValid: {ID: 3, type: DataType.BOOLEAN},
            nameSupport: {ID: 4, type: DataType.BITMAP8},
            lastCfgBy: {ID: 5, type: DataType.IEEE_ADDR},
        },
        commands: {
            add: {
                ID: 0,
                response: 0,
                parameters: [
                    {name: 'groupid', type: DataType.UINT16},
                    {name: 'sceneid', type: DataType.UINT8},
                    {name: 'transtime', type: DataType.UINT16},
                    {name: 'scenename', type: DataType.CHAR_STR},
                    {name: 'extensionfieldsets', type: BuffaloZclDataType.EXTENSION_FIELD_SETS},
                ],
            },
            view: {
                ID: 1,
                response: 1,
                parameters: [
                    {name: 'groupid', type: DataType.UINT16},
                    {name: 'sceneid', type: DataType.UINT8},
                ],
            },
            remove: {
                ID: 2,
                response: 2,
                parameters: [
                    {name: 'groupid', type: DataType.UINT16},
                    {name: 'sceneid', type: DataType.UINT8},
                ],
            },
            removeAll: {
                ID: 3,
                response: 3,
                parameters: [{name: 'groupid', type: DataType.UINT16}],
            },
            store: {
                ID: 4,
                response: 4,
                parameters: [
                    {name: 'groupid', type: DataType.UINT16},
                    {name: 'sceneid', type: DataType.UINT8},
                ],
            },
            recall: {
                ID: 5,
                parameters: [
                    {name: 'groupid', type: DataType.UINT16},
                    {name: 'sceneid', type: DataType.UINT8},
                ],
            },
            getSceneMembership: {
                ID: 6,
                response: 6,
                parameters: [{name: 'groupid', type: DataType.UINT16}],
            },
            enhancedAdd: {
                ID: 64,
                response: 64,
                parameters: [
                    {name: 'groupid', type: DataType.UINT16},
                    {name: 'sceneid', type: DataType.UINT8},
                    {name: 'transtime', type: DataType.UINT16},
                    {name: 'scenename', type: DataType.CHAR_STR},
                    {name: 'extensionfieldsets', type: BuffaloZclDataType.EXTENSION_FIELD_SETS},
                ],
            },
            enhancedView: {
                ID: 65,
                response: 65,
                parameters: [
                    {name: 'groupid', type: DataType.UINT16},
                    {name: 'sceneid', type: DataType.UINT8},
                ],
            },
            copy: {
                ID: 66,
                response: 66,
                parameters: [
                    {name: 'mode', type: DataType.UINT8},
                    {name: 'groupidfrom', type: DataType.UINT16},
                    {name: 'sceneidfrom', type: DataType.UINT8},
                    {name: 'groupidto', type: DataType.UINT16},
                    {name: 'sceneidto', type: DataType.UINT8},
                ],
            },
            tradfriArrowSingle: {
                ID: 7,
                parameters: [
                    {name: 'value', type: DataType.UINT16},
                    {name: 'value2', type: DataType.UINT16},
                ],
            },
            tradfriArrowHold: {
                ID: 8,
                parameters: [{name: 'value', type: DataType.UINT16}],
            },
            tradfriArrowRelease: {
                ID: 9,
                parameters: [{name: 'value', type: DataType.UINT16}],
            },
        },
        commandsResponse: {
            addRsp: {
                ID: 0,
                parameters: [
                    {name: 'status', type: DataType.UINT8},
                    {name: 'groupId', type: DataType.UINT16},
                    {name: 'sceneId', type: DataType.UINT8},
                ],
            },
            viewRsp: {
                ID: 1,
                parameters: [
                    {name: 'status', type: DataType.UINT8},
                    {name: 'groupid', type: DataType.UINT16},
                    {name: 'sceneid', type: DataType.UINT8},
                    {name: 'transtime', type: DataType.UINT16, conditions: [{type: ParameterCondition.STATUS_EQUAL, value: Status.SUCCESS}]},
                    {name: 'scenename', type: DataType.CHAR_STR, conditions: [{type: ParameterCondition.STATUS_EQUAL, value: Status.SUCCESS}]},
                    {
                        name: 'extensionfieldsets',
                        type: BuffaloZclDataType.EXTENSION_FIELD_SETS,
                        conditions: [{type: ParameterCondition.STATUS_EQUAL, value: Status.SUCCESS}],
                    },
                ],
            },
            removeRsp: {
                ID: 2,
                parameters: [
                    {name: 'status', type: DataType.UINT8},
                    {name: 'groupid', type: DataType.UINT16},
                    {name: 'sceneid', type: DataType.UINT8},
                ],
            },
            removeAllRsp: {
                ID: 3,
                parameters: [
                    {name: 'status', type: DataType.UINT8},
                    {name: 'groupid', type: DataType.UINT16},
                ],
            },
            storeRsp: {
                ID: 4,
                parameters: [
                    {name: 'status', type: DataType.UINT8},
                    {name: 'groupid', type: DataType.UINT16},
                    {name: 'sceneid', type: DataType.UINT8},
                ],
            },
            getSceneMembershipRsp: {
                ID: 6,
                parameters: [
                    {name: 'status', type: DataType.UINT8},
                    {name: 'capacity', type: DataType.UINT8},
                    {name: 'groupid', type: DataType.UINT16},
                    {name: 'scenecount', type: DataType.UINT8, conditions: [{type: ParameterCondition.STATUS_EQUAL, value: Status.SUCCESS}]},
                    {
                        name: 'scenelist',
                        type: BuffaloZclDataType.LIST_UINT8,
                        conditions: [{type: ParameterCondition.STATUS_EQUAL, value: Status.SUCCESS}],
                    },
                ],
            },
            enhancedAddRsp: {
                ID: 64,
                parameters: [
                    {name: 'status', type: DataType.UINT8},
                    {name: 'groupId', type: DataType.UINT16},
                    {name: 'sceneId', type: DataType.UINT8},
                ],
            },
            enhancedViewRsp: {
                ID: 65,
                parameters: [
                    {name: 'status', type: DataType.UINT8},
                    {name: 'groupid', type: DataType.UINT16},
                    {name: 'sceneid', type: DataType.UINT8},
                    {name: 'transtime', type: DataType.UINT16, conditions: [{type: ParameterCondition.STATUS_EQUAL, value: Status.SUCCESS}]},
                    {name: 'scenename', type: DataType.CHAR_STR, conditions: [{type: ParameterCondition.STATUS_EQUAL, value: Status.SUCCESS}]},
                    {
                        name: 'extensionfieldsets',
                        type: BuffaloZclDataType.EXTENSION_FIELD_SETS,
                        conditions: [{type: ParameterCondition.STATUS_EQUAL, value: Status.SUCCESS}],
                    },
                ],
            },
            copyRsp: {
                ID: 66,
                parameters: [
                    {name: 'status', type: DataType.UINT8},
                    {name: 'groupidfrom', type: DataType.UINT16},
                    {name: 'sceneidfrom', type: DataType.UINT8},
                ],
            },
        },
    },
    genOnOff: {
        ID: 6,
        attributes: {
            onOff: {ID: 0, type: DataType.BOOLEAN},
            globalSceneCtrl: {ID: 16384, type: DataType.BOOLEAN},
            onTime: {ID: 16385, type: DataType.UINT16},
            offWaitTime: {ID: 16386, type: DataType.UINT16},
            startUpOnOff: {ID: 16387, type: DataType.ENUM8},
            tuyaBacklightSwitch: {ID: 0x5000, type: DataType.ENUM8},
            tuyaBacklightMode: {ID: 0x8001, type: DataType.ENUM8},
            moesStartUpOnOff: {ID: 0x8002, type: DataType.ENUM8},
            tuyaOperationMode: {ID: 0x8004, type: DataType.ENUM8},
            elkoPreWarningTime: {ID: 0xe000, type: DataType.UINT16, manufacturerCode: ManufacturerCode.ADEO},
            elkoOnTimeReload: {ID: 0xe001, type: DataType.UINT32, manufacturerCode: ManufacturerCode.ADEO},
            elkoOnTimeReloadOptions: {ID: 0xe002, type: DataType.BITMAP8, manufacturerCode: ManufacturerCode.ADEO},
            nodonTransitionTime: {ID: 0x0001, type: DataType.UINT16, manufacturerCode: ManufacturerCode.NODON},
        },
        commands: {
            off: {
                ID: 0,
                parameters: [],
            },
            on: {
                ID: 1,
                parameters: [],
            },
            toggle: {
                ID: 2,
                parameters: [],
            },
            offWithEffect: {
                ID: 64,
                parameters: [
                    {name: 'effectid', type: DataType.UINT8},
                    {name: 'effectvariant', type: DataType.UINT8},
                ],
            },
            onWithRecallGlobalScene: {
                ID: 65,
                parameters: [],
            },
            onWithTimedOff: {
                ID: 66,
                parameters: [
                    {name: 'ctrlbits', type: DataType.UINT8},
                    {name: 'ontime', type: DataType.UINT16},
                    {name: 'offwaittime', type: DataType.UINT16},
                ],
            },
            tuyaAction: {
                ID: 0xfd,
                parameters: [
                    {name: 'value', type: DataType.UINT8},
                    {name: 'data', type: BuffaloZclDataType.BUFFER},
                ],
            },
            tuyaAction2: {
                ID: 0xfc,
                parameters: [{name: 'value', type: DataType.UINT8}],
            },
        },
        commandsResponse: {},
    },
    genOnOffSwitchCfg: {
        ID: 7,
        attributes: {
            switchType: {ID: 0, type: DataType.ENUM8},
            switchMultiFunction: {ID: 2, type: DataType.UNKNOWN},
            switchActions: {ID: 16, type: DataType.ENUM8},
        },
        commands: {},
        commandsResponse: {},
    },
    genLevelCtrl: {
        ID: 8,
        attributes: {
            currentLevel: {ID: 0, type: DataType.UINT8},
            remainingTime: {ID: 1, type: DataType.UINT16},
            minLevel: {ID: 2, type: DataType.UINT8},
            maxLevel: {ID: 3, type: DataType.UINT8},
            options: {ID: 15, type: DataType.BITMAP8},
            onOffTransitionTime: {ID: 16, type: DataType.UINT16},
            onLevel: {ID: 17, type: DataType.UINT8},
            onTransitionTime: {ID: 18, type: DataType.UINT16},
            offTransitionTime: {ID: 19, type: DataType.UINT16},
            defaultMoveRate: {ID: 20, type: DataType.UINT16},
            startUpCurrentLevel: {ID: 16384, type: DataType.UINT8},
            elkoStartUpCurrentLevel: {ID: 0x4000, type: DataType.UINT8, manufacturerCode: ManufacturerCode.ADEO},
        },
        commands: {
            moveToLevel: {
                ID: 0,
                parameters: [
                    {name: 'level', type: DataType.UINT8},
                    {name: 'transtime', type: DataType.UINT16},
                ],
            },
            move: {
                ID: 1,
                parameters: [
                    {name: 'movemode', type: DataType.UINT8},
                    {name: 'rate', type: DataType.UINT8},
                ],
            },
            step: {
                ID: 2,
                parameters: [
                    {name: 'stepmode', type: DataType.UINT8},
                    {name: 'stepsize', type: DataType.UINT8},
                    {name: 'transtime', type: DataType.UINT16},
                ],
            },
            stop: {
                ID: 3,
                parameters: [],
            },
            moveToLevelWithOnOff: {
                ID: 4,
                parameters: [
                    {name: 'level', type: DataType.UINT8},
                    {name: 'transtime', type: DataType.UINT16},
                ],
            },
            moveWithOnOff: {
                ID: 5,
                parameters: [
                    {name: 'movemode', type: DataType.UINT8},
                    {name: 'rate', type: DataType.UINT8},
                ],
            },
            stepWithOnOff: {
                ID: 6,
                parameters: [
                    {name: 'stepmode', type: DataType.UINT8},
                    {name: 'stepsize', type: DataType.UINT8},
                    {name: 'transtime', type: DataType.UINT16},
                ],
            },
            stopWithOnOff: {
                ID: 7,
                parameters: [],
            },
            moveToLevelTuya: {
                ID: 240,
                parameters: [
                    {name: 'level', type: DataType.UINT16},
                    {name: 'transtime', type: DataType.UINT16},
                ],
            },
        },
        commandsResponse: {},
    },
    genAlarms: {
        ID: 9,
        attributes: {
            alarmCount: {ID: 0, type: DataType.UINT16},
        },
        commands: {
            reset: {
                ID: 0,
                parameters: [
                    {name: 'alarmcode', type: DataType.UINT8},
                    {name: 'clusterid', type: DataType.UINT16},
                ],
            },
            resetAll: {
                ID: 1,
                parameters: [],
            },
            getAlarm: {
                ID: 2,
                parameters: [],
            },
            resetLog: {
                ID: 3,
                parameters: [],
            },
            publishEventLog: {
                ID: 4,
                parameters: [],
            },
        },
        commandsResponse: {
            alarm: {
                ID: 0,
                parameters: [
                    {name: 'alarmcode', type: DataType.UINT8},
                    {name: 'clusterid', type: DataType.UINT16},
                ],
            },
            getRsp: {
                ID: 1,
                parameters: [
                    {name: 'status', type: DataType.UINT8},
                    {name: 'alarmcode', type: DataType.UINT8},
                    {name: 'clusterid', type: DataType.UINT16},
                    {name: 'timestamp', type: DataType.UINT32},
                ],
            },
            getEventLog: {
                ID: 2,
                parameters: [],
            },
        },
    },
    genTime: {
        ID: 10,
        attributes: {
            time: {ID: 0, type: DataType.UTC},
            timeStatus: {ID: 1, type: DataType.BITMAP8},
            timeZone: {ID: 2, type: DataType.INT32},
            dstStart: {ID: 3, type: DataType.UINT32},
            dstEnd: {ID: 4, type: DataType.UINT32},
            dstShift: {ID: 5, type: DataType.INT32},
            standardTime: {ID: 6, type: DataType.UINT32},
            localTime: {ID: 7, type: DataType.UINT32},
            lastSetTime: {ID: 8, type: DataType.UTC},
            validUntilTime: {ID: 9, type: DataType.UTC},
        },
        commands: {},
        commandsResponse: {},
    },
    genRssiLocation: {
        ID: 11,
        attributes: {
            type: {ID: 0, type: DataType.DATA8},
            method: {ID: 1, type: DataType.ENUM8},
            age: {ID: 2, type: DataType.UINT16},
            qualityMeasure: {ID: 3, type: DataType.UINT8},
            numOfDevices: {ID: 4, type: DataType.UINT8},
            coordinate1: {ID: 16, type: DataType.INT16},
            coordinate2: {ID: 17, type: DataType.INT16},
            coordinate3: {ID: 18, type: DataType.INT16},
            power: {ID: 19, type: DataType.INT16},
            pathLossExponent: {ID: 20, type: DataType.UINT16},
            reportingPeriod: {ID: 21, type: DataType.UINT16},
            calcPeriod: {ID: 22, type: DataType.UINT16},
            numRSSIMeasurements: {ID: 23, type: DataType.UINT16},
        },
        commands: {
            setAbsolute: {
                ID: 0,
                parameters: [
                    {name: 'coord1', type: DataType.INT16},
                    {name: 'coord2', type: DataType.INT16},
                    {name: 'coord3', type: DataType.INT16},
                    {name: 'power', type: DataType.INT16},
                    {name: 'pathlossexponent', type: DataType.UINT16},
                ],
            },
            setDevCfg: {
                ID: 1,
                parameters: [
                    {name: 'power', type: DataType.INT16},
                    {name: 'pathlossexponent', type: DataType.UINT16},
                    {name: 'calperiod', type: DataType.UINT16},
                    {name: 'numrssimeasurements', type: DataType.UINT8},
                    {name: 'reportingperiod', type: DataType.UINT16},
                ],
            },
            getDevCfg: {
                ID: 2,
                parameters: [{name: 'targetaddr', type: DataType.IEEE_ADDR}],
            },
            getData: {
                ID: 3,
                parameters: [
                    {name: 'getdatainfo', type: DataType.UINT8},
                    {name: 'numrsp', type: DataType.UINT8},
                    {name: 'targetaddr', type: DataType.IEEE_ADDR},
                ],
            },
        },
        commandsResponse: {
            devCfgRsp: {
                ID: 0,
                parameters: [
                    {name: 'status', type: DataType.UINT8},
                    {name: 'power', type: DataType.INT16},
                    {name: 'pathlossexp', type: DataType.UINT16},
                    {name: 'calperiod', type: DataType.UINT16},
                    {name: 'numrssimeasurements', type: DataType.UINT8},
                    {name: 'reportingperiod', type: DataType.UINT16},
                ],
            },
            dataRsp: {
                ID: 1,
                parameters: [
                    {name: 'status', type: DataType.UINT8},
                    {name: 'locationtype', type: DataType.UINT8},
                    {name: 'coord1', type: DataType.INT16},
                    {name: 'coord2', type: DataType.INT16},
                    {name: 'coord3', type: DataType.INT16},
                    {name: 'power', type: DataType.INT16},
                    {name: 'pathlossexp', type: DataType.UINT16},
                    {name: 'locationmethod', type: DataType.UINT8},
                    {name: 'qualitymeasure', type: DataType.UINT8},
                    {name: 'locationage', type: DataType.UINT16},
                ],
            },
            dataNotif: {
                ID: 2,
                parameters: [
                    {name: 'locationtype', type: DataType.UINT8},
                    {name: 'coord1', type: DataType.INT16},
                    {name: 'coord2', type: DataType.INT16},
                    {name: 'coord3', type: DataType.INT16},
                    {name: 'power', type: DataType.INT16},
                    {name: 'pathlossexp', type: DataType.UINT16},
                    {name: 'locationmethod', type: DataType.UINT8},
                    {name: 'qualitymeasure', type: DataType.UINT8},
                    {name: 'locationage', type: DataType.UINT16},
                ],
            },
            compactDataNotif: {
                ID: 3,
                parameters: [
                    {name: 'locationtype', type: DataType.UINT8},
                    {name: 'coord1', type: DataType.INT16},
                    {name: 'coord2', type: DataType.INT16},
                    {name: 'coord3', type: DataType.INT16},
                    {name: 'qualitymeasure', type: DataType.UINT8},
                    {name: 'locationage', type: DataType.UINT16},
                ],
            },
            rssiPing: {
                ID: 4,
                parameters: [{name: 'locationtype', type: DataType.UINT8}],
            },
        },
    },
    genAnalogInput: {
        ID: 12,
        attributes: {
            description: {ID: 28, type: DataType.CHAR_STR},
            maxPresentValue: {ID: 65, type: DataType.SINGLE_PREC},
            minPresentValue: {ID: 69, type: DataType.SINGLE_PREC},
            outOfService: {ID: 81, type: DataType.BOOLEAN},
            presentValue: {ID: 85, type: DataType.SINGLE_PREC},
            reliability: {ID: 103, type: DataType.ENUM8},
            resolution: {ID: 106, type: DataType.SINGLE_PREC},
            statusFlags: {ID: 111, type: DataType.BITMAP8},
            engineeringUnits: {ID: 117, type: DataType.ENUM16},
            applicationType: {ID: 256, type: DataType.UINT32},
        },
        commands: {},
        commandsResponse: {},
    },
    genAnalogOutput: {
        ID: 13,
        attributes: {
            description: {ID: 28, type: DataType.CHAR_STR},
            maxPresentValue: {ID: 65, type: DataType.SINGLE_PREC},
            minPresentValue: {ID: 69, type: DataType.SINGLE_PREC},
            outOfService: {ID: 81, type: DataType.BOOLEAN},
            presentValue: {ID: 85, type: DataType.SINGLE_PREC},
            priorityArray: {ID: 87, type: DataType.ARRAY},
            reliability: {ID: 103, type: DataType.ENUM8},
            relinquishDefault: {ID: 104, type: DataType.SINGLE_PREC},
            resolution: {ID: 106, type: DataType.SINGLE_PREC},
            statusFlags: {ID: 111, type: DataType.BITMAP8},
            engineeringUnits: {ID: 117, type: DataType.ENUM16},
            applicationType: {ID: 256, type: DataType.UINT32},
        },
        commands: {},
        commandsResponse: {},
    },
    genAnalogValue: {
        ID: 14,
        attributes: {
            description: {ID: 28, type: DataType.CHAR_STR},
            outOfService: {ID: 81, type: DataType.BOOLEAN},
            presentValue: {ID: 85, type: DataType.SINGLE_PREC},
            priorityArray: {ID: 87, type: DataType.ARRAY},
            reliability: {ID: 103, type: DataType.ENUM8},
            relinquishDefault: {ID: 104, type: DataType.SINGLE_PREC},
            statusFlags: {ID: 111, type: DataType.BITMAP8},
            engineeringUnits: {ID: 117, type: DataType.ENUM16},
            applicationType: {ID: 256, type: DataType.UINT32},
        },
        commands: {},
        commandsResponse: {},
    },
    genBinaryInput: {
        ID: 15,
        attributes: {
            activeText: {ID: 4, type: DataType.CHAR_STR},
            description: {ID: 28, type: DataType.CHAR_STR},
            inactiveText: {ID: 46, type: DataType.CHAR_STR},
            outOfService: {ID: 81, type: DataType.BOOLEAN},
            polarity: {ID: 84, type: DataType.ENUM8},
            presentValue: {ID: 85, type: DataType.BOOLEAN},
            reliability: {ID: 103, type: DataType.ENUM8},
            statusFlags: {ID: 111, type: DataType.BITMAP8},
            applicationType: {ID: 256, type: DataType.UINT32},
        },
        commands: {},
        commandsResponse: {},
    },
    genBinaryOutput: {
        ID: 16,
        attributes: {
            activeText: {ID: 4, type: DataType.CHAR_STR},
            description: {ID: 28, type: DataType.CHAR_STR},
            inactiveText: {ID: 46, type: DataType.CHAR_STR},
            minimumOffTime: {ID: 66, type: DataType.UINT32},
            minimumOnTime: {ID: 67, type: DataType.UINT32},
            outOfService: {ID: 81, type: DataType.BOOLEAN},
            polarity: {ID: 84, type: DataType.ENUM8},
            presentValue: {ID: 85, type: DataType.BOOLEAN},
            priorityArray: {ID: 87, type: DataType.ARRAY},
            reliability: {ID: 103, type: DataType.ENUM8},
            relinquishDefault: {ID: 104, type: DataType.BOOLEAN},
            statusFlags: {ID: 111, type: DataType.BITMAP8},
            applicationType: {ID: 256, type: DataType.UINT32},
        },
        commands: {},
        commandsResponse: {},
    },
    genBinaryValue: {
        ID: 17,
        attributes: {
            activeText: {ID: 4, type: DataType.CHAR_STR},
            description: {ID: 28, type: DataType.CHAR_STR},
            inactiveText: {ID: 46, type: DataType.CHAR_STR},
            minimumOffTime: {ID: 66, type: DataType.UINT32},
            minimumOnTime: {ID: 67, type: DataType.UINT32},
            outOfService: {ID: 81, type: DataType.BOOLEAN},
            presentValue: {ID: 85, type: DataType.BOOLEAN},
            priorityArray: {ID: 87, type: DataType.ARRAY},
            reliability: {ID: 103, type: DataType.ENUM8},
            relinquishDefault: {ID: 104, type: DataType.BOOLEAN},
            statusFlags: {ID: 111, type: DataType.BITMAP8},
            applicationType: {ID: 256, type: DataType.UINT32},
        },
        commands: {},
        commandsResponse: {},
    },
    genMultistateInput: {
        ID: 18,
        attributes: {
            stateText: {ID: 14, type: DataType.ARRAY},
            description: {ID: 28, type: DataType.CHAR_STR},
            numberOfStates: {ID: 74, type: DataType.UINT16},
            outOfService: {ID: 81, type: DataType.BOOLEAN},
            presentValue: {ID: 85, type: DataType.UINT16},
            reliability: {ID: 103, type: DataType.ENUM8},
            statusFlags: {ID: 111, type: DataType.BITMAP8},
            applicationType: {ID: 256, type: DataType.UINT32},
        },
        commands: {},
        commandsResponse: {},
    },
    genMultistateOutput: {
        ID: 19,
        attributes: {
            stateText: {ID: 14, type: DataType.ARRAY},
            description: {ID: 28, type: DataType.CHAR_STR},
            numberOfStates: {ID: 74, type: DataType.UINT16},
            outOfService: {ID: 81, type: DataType.BOOLEAN},
            presentValue: {ID: 85, type: DataType.UINT16},
            priorityArray: {ID: 87, type: DataType.ARRAY},
            reliability: {ID: 103, type: DataType.ENUM8},
            relinquishDefault: {ID: 104, type: DataType.UINT16},
            statusFlags: {ID: 111, type: DataType.BITMAP8},
            applicationType: {ID: 256, type: DataType.UINT32},
        },
        commands: {},
        commandsResponse: {},
    },
    genMultistateValue: {
        ID: 20,
        attributes: {
            stateText: {ID: 14, type: DataType.ARRAY},
            description: {ID: 28, type: DataType.CHAR_STR},
            numberOfStates: {ID: 74, type: DataType.UINT16},
            outOfService: {ID: 81, type: DataType.BOOLEAN},
            presentValue: {ID: 85, type: DataType.UINT16},
            priorityArray: {ID: 87, type: DataType.ARRAY},
            reliability: {ID: 103, type: DataType.ENUM8},
            relinquishDefault: {ID: 104, type: DataType.UINT16},
            statusFlags: {ID: 111, type: DataType.BITMAP8},
            applicationType: {ID: 256, type: DataType.UINT32},
        },
        commands: {},
        commandsResponse: {},
    },
    genCommissioning: {
        ID: 21,
        attributes: {
            shortress: {ID: 0, type: DataType.UINT16},
            extendedPANId: {ID: 1, type: DataType.IEEE_ADDR},
            panId: {ID: 2, type: DataType.UINT16},
            channelmask: {ID: 3, type: DataType.BITMAP32},
            protocolVersion: {ID: 4, type: DataType.UINT8},
            stackProfile: {ID: 5, type: DataType.UINT8},
            startupControl: {ID: 6, type: DataType.ENUM8},
            trustCenterress: {ID: 16, type: DataType.IEEE_ADDR},
            trustCenterMasterKey: {ID: 17, type: DataType.SEC_KEY},
            networkKey: {ID: 18, type: DataType.SEC_KEY},
            useInsecureJoin: {ID: 19, type: DataType.BOOLEAN},
            preconfiguredLinkKey: {ID: 20, type: DataType.SEC_KEY},
            networkKeySeqNum: {ID: 21, type: DataType.UINT8},
            networkKeyType: {ID: 22, type: DataType.ENUM8},
            networkManagerress: {ID: 23, type: DataType.UINT16},
            scanAttempts: {ID: 32, type: DataType.UINT8},
            timeBetweenScans: {ID: 33, type: DataType.UINT16},
            rejoinInterval: {ID: 34, type: DataType.UINT16},
            maxRejoinInterval: {ID: 35, type: DataType.UINT16},
            indirectPollRate: {ID: 48, type: DataType.UINT16},
            parentRetryThreshold: {ID: 49, type: DataType.UINT8},
            concentratorFlag: {ID: 64, type: DataType.BOOLEAN},
            concentratorRus: {ID: 65, type: DataType.UINT8},
            concentratorDiscoveryTime: {ID: 66, type: DataType.UINT8},
        },
        commands: {
            restartDevice: {
                ID: 0,
                parameters: [
                    {name: 'options', type: DataType.UINT8},
                    {name: 'delay', type: DataType.UINT8},
                    {name: 'jitter', type: DataType.UINT8},
                ],
            },
            saveStartupParams: {
                ID: 1,
                parameters: [
                    {name: 'options', type: DataType.UINT8},
                    {name: 'index', type: DataType.UINT8},
                ],
            },
            restoreStartupParams: {
                ID: 2,
                parameters: [
                    {name: 'options', type: DataType.UINT8},
                    {name: 'index', type: DataType.UINT8},
                ],
            },
            resetStartupParams: {
                ID: 3,
                parameters: [
                    {name: 'options', type: DataType.UINT8},
                    {name: 'index', type: DataType.UINT8},
                ],
            },
        },
        commandsResponse: {
            restartDeviceRsp: {
                ID: 0,
                parameters: [{name: 'status', type: DataType.UINT8}],
            },
            saveStartupParamsRsp: {
                ID: 1,
                parameters: [{name: 'status', type: DataType.UINT8}],
            },
            restoreStartupParamsRsp: {
                ID: 2,
                parameters: [{name: 'status', type: DataType.UINT8}],
            },
            resetStartupParamsRsp: {
                ID: 3,
                parameters: [{name: 'status', type: DataType.UINT8}],
            },
        },
    },
    genOta: {
        ID: 25,
        attributes: {
            upgradeServerId: {ID: 0, type: DataType.IEEE_ADDR},
            fileOffset: {ID: 1, type: DataType.UINT32},
            currentFileVersion: {ID: 2, type: DataType.UINT32},
            currentZigbeeStackVersion: {ID: 3, type: DataType.UINT16},
            downloadedFileVersion: {ID: 4, type: DataType.UINT32},
            downloadedZigbeeStackVersion: {ID: 5, type: DataType.UINT16},
            imageUpgradeStatus: {ID: 6, type: DataType.ENUM8},
            manufacturerId: {ID: 7, type: DataType.UINT16},
            imageTypeId: {ID: 8, type: DataType.UINT16},
            minimumBlockReqDelay: {ID: 9, type: DataType.UINT16},
            imageStamp: {ID: 10, type: DataType.UINT32},
        },
        commands: {
            queryNextImageRequest: {
                ID: 1,
                response: 2,
                parameters: [
                    {name: 'fieldControl', type: DataType.UINT8},
                    {name: 'manufacturerCode', type: DataType.UINT16},
                    {name: 'imageType', type: DataType.UINT16},
                    {name: 'fileVersion', type: DataType.UINT32},
                ],
            },
            imageBlockRequest: {
                ID: 3,
                response: 5,
                parameters: [
                    {name: 'fieldControl', type: DataType.UINT8},
                    {name: 'manufacturerCode', type: DataType.UINT16},
                    {name: 'imageType', type: DataType.UINT16},
                    {name: 'fileVersion', type: DataType.UINT32},
                    {name: 'fileOffset', type: DataType.UINT32},
                    {name: 'maximumDataSize', type: DataType.UINT8},
                ],
            },
            imagePageRequest: {
                ID: 4,
                response: 5,
                parameters: [
                    {name: 'fieldControl', type: DataType.UINT8},
                    {name: 'manufacturerCode', type: DataType.UINT16},
                    {name: 'imageType', type: DataType.UINT16},
                    {name: 'fileVersion', type: DataType.UINT32},
                    {name: 'fileOffset', type: DataType.UINT32},
                    {name: 'maximumDataSize', type: DataType.UINT8},
                    {name: 'pageSize', type: DataType.UINT16},
                    {name: 'responseSpacing', type: DataType.UINT16},
                ],
            },
            upgradeEndRequest: {
                ID: 6,
                response: 7,
                parameters: [
                    {name: 'status', type: DataType.UINT8},
                    {name: 'manufacturerCode', type: DataType.UINT16},
                    {name: 'imageType', type: DataType.UINT16},
                    {name: 'fileVersion', type: DataType.UINT32},
                ],
            },
        },
        commandsResponse: {
            imageNotify: {
                ID: 0,
                parameters: [
                    {name: 'payloadType', type: DataType.UINT8},
                    {name: 'queryJitter', type: DataType.UINT8},
                ],
            },
            queryNextImageResponse: {
                ID: 2,
                parameters: [
                    {name: 'status', type: DataType.UINT8},
                    {name: 'manufacturerCode', type: DataType.UINT16, conditions: [{type: ParameterCondition.STATUS_EQUAL, value: Status.SUCCESS}]},
                    {name: 'imageType', type: DataType.UINT16, conditions: [{type: ParameterCondition.STATUS_EQUAL, value: Status.SUCCESS}]},
                    {name: 'fileVersion', type: DataType.UINT32, conditions: [{type: ParameterCondition.STATUS_EQUAL, value: Status.SUCCESS}]},
                    {name: 'imageSize', type: DataType.UINT32, conditions: [{type: ParameterCondition.STATUS_EQUAL, value: Status.SUCCESS}]},
                ],
            },
            imageBlockResponse: {
                ID: 5,
                parameters: [
                    {name: 'status', type: DataType.UINT8},
                    {name: 'manufacturerCode', type: DataType.UINT16},
                    {name: 'imageType', type: DataType.UINT16},
                    {name: 'fileVersion', type: DataType.UINT32},
                    {name: 'fileOffset', type: DataType.UINT32},
                    {name: 'dataSize', type: DataType.UINT8},
                    {name: 'data', type: BuffaloZclDataType.BUFFER},
                ],
            },
            upgradeEndResponse: {
                ID: 7,
                parameters: [
                    {name: 'manufacturerCode', type: DataType.UINT16},
                    {name: 'imageType', type: DataType.UINT16},
                    {name: 'fileVersion', type: DataType.UINT32},
                    {name: 'currentTime', type: DataType.UINT32},
                    {name: 'upgradeTime', type: DataType.UINT32},
                ],
            },
        },
    },
    genPollCtrl: {
        ID: 32,
        attributes: {
            checkinInterval: {ID: 0, type: DataType.UINT32},
            longPollInterval: {ID: 1, type: DataType.UINT32},
            shortPollInterval: {ID: 2, type: DataType.UINT16},
            fastPollTimeout: {ID: 3, type: DataType.UINT16},
            checkinIntervalMin: {ID: 4, type: DataType.UINT32},
            longPollIntervalMin: {ID: 5, type: DataType.UINT32},
            fastPollTimeoutMax: {ID: 6, type: DataType.UINT16},
        },
        commands: {
            checkinRsp: {
                ID: 0,
                parameters: [
                    {name: 'startFastPolling', type: DataType.BOOLEAN},
                    {name: 'fastPollTimeout', type: DataType.UINT16},
                ],
            },
            fastPollStop: {
                ID: 1,
                parameters: [],
            },
            setLongPollInterval: {
                ID: 2,
                parameters: [{name: 'newLongPollInterval', type: DataType.UINT32}],
            },
            setShortPollInterval: {
                ID: 3,
                parameters: [{name: 'newShortPollInterval', type: DataType.UINT16}],
            },
        },
        commandsResponse: {
            checkin: {
                ID: 0,
                parameters: [],
            },
        },
    },
    greenPower: {
        ID: 33,
        attributes: {},
        commands: {
            notification: {
                ID: 0,
                parameters: [
                    {name: 'options', type: DataType.UINT16},
                    {
                        name: 'srcID',
                        type: DataType.UINT32,
                        conditions: [{type: ParameterCondition.BITFIELD_ENUM, param: 'options', offset: 0, size: 3, value: 0b000}],
                    },
                    {
                        name: 'gpdIEEEAddr',
                        type: DataType.IEEE_ADDR,
                        conditions: [{type: ParameterCondition.BITFIELD_ENUM, param: 'options', offset: 0, size: 3, value: 0b010}],
                    },
                    {
                        name: 'gpdEndpoint',
                        type: DataType.UINT8,
                        conditions: [{type: ParameterCondition.BITFIELD_ENUM, param: 'options', offset: 0, size: 3, value: 0b010}],
                    },
                    {name: 'frameCounter', type: DataType.UINT32},
                    {name: 'commandID', type: DataType.UINT8},
                    {name: 'payloadSize', type: DataType.UINT8},
                    {name: 'commandFrame', type: BuffaloZclDataType.GDP_FRAME},
                    {name: 'gppNwkAddr', type: DataType.UINT16, conditions: [{type: ParameterCondition.BITMASK_SET, param: 'options', mask: 0x4000}]},
                    {name: 'gppGddLink', type: DataType.UINT8, conditions: [{type: ParameterCondition.BITMASK_SET, param: 'options', mask: 0x4000}]},
                ],
            },
            commissioningNotification: {
                ID: 4,
                parameters: [
                    {name: 'options', type: DataType.UINT16},
                    {
                        name: 'srcID',
                        type: DataType.UINT32,
                        conditions: [{type: ParameterCondition.BITFIELD_ENUM, param: 'options', offset: 0, size: 3, value: 0b000}],
                    },
                    {
                        name: 'gpdIEEEAddr',
                        type: DataType.IEEE_ADDR,
                        conditions: [{type: ParameterCondition.BITFIELD_ENUM, param: 'options', offset: 0, size: 3, value: 0b010}],
                    },
                    {
                        name: 'gpdEndpoint',
                        type: DataType.UINT8,
                        conditions: [{type: ParameterCondition.BITFIELD_ENUM, param: 'options', offset: 0, size: 3, value: 0b010}],
                    },
                    {name: 'frameCounter', type: DataType.UINT32},
                    {name: 'commandID', type: DataType.UINT8},
                    {name: 'payloadSize', type: DataType.UINT8},
                    {name: 'commandFrame', type: BuffaloZclDataType.GDP_FRAME},
                    {name: 'gppNwkAddr', type: DataType.UINT16, conditions: [{type: ParameterCondition.BITMASK_SET, param: 'options', mask: 0x800}]},
                    {name: 'gppGddLink', type: DataType.UINT8, conditions: [{type: ParameterCondition.BITMASK_SET, param: 'options', mask: 0x800}]},
                ],
            },
        },
        commandsResponse: {
            response: {
                ID: 6,
                parameters: [
                    {name: 'options', type: DataType.UINT8},
                    {name: 'tempMaster', type: DataType.UINT16},
                    {name: 'tempMasterTx', type: DataType.UINT8},
                    {
                        name: 'srcID',
                        type: DataType.UINT32,
                        conditions: [{type: ParameterCondition.BITFIELD_ENUM, param: 'options', offset: 0, size: 3, value: 0b000}],
                    },
                    {
                        name: 'gpdIEEEAddr',
                        type: DataType.IEEE_ADDR,
                        conditions: [{type: ParameterCondition.BITFIELD_ENUM, param: 'options', offset: 0, size: 3, value: 0b010}],
                    },
                    {
                        name: 'gpdEndpoint',
                        type: DataType.UINT8,
                        conditions: [{type: ParameterCondition.BITFIELD_ENUM, param: 'options', offset: 0, size: 3, value: 0b010}],
                    },
                    {name: 'gpdCmd', type: DataType.UINT8},
                    {name: 'gpdPayload', type: BuffaloZclDataType.GDP_FRAME},
                ],
            },
            pairing: {
                ID: 1,
                parameters: [
                    {name: 'options', type: DataType.UINT24},
                    {
                        name: 'srcID',
                        type: DataType.UINT32,
                        conditions: [{type: ParameterCondition.BITFIELD_ENUM, param: 'options', offset: 0, size: 3, value: 0b000}],
                    },
                    {
                        name: 'gpdIEEEAddr',
                        type: DataType.IEEE_ADDR,
                        conditions: [{type: ParameterCondition.BITFIELD_ENUM, param: 'options', offset: 0, size: 3, value: 0b010}],
                    },
                    {
                        name: 'gpdEndpoint',
                        type: DataType.UINT8,
                        conditions: [{type: ParameterCondition.BITFIELD_ENUM, param: 'options', offset: 0, size: 3, value: 0b010}],
                    },
                    {
                        name: 'sinkIEEEAddr',
                        type: DataType.IEEE_ADDR,
                        conditions: [{type: ParameterCondition.BITFIELD_ENUM, param: 'options', offset: 4, size: 3, value: 0b110}],
                    },
                    {
                        name: 'sinkIEEEAddr',
                        type: DataType.IEEE_ADDR,
                        conditions: [{type: ParameterCondition.BITFIELD_ENUM, param: 'options', offset: 4, size: 3, value: 0b000}],
                    },
                    {
                        name: 'sinkNwkAddr',
                        type: DataType.UINT16,
                        conditions: [{type: ParameterCondition.BITFIELD_ENUM, param: 'options', offset: 4, size: 3, value: 0b110}],
                    },
                    {
                        name: 'sinkNwkAddr',
                        type: DataType.UINT16,
                        conditions: [{type: ParameterCondition.BITFIELD_ENUM, param: 'options', offset: 4, size: 3, value: 0b000}],
                    },
                    {
                        name: 'sinkGroupID',
                        type: DataType.UINT16,
                        conditions: [{type: ParameterCondition.BITFIELD_ENUM, param: 'options', offset: 4, size: 3, value: 0b100}],
                    },
                    {
                        name: 'sinkGroupID',
                        type: DataType.UINT16,
                        conditions: [{type: ParameterCondition.BITFIELD_ENUM, param: 'options', offset: 4, size: 3, value: 0b010}],
                    },
                    {name: 'deviceID', type: DataType.UINT8, conditions: [{type: ParameterCondition.BITMASK_SET, param: 'options', mask: 0x0008}]},
                    {
                        name: 'frameCounter',
                        type: DataType.UINT32,
                        conditions: [{type: ParameterCondition.BITMASK_SET, param: 'options', mask: 0x4000}],
                    },
                    {name: 'gpdKey', type: DataType.SEC_KEY, conditions: [{type: ParameterCondition.BITMASK_SET, param: 'options', mask: 0x8000}]},
                ],
            },
            commisioningMode: {
                ID: 2,
                parameters: [
                    {name: 'options', type: DataType.UINT8},
                    {name: 'commisioningWindow', type: DataType.UINT16},
                ],
            },
        },
    },
    mobileDeviceCfg: {
        ID: 34,
        attributes: {
            keepAliveTime: {ID: 0, type: DataType.UINT16},
            rejoinTimeout: {ID: 1, type: DataType.UINT16},
        },
        commands: {},
        commandsResponse: {},
    },
    neighborCleaning: {
        ID: 35,
        attributes: {
            neighborCleaningTimeout: {ID: 0, type: DataType.UINT16},
        },
        commands: {},
        commandsResponse: {},
    },
    nearestGateway: {
        ID: 36,
        attributes: {
            nearestGateway: {ID: 0, type: DataType.UINT16},
            newMobileNode: {ID: 1, type: DataType.UINT16},
        },
        commands: {},
        commandsResponse: {},
    },
    closuresShadeCfg: {
        ID: 256,
        attributes: {
            physicalClosedLimit: {ID: 0, type: DataType.UINT16},
            motorStepSize: {ID: 1, type: DataType.UINT8},
            status: {ID: 2, type: DataType.BITMAP8},
            losedLimit: {ID: 16, type: DataType.UINT16},
            mode: {ID: 18, type: DataType.ENUM8},
        },
        commands: {},
        commandsResponse: {},
    },
    closuresDoorLock: {
        ID: 257,
        attributes: {
            lockState: {ID: 0, type: DataType.ENUM8},
            lockType: {ID: 38, type: DataType.BITMAP16},
            actuatorEnabled: {ID: 2, type: DataType.BOOLEAN},
            doorState: {ID: 3, type: DataType.ENUM8},
            doorOpenEvents: {ID: 4, type: DataType.UINT32},
            doorClosedEvents: {ID: 5, type: DataType.UINT32},
            openPeriod: {ID: 6, type: DataType.UINT16},
            numOfLockRecordsSupported: {ID: 16, type: DataType.UINT16},
            numOfTotalUsersSupported: {ID: 17, type: DataType.UINT16},
            numOfPinUsersSupported: {ID: 18, type: DataType.UINT16},
            numOfRfidUsersSupported: {ID: 19, type: DataType.UINT16},
            numOfWeekDaySchedulesSupportedPerUser: {ID: 20, type: DataType.UINT8},
            numOfYearDaySchedulesSupportedPerUser: {ID: 21, type: DataType.UINT8},
            numOfHolidayScheduledsSupported: {ID: 22, type: DataType.UINT8},
            maxPinLen: {ID: 23, type: DataType.UINT8},
            minPinLen: {ID: 24, type: DataType.UINT8},
            maxRfidLen: {ID: 25, type: DataType.UINT8},
            minRfidLen: {ID: 26, type: DataType.UINT8},
            enableLogging: {ID: 32, type: DataType.BOOLEAN},
            language: {ID: 33, type: DataType.CHAR_STR},
            ledSettings: {ID: 34, type: DataType.UINT8},
            autoRelockTime: {ID: 35, type: DataType.UINT32},
            soundVolume: {ID: 36, type: DataType.UINT8},
            operatingMode: {ID: 37, type: DataType.UINT32},
            defaultConfigurationRegister: {ID: 39, type: DataType.BITMAP16},
            enableLocalProgramming: {ID: 40, type: DataType.BOOLEAN},
            enableOneTouchLocking: {ID: 41, type: DataType.BOOLEAN},
            enableInsideStatusLed: {ID: 42, type: DataType.BOOLEAN},
            enablePrivacyModeButton: {ID: 43, type: DataType.BOOLEAN},
            wrongCodeEntryLimit: {ID: 48, type: DataType.UINT8},
            userCodeTemporaryDisableTime: {ID: 49, type: DataType.UINT8},
            sendPinOta: {ID: 50, type: DataType.BOOLEAN},
            requirePinForRfOperation: {ID: 51, type: DataType.BOOLEAN},
            zigbeeSecurityLevel: {ID: 52, type: DataType.UINT8},
            alarmMask: {ID: 64, type: DataType.BITMAP16},
            keypadOperationEventMask: {ID: 65, type: DataType.BITMAP16},
            rfOperationEventMask: {ID: 66, type: DataType.BITMAP16},
            manualOperationEventMask: {ID: 67, type: DataType.BITMAP16},
            rfidOperationEventMask: {ID: 68, type: DataType.BITMAP16},
            keypadProgrammingEventMask: {ID: 69, type: DataType.BITMAP16},
            rfProgrammingEventMask: {ID: 70, type: DataType.BITMAP16},
            rfidProgrammingEventMask: {ID: 71, type: DataType.BITMAP16},
        },
        commands: {
            lockDoor: {
                ID: 0,
                response: 0,
                parameters: [{name: 'pincodevalue', type: DataType.CHAR_STR}],
            },
            unlockDoor: {
                ID: 1,
                response: 1,
                parameters: [{name: 'pincodevalue', type: DataType.CHAR_STR}],
            },
            toggleDoor: {
                ID: 2,
                response: 2,
                parameters: [{name: 'pincodevalue', type: DataType.CHAR_STR}],
            },
            unlockWithTimeout: {
                ID: 3,
                response: 3,
                parameters: [
                    {name: 'timeout', type: DataType.UINT16},
                    {name: 'pincodevalue', type: DataType.CHAR_STR},
                ],
            },
            getLogRecord: {
                ID: 4,
                response: 4,
                parameters: [{name: 'logindex', type: DataType.UINT16}],
            },
            setPinCode: {
                ID: 5,
                response: 5,
                parameters: [
                    {name: 'userid', type: DataType.UINT16},
                    {name: 'userstatus', type: DataType.UINT8},
                    {name: 'usertype', type: DataType.UINT8},
                    {name: 'pincodevalue', type: DataType.CHAR_STR},
                ],
            },
            getPinCode: {
                ID: 6,
                response: 6,
                parameters: [{name: 'userid', type: DataType.UINT16}],
            },
            clearPinCode: {
                ID: 7,
                response: 7,
                parameters: [{name: 'userid', type: DataType.UINT16}],
            },
            clearAllPinCodes: {
                ID: 8,
                response: 8,
                parameters: [],
            },
            setUserStatus: {
                ID: 9,
                response: 9,
                parameters: [
                    {name: 'userid', type: DataType.UINT16},
                    {name: 'userstatus', type: DataType.UINT8},
                ],
            },
            getUserStatus: {
                ID: 10,
                response: 10,
                parameters: [{name: 'userid', type: DataType.UINT16}],
            },
            setWeekDaySchedule: {
                ID: 11,
                response: 11,
                parameters: [
                    {name: 'scheduleid', type: DataType.UINT8},
                    {name: 'userid', type: DataType.UINT16},
                    {name: 'daysmask', type: DataType.UINT8},
                    {name: 'starthour', type: DataType.UINT8},
                    {name: 'startminute', type: DataType.UINT8},
                    {name: 'endhour', type: DataType.UINT8},
                    {name: 'endminute', type: DataType.UINT8},
                ],
            },
            getWeekDaySchedule: {
                ID: 12,
                response: 12,
                parameters: [
                    {name: 'scheduleid', type: DataType.UINT8},
                    {name: 'userid', type: DataType.UINT16},
                ],
            },
            clearWeekDaySchedule: {
                ID: 13,
                response: 13,
                parameters: [
                    {name: 'scheduleid', type: DataType.UINT8},
                    {name: 'userid', type: DataType.UINT16},
                ],
            },
            setYearDaySchedule: {
                ID: 14,
                response: 14,
                parameters: [
                    {name: 'scheduleid', type: DataType.UINT8},
                    {name: 'userid', type: DataType.UINT16},
                    {name: 'zigbeelocalstarttime', type: DataType.UINT32},
                    {name: 'zigbeelocalendtime', type: DataType.UINT32},
                ],
            },
            getYearDaySchedule: {
                ID: 15,
                response: 15,
                parameters: [
                    {name: 'scheduleid', type: DataType.UINT8},
                    {name: 'userid', type: DataType.UINT16},
                ],
            },
            clearYearDaySchedule: {
                ID: 16,
                response: 16,
                parameters: [
                    {name: 'scheduleid', type: DataType.UINT8},
                    {name: 'userid', type: DataType.UINT16},
                ],
            },
            setHolidaySchedule: {
                ID: 17,
                response: 17,
                parameters: [
                    {name: 'holidayscheduleid', type: DataType.UINT8},
                    {name: 'zigbeelocalstarttime', type: DataType.UINT32},
                    {name: 'zigbeelocalendtime', type: DataType.UINT32},
                    {name: 'opermodelduringholiday', type: DataType.UINT8},
                ],
            },
            getHolidaySchedule: {
                ID: 18,
                response: 18,
                parameters: [{name: 'holidayscheduleid', type: DataType.UINT8}],
            },
            clearHolidaySchedule: {
                ID: 19,
                response: 19,
                parameters: [{name: 'holidayscheduleid', type: DataType.UINT8}],
            },
            setUserType: {
                ID: 20,
                response: 20,
                parameters: [
                    {name: 'userid', type: DataType.UINT16},
                    {name: 'usertype', type: DataType.UINT8},
                ],
            },
            getUserType: {
                ID: 21,
                response: 21,
                parameters: [{name: 'userid', type: DataType.UINT16}],
            },
            setRfidCode: {
                ID: 22,
                response: 22,
                parameters: [
                    {name: 'userid', type: DataType.UINT16},
                    {name: 'userstatus', type: DataType.UINT8},
                    {name: 'usertype', type: DataType.UINT8},
                    {name: 'pincodevalue', type: DataType.CHAR_STR},
                ],
            },
            getRfidCode: {
                ID: 23,
                response: 23,
                parameters: [{name: 'userid', type: DataType.UINT16}],
            },
            clearRfidCode: {
                ID: 24,
                response: 24,
                parameters: [{name: 'userid', type: DataType.UINT16}],
            },
            clearAllRfidCodes: {
                ID: 25,
                response: 25,
                parameters: [],
            },
        },
        commandsResponse: {
            lockDoorRsp: {
                ID: 0,
                parameters: [{name: 'status', type: DataType.UINT8}],
            },
            unlockDoorRsp: {
                ID: 1,
                parameters: [{name: 'status', type: DataType.UINT8}],
            },
            toggleDoorRsp: {
                ID: 2,
                parameters: [{name: 'status', type: DataType.UINT8}],
            },
            unlockWithTimeoutRsp: {
                ID: 3,
                parameters: [{name: 'status', type: DataType.UINT8}],
            },
            getLogRecordRsp: {
                ID: 4,
                parameters: [
                    {name: 'logentryid', type: DataType.UINT16},
                    {name: 'timestamp', type: DataType.UINT32},
                    {name: 'eventtype', type: DataType.UINT8},
                    {name: 'source', type: DataType.UINT8},
                    {name: 'eventidalarmcode', type: DataType.UINT8},
                    {name: 'userid', type: DataType.UINT16},
                    {name: 'pincodevalue', type: DataType.CHAR_STR},
                ],
            },
            setPinCodeRsp: {
                ID: 5,
                parameters: [{name: 'status', type: DataType.UINT8}],
            },
            getPinCodeRsp: {
                ID: 6,
                parameters: [
                    {name: 'userid', type: DataType.UINT16},
                    {name: 'userstatus', type: DataType.UINT8},
                    {name: 'usertype', type: DataType.UINT8},
                    {name: 'pincodevalue', type: DataType.CHAR_STR},
                ],
            },
            clearPinCodeRsp: {
                ID: 7,
                parameters: [{name: 'status', type: DataType.UINT8}],
            },
            clearAllPinCodesRsp: {
                ID: 8,
                parameters: [{name: 'status', type: DataType.UINT8}],
            },
            setUserStatusRsp: {
                ID: 9,
                parameters: [{name: 'status', type: DataType.UINT8}],
            },
            getUserStatusRsp: {
                ID: 10,
                parameters: [
                    {name: 'userid', type: DataType.UINT16},
                    {name: 'userstatus', type: DataType.UINT8},
                ],
            },
            setWeekDayScheduleRsp: {
                ID: 11,
                parameters: [{name: 'status', type: DataType.UINT8}],
            },
            getWeekDayScheduleRsp: {
                ID: 12,
                parameters: [
                    {name: 'scheduleid', type: DataType.UINT8},
                    {name: 'userid', type: DataType.UINT16},
                    {name: 'status', type: DataType.UINT8},
                    {name: 'daysmask', type: DataType.UINT8},
                    {name: 'starthour', type: DataType.UINT8},
                    {name: 'startminute', type: DataType.UINT8},
                    {name: 'endhour', type: DataType.UINT8},
                    {name: 'endminute', type: DataType.UINT8},
                ],
            },
            clearWeekDayScheduleRsp: {
                ID: 13,
                parameters: [{name: 'status', type: DataType.UINT8}],
            },
            setYearDayScheduleRsp: {
                ID: 14,
                parameters: [{name: 'status', type: DataType.UINT8}],
            },
            getYearDayScheduleRsp: {
                ID: 15,
                parameters: [
                    {name: 'scheduleid', type: DataType.UINT8},
                    {name: 'userid', type: DataType.UINT16},
                    {name: 'status', type: DataType.UINT8},
                    {name: 'zigbeelocalstarttime', type: DataType.UINT32},
                    {name: 'zigbeelocalendtime', type: DataType.UINT32},
                ],
            },
            clearYearDayScheduleRsp: {
                ID: 16,
                parameters: [{name: 'status', type: DataType.UINT8}],
            },
            setHolidayScheduleRsp: {
                ID: 17,
                parameters: [{name: 'status', type: DataType.UINT8}],
            },
            getHolidayScheduleRsp: {
                ID: 18,
                parameters: [
                    {name: 'holidayscheduleid', type: DataType.UINT8},
                    {name: 'status', type: DataType.UINT8},
                    {name: 'zigbeelocalstarttime', type: DataType.UINT32},
                    {name: 'zigbeelocalendtime', type: DataType.UINT32},
                    {name: 'opermodelduringholiday', type: DataType.UINT8},
                ],
            },
            clearHolidayScheduleRsp: {
                ID: 19,
                parameters: [{name: 'status', type: DataType.UINT8}],
            },
            setUserTypeRsp: {
                ID: 20,
                parameters: [{name: 'status', type: DataType.UINT8}],
            },
            getUserTypeRsp: {
                ID: 21,
                parameters: [
                    {name: 'userid', type: DataType.UINT16},
                    {name: 'usertype', type: DataType.UINT8},
                ],
            },
            setRfidCodeRsp: {
                ID: 22,
                parameters: [{name: 'status', type: DataType.UINT8}],
            },
            getRfidCodeRsp: {
                ID: 23,
                parameters: [
                    {name: 'userid', type: DataType.UINT16},
                    {name: 'userstatus', type: DataType.UINT8},
                    {name: 'usertype', type: DataType.UINT8},
                    {name: 'pincodevalue', type: DataType.CHAR_STR},
                ],
            },
            clearRfidCodeRsp: {
                ID: 24,
                parameters: [{name: 'status', type: DataType.UINT8}],
            },
            clearAllRfidCodesRsp: {
                ID: 25,
                parameters: [{name: 'status', type: DataType.UINT8}],
            },
            operationEventNotification: {
                ID: 32,
                parameters: [
                    {name: 'opereventsrc', type: DataType.UINT8},
                    {name: 'opereventcode', type: DataType.UINT8},
                    {name: 'userid', type: DataType.UINT16},
                    {name: 'pin', type: DataType.OCTET_STR},
                    {name: 'zigbeelocaltime', type: DataType.UINT32},
                    {name: 'data', type: DataType.UINT8},
                ],
            },
            programmingEventNotification: {
                ID: 33,
                parameters: [
                    {name: 'programeventsrc', type: DataType.UINT8},
                    {name: 'programeventcode', type: DataType.UINT8},
                    {name: 'userid', type: DataType.UINT16},
                    {name: 'pin', type: DataType.OCTET_STR},
                    {name: 'usertype', type: DataType.UINT8},
                    {name: 'userstatus', type: DataType.UINT8},
                    {name: 'zigbeelocaltime', type: DataType.UINT32},
                    {name: 'data', type: DataType.UINT8},
                ],
            },
        },
    },
    closuresWindowCovering: {
        ID: 258,
        attributes: {
            windowCoveringType: {ID: 0, type: DataType.ENUM8},
            physicalClosedLimitLiftCm: {ID: 1, type: DataType.UINT16},
            physicalClosedLimitTiltDdegree: {ID: 2, type: DataType.UINT16},
            currentPositionLiftCm: {ID: 3, type: DataType.UINT16},
            currentPositionTiltDdegree: {ID: 4, type: DataType.UINT16},
            numOfActuationsLift: {ID: 5, type: DataType.UINT16},
            numOfActuationsTilt: {ID: 6, type: DataType.UINT16},
            configStatus: {ID: 7, type: DataType.BITMAP8},
            currentPositionLiftPercentage: {ID: 8, type: DataType.UINT8},
            currentPositionTiltPercentage: {ID: 9, type: DataType.UINT8},
            operationalStatus: {ID: 10, type: DataType.BITMAP8},
            installedOpenLimitLiftCm: {ID: 16, type: DataType.UINT16},
            installedClosedLimitLiftCm: {ID: 17, type: DataType.UINT16},
            installedOpenLimitTiltDdegree: {ID: 18, type: DataType.UINT16},
            installedClosedLimitTiltDdegree: {ID: 19, type: DataType.UINT16},
            velocityLift: {ID: 20, type: DataType.UINT16},
            accelerationTimeLift: {ID: 21, type: DataType.UINT16},
            decelerationTimeLift: {ID: 22, type: DataType.UINT16},
            windowCoveringMode: {ID: 23, type: DataType.BITMAP8},
            intermediateSetpointsLift: {ID: 24, type: DataType.OCTET_STR},
            intermediateSetpointsTilt: {ID: 25, type: DataType.OCTET_STR},
            tuyaMovingState: {ID: 0xf000, type: DataType.ENUM8},
            tuyaCalibration: {ID: 0xf001, type: DataType.ENUM8},
            stepPositionLift: {ID: 0xf001, type: DataType.ENUM8, manufacturerCode: ManufacturerCode.LEGRAND_GROUP},
            tuyaMotorReversal: {ID: 0xf002, type: DataType.ENUM8},
            calibrationMode: {ID: 0xf002, type: DataType.ENUM8, manufacturerCode: ManufacturerCode.LEGRAND_GROUP},
            moesCalibrationTime: {ID: 0xf003, type: DataType.UINT16},
            targetPositionTiltPercentage: {ID: 0xf003, type: DataType.ENUM8, manufacturerCode: ManufacturerCode.LEGRAND_GROUP},
            stepPositionTilt: {ID: 0xf004, type: DataType.ENUM8, manufacturerCode: ManufacturerCode.LEGRAND_GROUP},
            elkoDriveCloseDuration: {ID: 0xe000, type: DataType.UINT16, manufacturerCode: ManufacturerCode.ADEO},
            elkoProtectionStatus: {ID: 0xe010, type: DataType.BITMAP8, manufacturerCode: ManufacturerCode.ADEO},
            elkoProtectionSensor: {ID: 0xe013, type: DataType.BITMAP8, manufacturerCode: ManufacturerCode.ADEO},
            elkoSunProtectionIlluminanceThreshold: {ID: 0xe012, type: DataType.UINT16, manufacturerCode: ManufacturerCode.ADEO},
            elkoLiftDriveUpTime: {ID: 0xe014, type: DataType.UINT16, manufacturerCode: ManufacturerCode.ADEO},
            elkoLiftDriveDownTime: {ID: 0xe015, type: DataType.UINT16, manufacturerCode: ManufacturerCode.ADEO},
            elkoTiltOpenCloseAndStepTime: {ID: 0xe016, type: DataType.UINT16, manufacturerCode: ManufacturerCode.ADEO},
            elkoTiltPositionPercentageAfterMoveToLevel: {ID: 0xe017, type: DataType.UINT8, manufacturerCode: ManufacturerCode.ADEO},
            nikoCalibrationTimeUp: {ID: 0xfcc1, type: DataType.UINT16, manufacturerCode: ManufacturerCode.NIKO_NV},
            nikoCalibrationTimeDown: {ID: 0xfcc2, type: DataType.UINT16, manufacturerCode: ManufacturerCode.NIKO_NV},
        },
        commands: {
            upOpen: {
                ID: 0,
                parameters: [],
            },
            downClose: {
                ID: 1,
                parameters: [],
            },
            stop: {
                ID: 2,
                parameters: [],
            },
            goToLiftValue: {
                ID: 4,
                parameters: [{name: 'liftvalue', type: DataType.UINT16}],
            },
            goToLiftPercentage: {
                ID: 5,
                parameters: [{name: 'percentageliftvalue', type: DataType.UINT8}],
            },
            goToTiltValue: {
                ID: 7,
                parameters: [{name: 'tiltvalue', type: DataType.UINT16}],
            },
            goToTiltPercentage: {
                ID: 8,
                parameters: [{name: 'percentagetiltvalue', type: DataType.UINT8}],
            },
            elkoStopOrStepLiftPercentage: {
                ID: 0x80,
                parameters: [
                    {name: 'direction', type: DataType.UINT16},
                    {name: 'stepvalue', type: DataType.UINT16},
                ],
            },
        },
        commandsResponse: {},
    },
    barrierControl: {
        ID: 259,
        attributes: {
            movingState: {ID: 1, type: DataType.ENUM8},
            safetyStatus: {ID: 2, type: DataType.BITMAP16},
            capabilities: {ID: 3, type: DataType.BITMAP8},
            openEvents: {ID: 4, type: DataType.UINT16},
            closeEvents: {ID: 5, type: DataType.UINT16},
            commandOpenEvents: {ID: 6, type: DataType.UINT16},
            commandCloseEvents: {ID: 7, type: DataType.UINT16},
            openPeriod: {ID: 8, type: DataType.UINT16},
            closePeriod: {ID: 9, type: DataType.UINT16},
            barrierPosition: {ID: 10, type: DataType.UINT8},
        },
        commands: {
            goToPercent: {
                ID: 0,
                parameters: [{name: 'percentOpen', type: DataType.UINT8}],
            },
            stop: {
                ID: 1,
                parameters: [],
            },
        },
        commandsResponse: {},
    },
    hvacPumpCfgCtrl: {
        ID: 512,
        attributes: {
            maxPressure: {ID: 0, type: DataType.INT16},
            maxSpeed: {ID: 1, type: DataType.UINT16},
            maxFlow: {ID: 2, type: DataType.UINT16},
            minConstPressure: {ID: 3, type: DataType.INT16},
            maxConstPressure: {ID: 4, type: DataType.INT16},
            minCompPressure: {ID: 5, type: DataType.INT16},
            maxCompPressure: {ID: 6, type: DataType.INT16},
            minConstSpeed: {ID: 7, type: DataType.UINT16},
            maxConstSpeed: {ID: 8, type: DataType.UINT16},
            minConstFlow: {ID: 9, type: DataType.UINT16},
            maxConstFlow: {ID: 10, type: DataType.UINT16},
            minConstTemp: {ID: 11, type: DataType.INT16},
            maxConstTemp: {ID: 12, type: DataType.INT16},
            pumpStatus: {ID: 16, type: DataType.BITMAP16},
            effectiveOperationMode: {ID: 17, type: DataType.ENUM8},
            effectiveControlMode: {ID: 18, type: DataType.ENUM8},
            capacity: {ID: 19, type: DataType.INT16},
            speed: {ID: 20, type: DataType.UINT16},
            lifetimeRunningHours: {ID: 21, type: DataType.UINT24},
            power: {ID: 22, type: DataType.UINT24},
            lifetimeEnergyConsumed: {ID: 23, type: DataType.UINT32},
            operationMode: {ID: 32, type: DataType.ENUM8},
            controlMode: {ID: 33, type: DataType.ENUM8},
            alarmMask: {ID: 34, type: DataType.BITMAP16},
        },
        commands: {},
        commandsResponse: {},
    },
    hvacThermostat: {
        ID: 513,
        attributes: {
            localTemp: {ID: 0, type: DataType.INT16},
            outdoorTemp: {ID: 1, type: DataType.INT16},
            occupancy: {ID: 2, type: DataType.BITMAP8},
            absMinHeatSetpointLimit: {ID: 3, type: DataType.INT16},
            absMaxHeatSetpointLimit: {ID: 4, type: DataType.INT16},
            absMinCoolSetpointLimit: {ID: 5, type: DataType.INT16},
            absMaxCoolSetpointLimit: {ID: 6, type: DataType.INT16},
            pICoolingDemand: {ID: 7, type: DataType.UINT8},
            pIHeatingDemand: {ID: 8, type: DataType.UINT8},
            systemTypeConfig: {ID: 9, type: DataType.BITMAP8},
            localTemperatureCalibration: {ID: 16, type: DataType.INT8},
            occupiedCoolingSetpoint: {ID: 17, type: DataType.INT16},
            occupiedHeatingSetpoint: {ID: 18, type: DataType.INT16},
            unoccupiedCoolingSetpoint: {ID: 19, type: DataType.INT16},
            unoccupiedHeatingSetpoint: {ID: 20, type: DataType.INT16},
            minHeatSetpointLimit: {ID: 21, type: DataType.INT16},
            maxHeatSetpointLimit: {ID: 22, type: DataType.INT16},
            minCoolSetpointLimit: {ID: 23, type: DataType.INT16},
            maxCoolSetpointLimit: {ID: 24, type: DataType.INT16},
            minSetpointDeadBand: {ID: 25, type: DataType.INT8},
            remoteSensing: {ID: 26, type: DataType.BITMAP8},
            ctrlSeqeOfOper: {ID: 27, type: DataType.ENUM8},
            systemMode: {ID: 28, type: DataType.ENUM8},
            alarmMask: {ID: 29, type: DataType.BITMAP8},
            runningMode: {ID: 30, type: DataType.ENUM8},
            startOfWeek: {ID: 32, type: DataType.ENUM8},
            numberOfWeeklyTrans: {ID: 33, type: DataType.UINT8},
            numberOfDailyTrans: {ID: 34, type: DataType.UINT8},
            tempSetpointHold: {ID: 35, type: DataType.ENUM8},
            tempSetpointHoldDuration: {ID: 36, type: DataType.UINT16},
            programingOperMode: {ID: 37, type: DataType.BITMAP8},
            runningState: {ID: 41, type: DataType.BITMAP16},
            setpointChangeSource: {ID: 48, type: DataType.ENUM8},
            setpointChangeAmount: {ID: 49, type: DataType.INT16},
            setpointChangeSourceTimeStamp: {ID: 50, type: DataType.UTC},
            acType: {ID: 64, type: DataType.ENUM8},
            acCapacity: {ID: 65, type: DataType.UINT16},
            acRefrigerantType: {ID: 66, type: DataType.ENUM8},
            acConpressorType: {ID: 67, type: DataType.ENUM8},
            acErrorCode: {ID: 68, type: DataType.BITMAP32},
            acLouverPosition: {ID: 69, type: DataType.ENUM8},
            acCollTemp: {ID: 70, type: DataType.INT16},
            acCapacityFormat: {ID: 71, type: DataType.ENUM8},
            SinopeOccupancy: {ID: 1024, type: DataType.ENUM8, manufacturerCode: ManufacturerCode.SINOPE_TECHNOLOGIES},
            SinopeMainCycleOutput: {ID: 1025, type: DataType.UINT16, manufacturerCode: ManufacturerCode.SINOPE_TECHNOLOGIES},
            SinopeBacklight: {ID: 1026, type: DataType.ENUM8, manufacturerCode: ManufacturerCode.SINOPE_TECHNOLOGIES},
            SinopeAuxCycleOutput: {ID: 1028, type: DataType.UINT16, manufacturerCode: ManufacturerCode.SINOPE_TECHNOLOGIES},
            StelproSystemMode: {ID: 0x401c, type: DataType.ENUM8},
            StelproOutdoorTemp: {ID: 0x4001, type: DataType.INT16},
            viessmannWindowOpenInternal: {ID: 0x4000, type: DataType.ENUM8, manufacturerCode: ManufacturerCode.VIESSMANN_ELEKTRONIK_GMBH},
            viessmannWindowOpenForce: {ID: 0x4003, type: DataType.BOOLEAN, manufacturerCode: ManufacturerCode.VIESSMANN_ELEKTRONIK_GMBH},
            viessmannAssemblyMode: {ID: 0x4012, type: DataType.BOOLEAN, manufacturerCode: ManufacturerCode.VIESSMANN_ELEKTRONIK_GMBH},
            schneiderWiserSpecific: {ID: 0xe110, type: DataType.ENUM8, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            danfossWindowOpenInternal: {ID: 0x4000, type: DataType.ENUM8, manufacturerCode: ManufacturerCode.DANFOSS_A_S},
            danfossWindowOpenExternal: {ID: 0x4003, type: DataType.BOOLEAN, manufacturerCode: ManufacturerCode.DANFOSS_A_S},
            danfossDayOfWeek: {ID: 0x4010, type: DataType.ENUM8, manufacturerCode: ManufacturerCode.DANFOSS_A_S},
            danfossTriggerTime: {ID: 0x4011, type: DataType.UINT16, manufacturerCode: ManufacturerCode.DANFOSS_A_S},
            danfossMountedModeActive: {ID: 0x4012, type: DataType.BOOLEAN, manufacturerCode: ManufacturerCode.DANFOSS_A_S},
            danfossMountedModeControl: {ID: 0x4013, type: DataType.BOOLEAN, manufacturerCode: ManufacturerCode.DANFOSS_A_S},
            danfossThermostatOrientation: {ID: 0x4014, type: DataType.BOOLEAN, manufacturerCode: ManufacturerCode.DANFOSS_A_S},
            danfossExternalMeasuredRoomSensor: {ID: 0x4015, type: DataType.INT16, manufacturerCode: ManufacturerCode.DANFOSS_A_S},
            danfossRadiatorCovered: {ID: 0x4016, type: DataType.BOOLEAN, manufacturerCode: ManufacturerCode.DANFOSS_A_S},
            danfossAlgorithmScaleFactor: {ID: 0x4020, type: DataType.UINT8, manufacturerCode: ManufacturerCode.DANFOSS_A_S},
            danfossHeatAvailable: {ID: 0x4030, type: DataType.BOOLEAN, manufacturerCode: ManufacturerCode.DANFOSS_A_S},
            danfossHeatRequired: {ID: 0x4031, type: DataType.BOOLEAN, manufacturerCode: ManufacturerCode.DANFOSS_A_S},
            danfossLoadBalancingEnable: {ID: 0x4032, type: DataType.BOOLEAN, manufacturerCode: ManufacturerCode.DANFOSS_A_S},
            danfossLoadRoomMean: {ID: 0x4040, type: DataType.INT16, manufacturerCode: ManufacturerCode.DANFOSS_A_S},
            danfossLoadEstimate: {ID: 0x404a, type: DataType.INT16, manufacturerCode: ManufacturerCode.DANFOSS_A_S},
            danfossRegulationSetpointOffset: {ID: 0x404b, type: DataType.INT8, manufacturerCode: ManufacturerCode.DANFOSS_A_S},
            danfossAdaptionRunControl: {ID: 0x404c, type: DataType.ENUM8, manufacturerCode: ManufacturerCode.DANFOSS_A_S},
            danfossAdaptionRunStatus: {ID: 0x404d, type: DataType.BITMAP8, manufacturerCode: ManufacturerCode.DANFOSS_A_S},
            danfossAdaptionRunSettings: {ID: 0x404e, type: DataType.BITMAP8, manufacturerCode: ManufacturerCode.DANFOSS_A_S},
            danfossPreheatStatus: {ID: 0x404f, type: DataType.BOOLEAN, manufacturerCode: ManufacturerCode.DANFOSS_A_S},
            danfossPreheatTime: {ID: 0x4050, type: DataType.UINT32, manufacturerCode: ManufacturerCode.DANFOSS_A_S},
            danfossWindowOpenFeatureEnable: {ID: 0x4051, type: DataType.BOOLEAN, manufacturerCode: ManufacturerCode.DANFOSS_A_S},
            danfossRoomStatusCode: {ID: 0x4100, type: DataType.BITMAP16, manufacturerCode: ManufacturerCode.DANFOSS_A_S},
            danfossOutputStatus: {ID: 0x4110, type: DataType.ENUM8, manufacturerCode: ManufacturerCode.DANFOSS_A_S},
            danfossRoomFloorSensorMode: {ID: 0x4120, type: DataType.ENUM8, manufacturerCode: ManufacturerCode.DANFOSS_A_S},
            danfossFloorMinSetpoint: {ID: 0x4121, type: DataType.INT16, manufacturerCode: ManufacturerCode.DANFOSS_A_S},
            danfossFloorMaxSetpoint: {ID: 0x4122, type: DataType.INT16, manufacturerCode: ManufacturerCode.DANFOSS_A_S},
            elkoLoad: {ID: 0x0401, type: DataType.UINT16},
            elkoDisplayText: {ID: 0x0402, type: DataType.CHAR_STR},
            elkoSensor: {ID: 0x0403, type: DataType.ENUM8},
            elkoRegulatorTime: {ID: 0x0404, type: DataType.UINT8},
            elkoRegulatorMode: {ID: 0x0405, type: DataType.BOOLEAN},
            elkoPowerStatus: {ID: 0x0406, type: DataType.BOOLEAN},
            elkoDateTime: {ID: 0x0407, type: DataType.OCTET_STR},
            elkoMeanPower: {ID: 0x0408, type: DataType.UINT16},
            elkoExternalTemp: {ID: 0x0409, type: DataType.INT16},
            elkoNightSwitching: {ID: 0x0411, type: DataType.BOOLEAN},
            elkoFrostGuard: {ID: 0x0412, type: DataType.BOOLEAN},
            elkoChildLock: {ID: 0x0413, type: DataType.BOOLEAN},
            elkoMaxFloorTemp: {ID: 0x0414, type: DataType.UINT8},
            elkoRelayState: {ID: 0x0415, type: DataType.BOOLEAN},
            elkoVersion: {ID: 0x0416, type: DataType.OCTET_STR},
            elkoCalibration: {ID: 0x0417, type: DataType.INT8},
            elkoLastMessageId: {ID: 0x0418, type: DataType.UINT8},
            elkoLastMessageStatus: {ID: 0x0419, type: DataType.UINT8},
            fourNoksHysteresisHigh: {ID: 0x0101, type: DataType.UINT16, manufacturerCode: ManufacturerCode.ASTREL_GROUP_SRL},
            fourNoksHysteresisLow: {ID: 0x0102, type: DataType.UINT16, manufacturerCode: ManufacturerCode.ASTREL_GROUP_SRL},
        },
        commands: {
            setpointRaiseLower: {
                ID: 0,
                parameters: [
                    {name: 'mode', type: DataType.UINT8},
                    {name: 'amount', type: DataType.INT8},
                ],
            },
            setWeeklySchedule: {
                ID: 1,
                parameters: [
                    {name: 'numoftrans', type: DataType.UINT8},
                    {name: 'dayofweek', type: DataType.UINT8},
                    {name: 'mode', type: DataType.UINT8},
                    {name: 'transitions', type: BuffaloZclDataType.LIST_THERMO_TRANSITIONS},
                ],
            },
            getWeeklySchedule: {
                ID: 2,
                parameters: [
                    {name: 'daystoreturn', type: DataType.UINT8},
                    {name: 'modetoreturn', type: DataType.UINT8},
                ],
            },
            clearWeeklySchedule: {
                ID: 3,
                parameters: [],
            },
            getRelayStatusLog: {
                ID: 4,
                parameters: [],
            },
            danfossSetpointCommand: {
                ID: 64,
                parameters: [
                    {name: 'setpointType', type: DataType.ENUM8},
                    {name: 'setpoint', type: DataType.INT16},
                ],
            },
            schneiderWiserThermostatBoost: {
                ID: 0x80,
                parameters: [
                    {name: 'command', type: DataType.ENUM8},
                    {name: 'enable', type: DataType.ENUM8},
                    {name: 'temperature', type: DataType.UINT16},
                    {name: 'duration', type: DataType.UINT16},
                ],
            },
            wiserSmartSetSetpoint: {
                ID: 224,
                parameters: [
                    {name: 'operatingmode', type: DataType.UINT8},
                    {name: 'zonemode', type: DataType.UINT8},
                    {name: 'setpoint', type: DataType.INT16},
                    {name: 'reserved', type: DataType.UINT8},
                ],
            },
            wiserSmartSetFipMode: {
                ID: 225,
                parameters: [
                    {name: 'zonemode', type: DataType.UINT8},
                    {name: 'fipmode', type: DataType.ENUM8},
                    {name: 'reserved', type: DataType.UINT8},
                ],
            },
            wiserSmartCalibrateValve: {
                ID: 226,
                parameters: [],
            },
            plugwiseCalibrateValve: {
                ID: 0xa0,
                parameters: [],
            },
        },
        commandsResponse: {
            getWeeklyScheduleRsp: {
                ID: 0,
                parameters: [
                    {name: 'numoftrans', type: DataType.UINT8},
                    {name: 'dayofweek', type: DataType.UINT8},
                    {name: 'mode', type: DataType.UINT8},
                    {name: 'transitions', type: BuffaloZclDataType.LIST_THERMO_TRANSITIONS},
                ],
            },
            getRelayStatusLogRsp: {
                ID: 1,
                parameters: [
                    {name: 'timeofday', type: DataType.UINT16},
                    {name: 'relaystatus', type: DataType.UINT16},
                    {name: 'localtemp', type: DataType.UINT16},
                    {name: 'humidity', type: DataType.UINT8},
                    {name: 'setpoint', type: DataType.UINT16},
                    {name: 'unreadentries', type: DataType.UINT16},
                ],
            },
        },
    },
    hvacFanCtrl: {
        ID: 514,
        attributes: {
            fanMode: {ID: 0, type: DataType.ENUM8},
            fanModeSequence: {ID: 1, type: DataType.ENUM8},
        },
        commands: {},
        commandsResponse: {},
    },
    hvacDehumidificationCtrl: {
        ID: 515,
        attributes: {
            relativeHumidity: {ID: 0, type: DataType.UINT8},
            dehumidCooling: {ID: 1, type: DataType.UINT8},
            rhDehumidSetpoint: {ID: 16, type: DataType.UINT8},
            relativeHumidityMode: {ID: 17, type: DataType.ENUM8},
            dehumidLockout: {ID: 18, type: DataType.ENUM8},
            dehumidHysteresis: {ID: 19, type: DataType.UINT8},
            dehumidMaxCool: {ID: 20, type: DataType.UINT8},
            relativeHumidDisplay: {ID: 21, type: DataType.ENUM8},
        },
        commands: {},
        commandsResponse: {},
    },
    hvacUserInterfaceCfg: {
        ID: 516,
        attributes: {
            tempDisplayMode: {ID: 0, type: DataType.ENUM8},
            keypadLockout: {ID: 1, type: DataType.ENUM8},
            programmingVisibility: {ID: 2, type: DataType.ENUM8},
            danfossViewingDirection: {ID: 0x4000, type: DataType.ENUM8, manufacturerCode: ManufacturerCode.DANFOSS_A_S},
        },
        commands: {},
        commandsResponse: {},
    },
    lightingColorCtrl: {
        ID: 768,
        attributes: {
            currentHue: {ID: 0, type: DataType.UINT8},
            currentSaturation: {ID: 1, type: DataType.UINT8},
            remainingTime: {ID: 2, type: DataType.UINT16},
            currentX: {ID: 3, type: DataType.UINT16},
            currentY: {ID: 4, type: DataType.UINT16},
            driftCompensation: {ID: 5, type: DataType.ENUM8},
            compensationText: {ID: 6, type: DataType.CHAR_STR},
            colorTemperature: {ID: 7, type: DataType.UINT16},
            colorMode: {ID: 8, type: DataType.ENUM8},
            options: {ID: 15, type: DataType.BITMAP8},
            numPrimaries: {ID: 16, type: DataType.UINT8},
            primary1X: {ID: 17, type: DataType.UINT16},
            primary1Y: {ID: 18, type: DataType.UINT16},
            primary1Intensity: {ID: 19, type: DataType.UINT8},
            primary2X: {ID: 21, type: DataType.UINT16},
            primary2Y: {ID: 22, type: DataType.UINT16},
            primary2Intensity: {ID: 23, type: DataType.UINT8},
            primary3X: {ID: 25, type: DataType.UINT16},
            primary3Y: {ID: 26, type: DataType.UINT16},
            primary3Intensity: {ID: 27, type: DataType.UINT8},
            primary4X: {ID: 32, type: DataType.UINT16},
            primary4Y: {ID: 33, type: DataType.UINT16},
            primary4Intensity: {ID: 34, type: DataType.UINT8},
            primary5X: {ID: 36, type: DataType.UINT16},
            primary5Y: {ID: 37, type: DataType.UINT16},
            primary5Intensity: {ID: 38, type: DataType.UINT8},
            primary6X: {ID: 40, type: DataType.UINT16},
            primary6Y: {ID: 41, type: DataType.UINT16},
            primary6Intensity: {ID: 42, type: DataType.UINT8},
            whitePointX: {ID: 48, type: DataType.UINT16},
            whitePointY: {ID: 49, type: DataType.UINT16},
            colorPointRX: {ID: 50, type: DataType.UINT16},
            colorPointRY: {ID: 51, type: DataType.UINT16},
            colorPointRIntensity: {ID: 52, type: DataType.UINT8},
            colorPointGX: {ID: 54, type: DataType.UINT16},
            colorPointGY: {ID: 55, type: DataType.UINT16},
            colorPointGIntensity: {ID: 56, type: DataType.UINT8},
            colorPointBX: {ID: 58, type: DataType.UINT16},
            colorPointBY: {ID: 59, type: DataType.UINT16},
            colorPointBIntensity: {ID: 60, type: DataType.UINT8},
            enhancedCurrentHue: {ID: 16384, type: DataType.UINT16},
            enhancedColorMode: {ID: 16385, type: DataType.ENUM8},
            colorLoopActive: {ID: 16386, type: DataType.UINT8},
            colorLoopDirection: {ID: 16387, type: DataType.UINT8},
            colorLoopTime: {ID: 16388, type: DataType.UINT16},
            colorLoopStartEnhancedHue: {ID: 16389, type: DataType.UINT16},
            colorLoopStoredEnhancedHue: {ID: 16390, type: DataType.UINT16},
            colorCapabilities: {ID: 16394, type: DataType.UINT16},
            colorTempPhysicalMin: {ID: 16395, type: DataType.UINT16},
            colorTempPhysicalMax: {ID: 16396, type: DataType.UINT16},
            coupleColorTempToLevelMin: {ID: 16397, type: DataType.UINT16},
            startUpColorTemperature: {ID: 16400, type: DataType.UINT16},
            tuyaBrightness: {ID: 61441, type: DataType.UINT8},
            tuyaRgbMode: {ID: 61440, type: DataType.UINT8},
        },
        commands: {
            moveToHue: {
                ID: 0,
                parameters: [
                    {name: 'hue', type: DataType.UINT8},
                    {name: 'direction', type: DataType.UINT8},
                    {name: 'transtime', type: DataType.UINT16},
                ],
            },
            moveHue: {
                ID: 1,
                parameters: [
                    {name: 'movemode', type: DataType.UINT8},
                    {name: 'rate', type: DataType.UINT8},
                ],
            },
            stepHue: {
                ID: 2,
                parameters: [
                    {name: 'stepmode', type: DataType.UINT8},
                    {name: 'stepsize', type: DataType.UINT8},
                    {name: 'transtime', type: DataType.UINT8},
                ],
            },
            moveToSaturation: {
                ID: 3,
                parameters: [
                    {name: 'saturation', type: DataType.UINT8},
                    {name: 'transtime', type: DataType.UINT16},
                ],
            },
            moveSaturation: {
                ID: 4,
                parameters: [
                    {name: 'movemode', type: DataType.UINT8},
                    {name: 'rate', type: DataType.UINT8},
                ],
            },
            stepSaturation: {
                ID: 5,
                parameters: [
                    {name: 'stepmode', type: DataType.UINT8},
                    {name: 'stepsize', type: DataType.UINT8},
                    {name: 'transtime', type: DataType.UINT8},
                ],
            },
            moveToHueAndSaturation: {
                ID: 6,
                parameters: [
                    {name: 'hue', type: DataType.UINT8},
                    {name: 'saturation', type: DataType.UINT8},
                    {name: 'transtime', type: DataType.UINT16},
                ],
            },
            tuyaMoveToHueAndSaturationBrightness: {
                ID: 6,
                parameters: [
                    {name: 'hue', type: DataType.UINT8},
                    {name: 'saturation', type: DataType.UINT8},
                    {name: 'transtime', type: DataType.UINT16},
                    {name: 'brightness', type: DataType.UINT8},
                ],
            },
            moveToColor: {
                ID: 7,
                parameters: [
                    {name: 'colorx', type: DataType.UINT16},
                    {name: 'colory', type: DataType.UINT16},
                    {name: 'transtime', type: DataType.UINT16},
                ],
            },
            moveColor: {
                ID: 8,
                parameters: [
                    {name: 'ratex', type: DataType.INT16},
                    {name: 'ratey', type: DataType.INT16},
                ],
            },
            stepColor: {
                ID: 9,
                parameters: [
                    {name: 'stepx', type: DataType.INT16},
                    {name: 'stepy', type: DataType.INT16},
                    {name: 'transtime', type: DataType.UINT16},
                ],
            },
            moveToColorTemp: {
                ID: 10,
                parameters: [
                    {name: 'colortemp', type: DataType.UINT16},
                    {name: 'transtime', type: DataType.UINT16},
                ],
            },
            enhancedMoveToHue: {
                ID: 64,
                parameters: [
                    {name: 'enhancehue', type: DataType.UINT16},
                    {name: 'direction', type: DataType.UINT8},
                    {name: 'transtime', type: DataType.UINT16},
                ],
            },
            enhancedMoveHue: {
                ID: 65,
                parameters: [
                    {name: 'movemode', type: DataType.UINT8},
                    {name: 'rate', type: DataType.UINT16},
                ],
            },
            enhancedStepHue: {
                ID: 66,
                parameters: [
                    {name: 'stepmode', type: DataType.UINT8},
                    {name: 'stepsize', type: DataType.UINT16},
                    {name: 'transtime', type: DataType.UINT16},
                ],
            },
            enhancedMoveToHueAndSaturation: {
                ID: 67,
                parameters: [
                    {name: 'enhancehue', type: DataType.UINT16},
                    {name: 'saturation', type: DataType.UINT8},
                    {name: 'transtime', type: DataType.UINT16},
                ],
            },
            colorLoopSet: {
                ID: 68,
                parameters: [
                    {name: 'updateflags', type: DataType.UINT8},
                    {name: 'action', type: DataType.UINT8},
                    {name: 'direction', type: DataType.UINT8},
                    {name: 'time', type: DataType.UINT16},
                    {name: 'starthue', type: DataType.UINT16},
                ],
            },
            stopMoveStep: {
                ID: 71,
                parameters: [
                    {name: 'bits', type: DataType.UINT8},
                    {name: 'bytee', type: DataType.UINT8},
                    {name: 'action', type: DataType.UINT8},
                    {name: 'direction', type: DataType.UINT8},
                    {name: 'time', type: DataType.UINT16},
                    {name: 'starthue', type: DataType.UINT16},
                ],
            },
            moveColorTemp: {
                ID: 75,
                parameters: [
                    {name: 'movemode', type: DataType.UINT8},
                    {name: 'rate', type: DataType.UINT16},
                    {name: 'minimum', type: DataType.UINT16},
                    {name: 'maximum', type: DataType.UINT16},
                ],
            },
            stepColorTemp: {
                ID: 76,
                parameters: [
                    {name: 'stepmode', type: DataType.UINT8},
                    {name: 'stepsize', type: DataType.UINT16},
                    {name: 'transtime', type: DataType.UINT16},
                    {name: 'minimum', type: DataType.UINT16},
                    {name: 'maximum', type: DataType.UINT16},
                ],
            },
            tuyaSetMinimumBrightness: {
                ID: 224,
                parameters: [{name: 'minimum', type: DataType.UINT16}],
            },
            tuyaMoveToHueAndSaturationBrightness2: {
                ID: 225,
                parameters: [
                    {name: 'hue', type: DataType.UINT16},
                    {name: 'saturation', type: DataType.UINT16},
                    {name: 'brightness', type: DataType.UINT16},
                ],
            },
            tuyaRgbMode: {
                ID: 240,
                parameters: [{name: 'enable', type: DataType.UINT8}],
            },
            tuyaOnStartUp: {
                ID: 249,
                parameters: [
                    {name: 'mode', type: DataType.UINT16},
                    {name: 'data', type: BuffaloZclDataType.LIST_UINT8},
                ],
            },
            tuyaDoNotDisturb: {
                ID: 250,
                parameters: [{name: 'enable', type: DataType.UINT8}],
            },
            tuyaOnOffTransitionTime: {
                ID: 251,
                parameters: [
                    {name: 'unknown', type: DataType.UINT8},
                    {name: 'onTransitionTime', type: BuffaloZclDataType.BIG_ENDIAN_UINT24},
                    {name: 'offTransitionTime', type: BuffaloZclDataType.BIG_ENDIAN_UINT24},
                ],
            },
        },
        commandsResponse: {},
    },
    lightingBallastCfg: {
        ID: 769,
        attributes: {
            physicalMinLevel: {ID: 0, type: DataType.UINT8},
            physicalMaxLevel: {ID: 1, type: DataType.UINT8},
            ballastStatus: {ID: 2, type: DataType.BITMAP8},
            minLevel: {ID: 16, type: DataType.UINT8},
            maxLevel: {ID: 17, type: DataType.UINT8},
            powerOnLevel: {ID: 18, type: DataType.UINT8},
            powerOnFadeTime: {ID: 19, type: DataType.UINT16},
            intrinsicBallastFactor: {ID: 20, type: DataType.UINT8},
            ballastFactorAdjustment: {ID: 21, type: DataType.UINT8},
            lampQuantity: {ID: 32, type: DataType.UINT8},
            lampType: {ID: 48, type: DataType.CHAR_STR},
            lampManufacturer: {ID: 49, type: DataType.CHAR_STR},
            lampRatedHours: {ID: 50, type: DataType.UINT24},
            lampBurnHours: {ID: 51, type: DataType.UINT24},
            lampAlarmMode: {ID: 52, type: DataType.BITMAP8},
            lampBurnHoursTripPoint: {ID: 53, type: DataType.UINT24},
            elkoControlMode: {ID: 0xe000, type: DataType.ENUM8, manufacturerCode: ManufacturerCode.ADEO},
            wiserControlMode: {ID: 0xe000, type: DataType.ENUM8, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
        },
        commands: {},
        commandsResponse: {},
    },
    msIlluminanceMeasurement: {
        ID: 1024,
        attributes: {
            measuredValue: {ID: 0, type: DataType.UINT16},
            minMeasuredValue: {ID: 1, type: DataType.UINT16},
            maxMeasuredValue: {ID: 2, type: DataType.UINT16},
            tolerance: {ID: 3, type: DataType.UINT16},
            lightSensorType: {ID: 4, type: DataType.ENUM8},
        },
        commands: {},
        commandsResponse: {},
    },
    msIlluminanceLevelSensing: {
        ID: 1025,
        attributes: {
            levelStatus: {ID: 0, type: DataType.ENUM8},
            lightSensorType: {ID: 1, type: DataType.ENUM8},
            illuminanceTargetLevel: {ID: 16, type: DataType.UINT16},
        },
        commands: {},
        commandsResponse: {},
    },
    msTemperatureMeasurement: {
        ID: 1026,
        attributes: {
            measuredValue: {ID: 0, type: DataType.INT16},
            minMeasuredValue: {ID: 1, type: DataType.INT16},
            maxMeasuredValue: {ID: 2, type: DataType.INT16},
            tolerance: {ID: 3, type: DataType.UINT16},
            minPercentChange: {ID: 16, type: DataType.UNKNOWN},
            minAbsoluteChange: {ID: 17, type: DataType.UNKNOWN},
            sprutTemperatureOffset: {ID: 0x6600, type: DataType.INT16, manufacturerCode: ManufacturerCode.CUSTOM_SPRUT_DEVICE},
        },
        commands: {},
        commandsResponse: {},
    },
    msPressureMeasurement: {
        ID: 1027,
        attributes: {
            measuredValue: {ID: 0, type: DataType.INT16},
            minMeasuredValue: {ID: 1, type: DataType.INT16},
            maxMeasuredValue: {ID: 2, type: DataType.INT16},
            tolerance: {ID: 3, type: DataType.UINT16},
            scaledValue: {ID: 0x0010, type: DataType.INT16},
            minScaledValue: {ID: 0x0011, type: DataType.INT16},
            maxScaledValue: {ID: 0x0012, type: DataType.INT16},
            scaledTolerance: {ID: 0x0013, type: DataType.UINT16},
            scale: {ID: 0x0014, type: DataType.INT8},
        },
        commands: {},
        commandsResponse: {},
    },
    msFlowMeasurement: {
        ID: 1028,
        attributes: {
            measuredValue: {ID: 0, type: DataType.UINT16},
            minMeasuredValue: {ID: 1, type: DataType.UINT16},
            maxMeasuredValue: {ID: 2, type: DataType.UINT16},
            tolerance: {ID: 3, type: DataType.UINT16},
        },
        commands: {},
        commandsResponse: {},
    },
    msRelativeHumidity: {
        ID: 1029,
        attributes: {
            measuredValue: {ID: 0, type: DataType.UINT16},
            minMeasuredValue: {ID: 1, type: DataType.UINT16},
            maxMeasuredValue: {ID: 2, type: DataType.UINT16},
            tolerance: {ID: 3, type: DataType.UINT16},
            sprutHeater: {ID: 0x6600, type: DataType.BOOLEAN, manufacturerCode: ManufacturerCode.CUSTOM_SPRUT_DEVICE},
        },
        commands: {},
        commandsResponse: {},
    },
    msOccupancySensing: {
        ID: 1030,
        attributes: {
            occupancy: {ID: 0x0000, type: DataType.BITMAP8},
            occupancySensorType: {ID: 0x0001, type: DataType.ENUM8},
            occupancySensorTypeBitmap: {ID: 0x0002, type: DataType.BITMAP8},
            pirOToUDelay: {ID: 0x0010, type: DataType.UINT16},
            pirUToODelay: {ID: 0x0011, type: DataType.UINT16},
            pirUToOThreshold: {ID: 0x0012, type: DataType.UINT8},
            ultrasonicOToUDelay: {ID: 0x0020, type: DataType.UINT16},
            ultrasonicUToODelay: {ID: 0x0021, type: DataType.UINT16},
            ultrasonicUToOThreshold: {ID: 0x0022, type: DataType.UINT8},
            contactOToUDelay: {ID: 0x0030, type: DataType.UINT16},
            contactUToODelay: {ID: 0x0031, type: DataType.UINT16},
            contactUToOThreshold: {ID: 0x0032, type: DataType.UINT8},
            elkoOccupancyDfltOperationMode: {ID: 0xe000, type: DataType.ENUM8, manufacturerCode: ManufacturerCode.ADEO},
            elkoOccupancyOperationMode: {ID: 0xe001, type: DataType.ENUM8, manufacturerCode: ManufacturerCode.ADEO},
            elkoForceOffTimeout: {ID: 0xe002, type: DataType.UINT16, manufacturerCode: ManufacturerCode.ADEO},
            elkoOccupancySensitivity: {ID: 0xe003, type: DataType.UINT8, manufacturerCode: ManufacturerCode.ADEO},
            sprutOccupancyLevel: {ID: 0x6600, type: DataType.UINT16, manufacturerCode: ManufacturerCode.CUSTOM_SPRUT_DEVICE},
            sprutOccupancySensitivity: {ID: 0x6601, type: DataType.UINT16, manufacturerCode: ManufacturerCode.CUSTOM_SPRUT_DEVICE},
        },
        commands: {},
        commandsResponse: {},
    },
    msSoilMoisture: {
        ID: 1032,
        attributes: {
            measuredValue: {ID: 0, type: DataType.UINT16},
            minMeasuredValue: {ID: 1, type: DataType.UINT16},
            maxMeasuredValue: {ID: 2, type: DataType.UINT16},
            tolerance: {ID: 3, type: DataType.UINT16},
        },
        commands: {},
        commandsResponse: {},
    },
    pHMeasurement: {
        ID: 1033,
        attributes: {
            measuredValue: {ID: 0, type: DataType.UINT16},
            minMeasuredValue: {ID: 1, type: DataType.UINT16},
            maxMeasuredValue: {ID: 2, type: DataType.UINT16},
            tolerance: {ID: 3, type: DataType.UINT16},
        },
        commands: {},
        commandsResponse: {},
    },
    msCO2: {
        ID: 1037,
        attributes: {
            measuredValue: {ID: 0, type: DataType.SINGLE_PREC},
            minMeasuredValue: {ID: 1, type: DataType.SINGLE_PREC},
            maxMeasuredValue: {ID: 2, type: DataType.SINGLE_PREC},
            sprutCO2Calibration: {ID: 0x6600, type: DataType.BOOLEAN, manufacturerCode: ManufacturerCode.CUSTOM_SPRUT_DEVICE},
            sprutCO2AutoCalibration: {ID: 0x6601, type: DataType.BOOLEAN, manufacturerCode: ManufacturerCode.CUSTOM_SPRUT_DEVICE},
        },
        commands: {},
        commandsResponse: {},
    },
    pm25Measurement: {
        ID: 0x042a,
        attributes: {
            measuredValue: {ID: 0x0000, type: DataType.SINGLE_PREC},
            measuredMinValue: {ID: 0x0001, type: DataType.SINGLE_PREC},
            measuredMaxValue: {ID: 0x0002, type: DataType.SINGLE_PREC},
            measuredTolerance: {ID: 0x0003, type: DataType.SINGLE_PREC},
        },
        commands: {},
        commandsResponse: {},
    },
    msFormaldehyde: {
        ID: 0x042b,
        attributes: {
            measuredValue: {ID: 0x0000, type: DataType.SINGLE_PREC},
            minMeasuredValue: {ID: 0x0001, type: DataType.SINGLE_PREC},
            maxMeasuredValue: {ID: 0x0002, type: DataType.SINGLE_PREC},
            measuredTolerance: {ID: 0x0003, type: DataType.SINGLE_PREC},
        },
        commands: {},
        commandsResponse: {},
    },
    pm1Measurement: {
        ID: 0x042c,
        attributes: {
            measuredValue: {ID: 0x0000, type: DataType.SINGLE_PREC},
            measuredMinValue: {ID: 0x0001, type: DataType.SINGLE_PREC},
            measuredMaxValue: {ID: 0x0002, type: DataType.SINGLE_PREC},
            measuredTolerance: {ID: 0x0003, type: DataType.SINGLE_PREC},
        },
        commands: {},
        commandsResponse: {},
    },
    pm10Measurement: {
        ID: 0x042d,
        attributes: {
            measuredValue: {ID: 0x0000, type: DataType.SINGLE_PREC},
            measuredMinValue: {ID: 0x0001, type: DataType.SINGLE_PREC},
            measuredMaxValue: {ID: 0x0002, type: DataType.SINGLE_PREC},
            measuredTolerance: {ID: 0x0003, type: DataType.SINGLE_PREC},
        },
        commands: {},
        commandsResponse: {},
    },
    ssIasZone: {
        ID: 1280,
        attributes: {
            zoneState: {ID: 0, type: DataType.ENUM8},
            zoneType: {ID: 1, type: DataType.ENUM16},
            zoneStatus: {ID: 2, type: DataType.BITMAP16},
            iasCieAddr: {ID: 16, type: DataType.IEEE_ADDR},
            zoneId: {ID: 17, type: DataType.UINT8},
            numZoneSensitivityLevelsSupported: {ID: 18, type: DataType.UINT8},
            currentZoneSensitivityLevel: {ID: 19, type: DataType.UINT8},
            develcoAlarmOffDelay: {ID: 0x8001, type: DataType.UINT16, manufacturerCode: ManufacturerCode.DEVELCO},
        },
        commands: {
            enrollRsp: {
                ID: 0,
                parameters: [
                    {name: 'enrollrspcode', type: DataType.UINT8},
                    {name: 'zoneid', type: DataType.UINT8},
                ],
            },
            initNormalOpMode: {
                ID: 1,
                parameters: [],
            },
            initTestMode: {
                ID: 2,
                parameters: [],
            },
        },
        commandsResponse: {
            statusChangeNotification: {
                ID: 0,
                parameters: [
                    {name: 'zonestatus', type: DataType.UINT16},
                    {name: 'extendedstatus', type: DataType.UINT8},
                ],
            },
            enrollReq: {
                ID: 1,
                parameters: [
                    {name: 'zonetype', type: DataType.UINT16},
                    {name: 'manucode', type: DataType.UINT16},
                ],
            },
        },
    },
    ssIasAce: {
        ID: 1281,
        attributes: {},
        commands: {
            arm: {
                ID: 0,
                response: 0,
                parameters: [
                    {name: 'armmode', type: DataType.UINT8},
                    {name: 'code', type: DataType.CHAR_STR},
                    {name: 'zoneid', type: DataType.UINT8},
                ],
            },
            bypass: {
                ID: 1,
                parameters: [
                    {name: 'numofzones', type: DataType.UINT8},
                    {name: 'zoneidlist', type: BuffaloZclDataType.LIST_UINT8},
                ],
            },
            emergency: {
                ID: 2,
                parameters: [],
            },
            fire: {
                ID: 3,
                parameters: [],
            },
            panic: {
                ID: 4,
                parameters: [],
            },
            getZoneIDMap: {
                ID: 5,
                response: 1,
                parameters: [],
            },
            getZoneInfo: {
                ID: 6,
                response: 2,
                parameters: [{name: 'zoneid', type: DataType.UINT8}],
            },
            getPanelStatus: {
                ID: 7,
                response: 5,
                parameters: [],
            },
            getBypassedZoneList: {
                ID: 8,
                parameters: [],
            },
            getZoneStatus: {
                ID: 9,
                response: 8,
                parameters: [
                    {name: 'startzoneid', type: DataType.UINT8},
                    {name: 'maxnumzoneid', type: DataType.UINT8},
                    {name: 'zonestatusmaskflag', type: DataType.UINT8},
                    {name: 'zonestatusmask', type: DataType.UINT16},
                ],
            },
        },
        commandsResponse: {
            armRsp: {
                ID: 0,
                parameters: [{name: 'armnotification', type: DataType.UINT8}],
            },
            getZoneIDMapRsp: {
                ID: 1,
                parameters: [
                    {name: 'zoneidmapsection0', type: DataType.UINT16},
                    {name: 'zoneidmapsection1', type: DataType.UINT16},
                    {name: 'zoneidmapsection2', type: DataType.UINT16},
                    {name: 'zoneidmapsection3', type: DataType.UINT16},
                    {name: 'zoneidmapsection4', type: DataType.UINT16},
                    {name: 'zoneidmapsection5', type: DataType.UINT16},
                    {name: 'zoneidmapsection6', type: DataType.UINT16},
                    {name: 'zoneidmapsection7', type: DataType.UINT16},
                    {name: 'zoneidmapsection8', type: DataType.UINT16},
                    {name: 'zoneidmapsection9', type: DataType.UINT16},
                    {name: 'zoneidmapsection10', type: DataType.UINT16},
                    {name: 'zoneidmapsection11', type: DataType.UINT16},
                    {name: 'zoneidmapsection12', type: DataType.UINT16},
                    {name: 'zoneidmapsection13', type: DataType.UINT16},
                    {name: 'zoneidmapsection14', type: DataType.UINT16},
                    {name: 'zoneidmapsection15', type: DataType.UINT16},
                ],
            },
            getZoneInfoRsp: {
                ID: 2,
                parameters: [
                    {name: 'zoneid', type: DataType.UINT8},
                    {name: 'zonetype', type: DataType.UINT16},
                    {name: 'ieeeaddr', type: DataType.IEEE_ADDR},
                    {name: 'zonelabel', type: DataType.CHAR_STR},
                ],
            },
            zoneStatusChanged: {
                ID: 3,
                parameters: [
                    {name: 'zoneid', type: DataType.UINT8},
                    {name: 'zonestatus', type: DataType.UINT16},
                    {name: 'audiblenotif', type: DataType.UINT8},
                    {name: 'zonelabel', type: DataType.CHAR_STR},
                ],
            },
            panelStatusChanged: {
                ID: 4,
                parameters: [
                    {name: 'panelstatus', type: DataType.UINT8},
                    {name: 'secondsremain', type: DataType.UINT8},
                    {name: 'audiblenotif', type: DataType.UINT8},
                    {name: 'alarmstatus', type: DataType.UINT8},
                ],
            },
            getPanelStatusRsp: {
                ID: 5,
                parameters: [
                    {name: 'panelstatus', type: DataType.UINT8},
                    {name: 'secondsremain', type: DataType.UINT8},
                    {name: 'audiblenotif', type: DataType.UINT8},
                    {name: 'alarmstatus', type: DataType.UINT8},
                ],
            },
            setBypassedZoneList: {
                ID: 6,
                parameters: [
                    {name: 'numofzones', type: DataType.UINT8},
                    {name: 'zoneid', type: BuffaloZclDataType.LIST_UINT8},
                ],
            },
            bypassRsp: {
                ID: 7,
                parameters: [
                    {name: 'numofzones', type: DataType.UINT8},
                    {name: 'bypassresult', type: BuffaloZclDataType.LIST_UINT8},
                ],
            },
            getZoneStatusRsp: {
                ID: 8,
                parameters: [
                    {name: 'zonestatuscomplete', type: DataType.UINT8},
                    {name: 'numofzones', type: DataType.UINT8},
                    {name: 'zoneinfo', type: BuffaloZclDataType.LIST_ZONEINFO},
                ],
            },
        },
    },
    ssIasWd: {
        ID: 1282,
        attributes: {
            maxDuration: {ID: 0, type: DataType.UINT16},
        },
        commands: {
            startWarning: {
                ID: 0,
                parameters: [
                    {name: 'startwarninginfo', type: DataType.UINT8},
                    {name: 'warningduration', type: DataType.UINT16},
                    {name: 'strobedutycycle', type: DataType.UINT8},
                    {name: 'strobelevel', type: DataType.UINT8},
                ],
            },
            squawk: {
                ID: 1,
                parameters: [{name: 'squawkinfo', type: DataType.UINT8}],
            },
        },
        commandsResponse: {},
    },
    piGenericTunnel: {
        ID: 1536,
        attributes: {
            maxIncomeTransSize: {ID: 1, type: DataType.UINT16},
            maxOutgoTransSize: {ID: 2, type: DataType.UINT16},
            protocolAddr: {ID: 3, type: DataType.OCTET_STR},
        },
        commands: {
            matchProtocolAddr: {
                ID: 0,
                parameters: [{name: 'protocoladdr', type: DataType.CHAR_STR}],
            },
        },
        commandsResponse: {
            matchProtocolAddrRsp: {
                ID: 0,
                parameters: [
                    {name: 'devieeeaddr', type: DataType.IEEE_ADDR},
                    {name: 'protocoladdr', type: DataType.CHAR_STR},
                ],
            },
            advertiseProtocolAddr: {
                ID: 1,
                parameters: [{name: 'protocoladdr', type: DataType.CHAR_STR}],
            },
        },
    },
    piBacnetProtocolTunnel: {
        ID: 1537,
        attributes: {},
        commands: {
            transferNpdu: {
                ID: 0,
                parameters: [{name: 'npdu', type: DataType.UINT8}],
            },
        },
        commandsResponse: {},
    },
    piAnalogInputReg: {
        ID: 1538,
        attributes: {
            covIncrement: {ID: 22, type: DataType.SINGLE_PREC},
            deviceType: {ID: 31, type: DataType.CHAR_STR},
            objectId: {ID: 75, type: DataType.BAC_OID},
            objectName: {ID: 77, type: DataType.CHAR_STR},
            objectType: {ID: 79, type: DataType.ENUM16},
            updateInterval: {ID: 118, type: DataType.UINT8},
            profileName: {ID: 168, type: DataType.CHAR_STR},
        },
        commands: {},
        commandsResponse: {},
    },
    piAnalogInputExt: {
        ID: 1539,
        attributes: {
            ackedTransitions: {ID: 0, type: DataType.BITMAP8},
            notificationClass: {ID: 17, type: DataType.UINT16},
            deadband: {ID: 25, type: DataType.SINGLE_PREC},
            eventEnable: {ID: 35, type: DataType.BITMAP8},
            eventState: {ID: 36, type: DataType.ENUM8},
            highLimit: {ID: 45, type: DataType.SINGLE_PREC},
            limitEnable: {ID: 52, type: DataType.BITMAP8},
            lowLimit: {ID: 59, type: DataType.SINGLE_PREC},
            notifyType: {ID: 72, type: DataType.ENUM8},
            timeDelay: {ID: 113, type: DataType.UINT8},
            eventTimeStamps: {ID: 130, type: DataType.ARRAY},
        },
        commands: {
            transferApdu: {
                ID: 0,
                parameters: [],
            },
            connectReq: {
                ID: 1,
                parameters: [],
            },
            disconnectReq: {
                ID: 2,
                parameters: [],
            },
            connectStatusNoti: {
                ID: 3,
                parameters: [],
            },
        },
        commandsResponse: {},
    },
    piAnalogOutputReg: {
        ID: 1540,
        attributes: {
            covIncrement: {ID: 22, type: DataType.SINGLE_PREC},
            deviceType: {ID: 31, type: DataType.CHAR_STR},
            objectId: {ID: 75, type: DataType.BAC_OID},
            objectName: {ID: 77, type: DataType.CHAR_STR},
            objectType: {ID: 79, type: DataType.ENUM16},
            updateInterval: {ID: 118, type: DataType.UINT8},
            profileName: {ID: 168, type: DataType.CHAR_STR},
        },
        commands: {},
        commandsResponse: {},
    },
    piAnalogOutputExt: {
        ID: 1541,
        attributes: {
            ackedTransitions: {ID: 0, type: DataType.BITMAP8},
            notificationClass: {ID: 17, type: DataType.UINT16},
            deadband: {ID: 25, type: DataType.SINGLE_PREC},
            eventEnable: {ID: 35, type: DataType.BITMAP8},
            eventState: {ID: 36, type: DataType.ENUM8},
            highLimit: {ID: 45, type: DataType.SINGLE_PREC},
            limitEnable: {ID: 52, type: DataType.BITMAP8},
            lowLimit: {ID: 59, type: DataType.SINGLE_PREC},
            notifyType: {ID: 72, type: DataType.ENUM8},
            timeDelay: {ID: 113, type: DataType.UINT8},
            eventTimeStamps: {ID: 130, type: DataType.ARRAY},
        },
        commands: {},
        commandsResponse: {},
    },
    piAnalogValueReg: {
        ID: 1542,
        attributes: {
            covIncrement: {ID: 22, type: DataType.SINGLE_PREC},
            objectId: {ID: 75, type: DataType.BAC_OID},
            objectName: {ID: 77, type: DataType.CHAR_STR},
            objectType: {ID: 79, type: DataType.ENUM16},
            profileName: {ID: 168, type: DataType.CHAR_STR},
        },
        commands: {},
        commandsResponse: {},
    },
    piAnalogValueExt: {
        ID: 1543,
        attributes: {
            ackedTransitions: {ID: 0, type: DataType.BITMAP8},
            notificationClass: {ID: 17, type: DataType.UINT16},
            deadband: {ID: 25, type: DataType.SINGLE_PREC},
            eventEnable: {ID: 35, type: DataType.BITMAP8},
            eventState: {ID: 36, type: DataType.ENUM8},
            highLimit: {ID: 45, type: DataType.SINGLE_PREC},
            limitEnable: {ID: 52, type: DataType.BITMAP8},
            lowLimit: {ID: 59, type: DataType.SINGLE_PREC},
            notifyType: {ID: 72, type: DataType.ENUM8},
            timeDelay: {ID: 113, type: DataType.UINT8},
            eventTimeStamps: {ID: 130, type: DataType.ARRAY},
        },
        commands: {},
        commandsResponse: {},
    },
    piBinaryInputReg: {
        ID: 1544,
        attributes: {
            changeOfStateCount: {ID: 15, type: DataType.UINT32},
            changeOfStateTime: {ID: 16, type: DataType.STRUCT},
            deviceType: {ID: 31, type: DataType.CHAR_STR},
            elapsedActiveTime: {ID: 33, type: DataType.UINT32},
            objectIdentifier: {ID: 75, type: DataType.BAC_OID},
            objectName: {ID: 77, type: DataType.CHAR_STR},
            objectType: {ID: 79, type: DataType.ENUM16},
            timeOfATReset: {ID: 114, type: DataType.STRUCT},
            timeOfSCReset: {ID: 115, type: DataType.STRUCT},
            profileName: {ID: 168, type: DataType.CHAR_STR},
        },
        commands: {},
        commandsResponse: {},
    },
    piBinaryInputExt: {
        ID: 1545,
        attributes: {
            ackedTransitions: {ID: 0, type: DataType.BITMAP8},
            alarmValue: {ID: 6, type: DataType.BOOLEAN},
            notificationClass: {ID: 17, type: DataType.UINT16},
            eventEnable: {ID: 35, type: DataType.BITMAP8},
            eventState: {ID: 36, type: DataType.ENUM8},
            notifyType: {ID: 72, type: DataType.ENUM8},
            timeDelay: {ID: 113, type: DataType.UINT8},
            eventTimeStamps: {ID: 130, type: DataType.ARRAY},
        },
        commands: {},
        commandsResponse: {},
    },
    piBinaryOutputReg: {
        ID: 1546,
        attributes: {
            changeOfStateCount: {ID: 15, type: DataType.UINT32},
            changeOfStateTime: {ID: 16, type: DataType.STRUCT},
            deviceType: {ID: 31, type: DataType.CHAR_STR},
            elapsedActiveTime: {ID: 33, type: DataType.UINT32},
            feedBackValue: {ID: 40, type: DataType.ENUM8},
            objectIdentifier: {ID: 75, type: DataType.BAC_OID},
            objectName: {ID: 77, type: DataType.CHAR_STR},
            objectType: {ID: 79, type: DataType.ENUM16},
            timeOfATReset: {ID: 114, type: DataType.STRUCT},
            timeOfSCReset: {ID: 115, type: DataType.STRUCT},
            profileName: {ID: 168, type: DataType.CHAR_STR},
        },
        commands: {},
        commandsResponse: {},
    },
    piBinaryOutputExt: {
        ID: 1547,
        attributes: {
            ackedTransitions: {ID: 0, type: DataType.BITMAP8},
            notificationClass: {ID: 17, type: DataType.UINT16},
            eventEnable: {ID: 35, type: DataType.BITMAP8},
            eventState: {ID: 36, type: DataType.ENUM8},
            notifyType: {ID: 72, type: DataType.ENUM8},
            timeDelay: {ID: 113, type: DataType.UINT8},
            eventTimeStamps: {ID: 130, type: DataType.ARRAY},
        },
        commands: {},
        commandsResponse: {},
    },
    piBinaryValueReg: {
        ID: 1548,
        attributes: {
            changeOfStateCount: {ID: 15, type: DataType.UINT32},
            changeOfStateTime: {ID: 16, type: DataType.STRUCT},
            elapsedActiveTime: {ID: 33, type: DataType.UINT32},
            objectIdentifier: {ID: 75, type: DataType.BAC_OID},
            objectName: {ID: 77, type: DataType.CHAR_STR},
            objectType: {ID: 79, type: DataType.ENUM16},
            timeOfATReset: {ID: 114, type: DataType.STRUCT},
            timeOfSCReset: {ID: 115, type: DataType.STRUCT},
            profileName: {ID: 168, type: DataType.CHAR_STR},
        },
        commands: {},
        commandsResponse: {},
    },
    piBinaryValueExt: {
        ID: 1549,
        attributes: {
            ackedTransitions: {ID: 0, type: DataType.BITMAP8},
            alarmValue: {ID: 6, type: DataType.BOOLEAN},
            notificationClass: {ID: 17, type: DataType.UINT16},
            eventEnable: {ID: 35, type: DataType.BITMAP8},
            eventState: {ID: 36, type: DataType.ENUM8},
            notifyType: {ID: 72, type: DataType.ENUM8},
            timeDelay: {ID: 113, type: DataType.UINT8},
            eventTimeStamps: {ID: 130, type: DataType.ARRAY},
        },
        commands: {},
        commandsResponse: {},
    },
    piMultistateInputReg: {
        ID: 1550,
        attributes: {
            deviceType: {ID: 31, type: DataType.CHAR_STR},
            objectId: {ID: 75, type: DataType.BAC_OID},
            objectName: {ID: 77, type: DataType.CHAR_STR},
            objectType: {ID: 79, type: DataType.ENUM16},
            profileName: {ID: 168, type: DataType.CHAR_STR},
        },
        commands: {},
        commandsResponse: {},
    },
    piMultistateInputExt: {
        ID: 1551,
        attributes: {
            ackedTransitions: {ID: 0, type: DataType.BITMAP8},
            alarmValue: {ID: 6, type: DataType.UINT16},
            notificationClass: {ID: 17, type: DataType.UINT16},
            eventEnable: {ID: 35, type: DataType.BITMAP8},
            eventState: {ID: 36, type: DataType.ENUM8},
            faultValues: {ID: 37, type: DataType.UINT16},
            notifyType: {ID: 72, type: DataType.ENUM8},
            timeDelay: {ID: 113, type: DataType.UINT8},
            eventTimeStamps: {ID: 130, type: DataType.ARRAY},
        },
        commands: {},
        commandsResponse: {},
    },
    piMultistateOutputReg: {
        ID: 1552,
        attributes: {
            deviceType: {ID: 31, type: DataType.CHAR_STR},
            feedBackValue: {ID: 40, type: DataType.ENUM8},
            objectId: {ID: 75, type: DataType.BAC_OID},
            objectName: {ID: 77, type: DataType.CHAR_STR},
            objectType: {ID: 79, type: DataType.ENUM16},
            profileName: {ID: 168, type: DataType.CHAR_STR},
        },
        commands: {},
        commandsResponse: {},
    },
    piMultistateOutputExt: {
        ID: 1553,
        attributes: {
            ackedTransitions: {ID: 0, type: DataType.BITMAP8},
            notificationClass: {ID: 17, type: DataType.UINT16},
            eventEnable: {ID: 35, type: DataType.BITMAP8},
            eventState: {ID: 36, type: DataType.ENUM8},
            notifyType: {ID: 72, type: DataType.ENUM8},
            timeDelay: {ID: 113, type: DataType.UINT8},
            eventTimeStamps: {ID: 130, type: DataType.ARRAY},
        },
        commands: {},
        commandsResponse: {},
    },
    piMultistateValueReg: {
        ID: 1554,
        attributes: {
            objectId: {ID: 75, type: DataType.BAC_OID},
            objectName: {ID: 77, type: DataType.CHAR_STR},
            objectType: {ID: 79, type: DataType.ENUM16},
            profileName: {ID: 168, type: DataType.CHAR_STR},
        },
        commands: {},
        commandsResponse: {},
    },
    piMultistateValueExt: {
        ID: 1555,
        attributes: {
            ackedTransitions: {ID: 0, type: DataType.BITMAP8},
            alarmValue: {ID: 6, type: DataType.UINT16},
            notificationClass: {ID: 17, type: DataType.UINT16},
            eventEnable: {ID: 35, type: DataType.BITMAP8},
            eventState: {ID: 36, type: DataType.ENUM8},
            faultValues: {ID: 37, type: DataType.UINT16},
            notifyType: {ID: 72, type: DataType.ENUM8},
            timeDelay: {ID: 113, type: DataType.UINT8},
            eventTimeStamps: {ID: 130, type: DataType.ARRAY},
        },
        commands: {},
        commandsResponse: {},
    },
    pi11073ProtocolTunnel: {
        ID: 1556,
        attributes: {
            deviceidList: {ID: 0, type: DataType.ARRAY},
            managerTarget: {ID: 1, type: DataType.IEEE_ADDR},
            managerEndpoint: {ID: 2, type: DataType.UINT8},
            connected: {ID: 3, type: DataType.BOOLEAN},
            preemptible: {ID: 4, type: DataType.BOOLEAN},
            idleTimeout: {ID: 5, type: DataType.UINT16},
        },
        commands: {
            transferApdu: {
                ID: 0,
                parameters: [],
            },
            connectReq: {
                ID: 1,
                parameters: [],
            },
            disconnectReq: {
                ID: 2,
                parameters: [],
            },
            connectStatusNoti: {
                ID: 3,
                parameters: [],
            },
        },
        commandsResponse: {},
    },
    piIso7818ProtocolTunnel: {
        ID: 1557,
        attributes: {
            status: {ID: 0, type: DataType.UINT8},
        },
        commands: {},
        commandsResponse: {},
    },
    piRetailTunnel: {
        ID: 1559,
        attributes: {
            manufacturerCode: {ID: 0, type: DataType.UINT16},
            msProfile: {ID: 1, type: DataType.UINT16},
        },
        commands: {},
        commandsResponse: {},
    },
    seMetering: {
        ID: 1794,
        attributes: {
            currentSummDelivered: {ID: 0, type: DataType.UINT48},
            currentSummReceived: {ID: 1, type: DataType.UINT48},
            currentMaxDemandDelivered: {ID: 2, type: DataType.UINT48},
            currentMaxDemandReceived: {ID: 3, type: DataType.UINT48},
            dftSumm: {ID: 4, type: DataType.UINT48},
            dailyFreezeTime: {ID: 5, type: DataType.UINT16},
            powerFactor: {ID: 6, type: DataType.INT8},
            readingSnapshotTime: {ID: 7, type: DataType.UTC},
            currentMaxDemandDeliverdTime: {ID: 8, type: DataType.UTC},
            currentMaxDemandReceivedTime: {ID: 9, type: DataType.UTC},
            defaultUpdatePeriod: {ID: 10, type: DataType.UINT8},
            fastPollUpdatePeriod: {ID: 11, type: DataType.UINT8},
            currentBlockPeriodConsumpDelivered: {ID: 12, type: DataType.UINT48},
            dailyConsumpTarget: {ID: 13, type: DataType.UINT24},
            currentBlock: {ID: 14, type: DataType.ENUM8},
            profileIntervalPeriod: {ID: 15, type: DataType.ENUM8},
            intervalReadReportingPeriod: {ID: 16, type: DataType.UINT16},
            presetReadingTime: {ID: 17, type: DataType.UINT16},
            volumePerReport: {ID: 18, type: DataType.UINT16},
            flowRestriction: {ID: 19, type: DataType.UINT8},
            supplyStatus: {ID: 20, type: DataType.ENUM8},
            currentInEnergyCarrierSumm: {ID: 21, type: DataType.UINT48},
            currentOutEnergyCarrierSumm: {ID: 22, type: DataType.UINT48},
            inletTempreature: {ID: 23, type: DataType.INT24},
            outletTempreature: {ID: 24, type: DataType.INT24},
            controlTempreature: {ID: 25, type: DataType.INT24},
            currentInEnergyCarrierDemand: {ID: 26, type: DataType.INT24},
            currentOutEnergyCarrierDemand: {ID: 27, type: DataType.INT24},
            currentBlockPeriodConsumpReceived: {ID: 29, type: DataType.UINT48},
            currentBlockReceived: {ID: 30, type: DataType.UINT48},
            DFTSummationReceived: {ID: 31, type: DataType.UINT48},
            activeRegisterTierDelivered: {ID: 32, type: DataType.ENUM8},
            activeRegisterTierReceived: {ID: 33, type: DataType.ENUM8},
            currentTier1SummDelivered: {ID: 256, type: DataType.UINT48},
            currentTier1SummReceived: {ID: 257, type: DataType.UINT48},
            currentTier2SummDelivered: {ID: 258, type: DataType.UINT48},
            currentTier2SummReceived: {ID: 259, type: DataType.UINT48},
            currentTier3SummDelivered: {ID: 260, type: DataType.UINT48},
            currentTier3SummReceived: {ID: 261, type: DataType.UINT48},
            currentTier4SummDelivered: {ID: 262, type: DataType.UINT48},
            currentTier4SummReceived: {ID: 263, type: DataType.UINT48},
            currentTier5SummDelivered: {ID: 264, type: DataType.UINT48},
            currentTier5SummReceived: {ID: 265, type: DataType.UINT48},
            currentTier6SummDelivered: {ID: 266, type: DataType.UINT48},
            currentTier6SummReceived: {ID: 267, type: DataType.UINT48},
            currentTier7SummDelivered: {ID: 268, type: DataType.UINT48},
            currentTier7SummReceived: {ID: 269, type: DataType.UINT48},
            currentTier8SummDelivered: {ID: 270, type: DataType.UINT48},
            currentTier8SummReceived: {ID: 271, type: DataType.UINT48},
            currentTier9SummDelivered: {ID: 272, type: DataType.UINT48},
            currentTier9SummReceived: {ID: 273, type: DataType.UINT48},
            currentTier10SummDelivered: {ID: 274, type: DataType.UINT48},
            currentTier10SummReceived: {ID: 275, type: DataType.UINT48},
            currentTier11SummDelivered: {ID: 276, type: DataType.UINT48},
            currentTier11SummReceived: {ID: 277, type: DataType.UINT48},
            currentTier12SummDelivered: {ID: 278, type: DataType.UINT48},
            currentTier12SummReceived: {ID: 279, type: DataType.UINT48},
            currentTier13SummDelivered: {ID: 280, type: DataType.UINT48},
            currentTier13SummReceived: {ID: 281, type: DataType.UINT48},
            currentTier14SummDelivered: {ID: 282, type: DataType.UINT48},
            currentTier14SummReceived: {ID: 283, type: DataType.UINT48},
            currentTier15SummDelivered: {ID: 284, type: DataType.UINT48},
            currentTier15SummReceived: {ID: 285, type: DataType.UINT48},
            status: {ID: 512, type: DataType.BITMAP8},
            remainingBattLife: {ID: 513, type: DataType.UINT8},
            hoursInOperation: {ID: 514, type: DataType.UINT24},
            hoursInFault: {ID: 515, type: DataType.UINT24},
            extendedStatus: {ID: 516, type: DataType.BITMAP64},
            unitOfMeasure: {ID: 768, type: DataType.ENUM8},
            multiplier: {ID: 769, type: DataType.UINT24},
            divisor: {ID: 770, type: DataType.UINT24},
            summaFormatting: {ID: 771, type: DataType.BITMAP8},
            demandFormatting: {ID: 772, type: DataType.BITMAP8},
            historicalConsumpFormatting: {ID: 773, type: DataType.BITMAP8},
            meteringDeviceType: {ID: 774, type: DataType.BITMAP8},
            siteId: {ID: 775, type: DataType.OCTET_STR},
            meterSerialNumber: {ID: 776, type: DataType.OCTET_STR},
            energyCarrierUnitOfMeas: {ID: 777, type: DataType.ENUM8},
            energyCarrierSummFormatting: {ID: 778, type: DataType.BITMAP8},
            energyCarrierDemandFormatting: {ID: 779, type: DataType.BITMAP8},
            temperatureUnitOfMeas: {ID: 780, type: DataType.ENUM8},
            temperatureFormatting: {ID: 781, type: DataType.BITMAP8},
            moduleSerialNumber: {ID: 782, type: DataType.OCTET_STR},
            operatingTariffLevel: {ID: 783, type: DataType.OCTET_STR},
            instantaneousDemand: {ID: 1024, type: DataType.INT24},
            currentdayConsumpDelivered: {ID: 1025, type: DataType.UINT24},
            currentdayConsumpReceived: {ID: 1026, type: DataType.UINT24},
            previousdayConsumpDelivered: {ID: 1027, type: DataType.UINT24},
            previousdayConsumpReceived: {ID: 1028, type: DataType.UINT24},
            curPartProfileIntStartTimeDelivered: {ID: 1029, type: DataType.UTC},
            curPartProfileIntStartTimeReceived: {ID: 1030, type: DataType.UTC},
            curPartProfileIntValueDelivered: {ID: 1031, type: DataType.UINT24},
            curPartProfileIntValueReceived: {ID: 1032, type: DataType.UINT24},
            currentDayMaxPressure: {ID: 1033, type: DataType.UINT48},
            currentDayMinPressure: {ID: 1034, type: DataType.UINT48},
            previousDayMaxPressure: {ID: 1035, type: DataType.UINT48},
            previousDayMinPressure: {ID: 1036, type: DataType.UINT48},
            currentDayMaxDemand: {ID: 1037, type: DataType.INT24},
            previousDayMaxDemand: {ID: 1038, type: DataType.INT24},
            currentMonthMaxDemand: {ID: 1039, type: DataType.INT24},
            currentYearMaxDemand: {ID: 1040, type: DataType.INT24},
            currentdayMaxEnergyCarrDemand: {ID: 1041, type: DataType.INT24},
            previousdayMaxEnergyCarrDemand: {ID: 1042, type: DataType.INT24},
            curMonthMaxEnergyCarrDemand: {ID: 1043, type: DataType.INT24},
            curMonthMinEnergyCarrDemand: {ID: 1044, type: DataType.INT24},
            curYearMaxEnergyCarrDemand: {ID: 1045, type: DataType.INT24},
            curYearMinEnergyCarrDemand: {ID: 1046, type: DataType.INT24},
            maxNumberOfPeriodsDelivered: {ID: 1280, type: DataType.UINT8},
            currentDemandDelivered: {ID: 1536, type: DataType.UINT24},
            demandLimit: {ID: 1537, type: DataType.UINT24},
            demandIntegrationPeriod: {ID: 1538, type: DataType.UINT8},
            numberOfDemandSubintervals: {ID: 1539, type: DataType.UINT8},
            demandLimitArmDuration: {ID: 1540, type: DataType.UINT16},
            genericAlarmMask: {ID: 2048, type: DataType.BITMAP16},
            electricityAlarmMask: {ID: 2049, type: DataType.BITMAP32},
            genFlowPressureAlarmMask: {ID: 2050, type: DataType.BITMAP16},
            waterSpecificAlarmMask: {ID: 2051, type: DataType.BITMAP16},
            heatCoolSpecificAlarmMASK: {ID: 2052, type: DataType.BITMAP16},
            gasSpecificAlarmMask: {ID: 2053, type: DataType.BITMAP16},
            extendedGenericAlarmMask: {ID: 2054, type: DataType.BITMAP48},
            manufactureAlarmMask: {ID: 2055, type: DataType.BITMAP16},
            billToDate: {ID: 2560, type: DataType.UINT32},
            billToDateTimeStamp: {ID: 2561, type: DataType.UTC},
            projectedBill: {ID: 2562, type: DataType.UINT32},
            projectedBillTimeStamp: {ID: 2563, type: DataType.UTC},
            develcoPulseConfiguration: {ID: 0x0300, type: DataType.UINT16, manufacturerCode: ManufacturerCode.DEVELCO},
            develcoCurrentSummation: {ID: 0x0301, type: DataType.UINT48, manufacturerCode: ManufacturerCode.DEVELCO},
            develcoInterfaceMode: {ID: 0x0302, type: DataType.ENUM16, manufacturerCode: ManufacturerCode.DEVELCO},
            owonL1PhasePower: {ID: 0x2000, type: DataType.INT24, manufacturerCode: ManufacturerCode.OWON_TECHNOLOGY_INC},
            owonL2PhasePower: {ID: 0x2001, type: DataType.INT24, manufacturerCode: ManufacturerCode.OWON_TECHNOLOGY_INC},
            owonL3PhasePower: {ID: 0x2002, type: DataType.INT24, manufacturerCode: ManufacturerCode.OWON_TECHNOLOGY_INC},
            owonL1PhaseReactivePower: {ID: 0x2100, type: DataType.INT24, manufacturerCode: ManufacturerCode.OWON_TECHNOLOGY_INC},
            owonL2PhaseReactivePower: {ID: 0x2101, type: DataType.INT24, manufacturerCode: ManufacturerCode.OWON_TECHNOLOGY_INC},
            owonL3PhaseReactivePower: {ID: 0x2102, type: DataType.INT24, manufacturerCode: ManufacturerCode.OWON_TECHNOLOGY_INC},
            owonReactivePowerSum: {ID: 0x2103, type: DataType.INT24, manufacturerCode: ManufacturerCode.OWON_TECHNOLOGY_INC},
            owonL1PhaseVoltage: {ID: 0x3000, type: DataType.UINT24, manufacturerCode: ManufacturerCode.OWON_TECHNOLOGY_INC},
            owonL2PhaseVoltage: {ID: 0x3001, type: DataType.UINT24, manufacturerCode: ManufacturerCode.OWON_TECHNOLOGY_INC},
            owonL3PhaseVoltage: {ID: 0x3002, type: DataType.UINT24, manufacturerCode: ManufacturerCode.OWON_TECHNOLOGY_INC},
            owonL1PhaseCurrent: {ID: 0x3100, type: DataType.UINT24, manufacturerCode: ManufacturerCode.OWON_TECHNOLOGY_INC},
            owonL2PhaseCurrent: {ID: 0x3101, type: DataType.UINT24, manufacturerCode: ManufacturerCode.OWON_TECHNOLOGY_INC},
            owonL3PhaseCurrent: {ID: 0x3102, type: DataType.UINT24, manufacturerCode: ManufacturerCode.OWON_TECHNOLOGY_INC},
            owonCurrentSum: {ID: 0x3103, type: DataType.UINT24, manufacturerCode: ManufacturerCode.OWON_TECHNOLOGY_INC},
            owonLeakageCurrent: {ID: 0x3104, type: DataType.UINT24, manufacturerCode: ManufacturerCode.OWON_TECHNOLOGY_INC},
            owonL1Energy: {ID: 0x4000, type: DataType.UINT48, manufacturerCode: ManufacturerCode.OWON_TECHNOLOGY_INC},
            owonL2Energy: {ID: 0x4001, type: DataType.UINT48, manufacturerCode: ManufacturerCode.OWON_TECHNOLOGY_INC},
            owonL3Energy: {ID: 0x4002, type: DataType.UINT48, manufacturerCode: ManufacturerCode.OWON_TECHNOLOGY_INC},
            owonL1ReactiveEnergy: {ID: 0x4100, type: DataType.UINT48, manufacturerCode: ManufacturerCode.OWON_TECHNOLOGY_INC},
            owonL2ReactiveEnergy: {ID: 0x4101, type: DataType.UINT48, manufacturerCode: ManufacturerCode.OWON_TECHNOLOGY_INC},
            owonL3ReactiveEnergy: {ID: 0x4102, type: DataType.UINT48, manufacturerCode: ManufacturerCode.OWON_TECHNOLOGY_INC},
            owonReactiveEnergySum: {ID: 0x4103, type: DataType.UINT48, manufacturerCode: ManufacturerCode.OWON_TECHNOLOGY_INC},
            owonL1PowerFactor: {ID: 0x4104, type: DataType.INT8, manufacturerCode: ManufacturerCode.OWON_TECHNOLOGY_INC},
            owonL2PowerFactor: {ID: 0x4105, type: DataType.INT8, manufacturerCode: ManufacturerCode.OWON_TECHNOLOGY_INC},
            owonL3PowerFactor: {ID: 0x4106, type: DataType.INT8, manufacturerCode: ManufacturerCode.OWON_TECHNOLOGY_INC},
            owonFrequency: {ID: 0x5005, type: DataType.UINT8, manufacturerCode: ManufacturerCode.OWON_TECHNOLOGY_INC},
            owonReportMap: {ID: 0x1000, type: DataType.BITMAP8, manufacturerCode: ManufacturerCode.OWON_TECHNOLOGY_INC},
            owonLastHistoricalRecordTime: {ID: 0x5000, type: DataType.UINT32, manufacturerCode: ManufacturerCode.OWON_TECHNOLOGY_INC},
            owonOldestHistoricalRecordTime: {ID: 0x5001, type: DataType.UINT32, manufacturerCode: ManufacturerCode.OWON_TECHNOLOGY_INC},
            owonMinimumReportCycle: {ID: 0x5002, type: DataType.UINT32, manufacturerCode: ManufacturerCode.OWON_TECHNOLOGY_INC},
            owonMaximumReportCycle: {ID: 0x5003, type: DataType.UINT32, manufacturerCode: ManufacturerCode.OWON_TECHNOLOGY_INC},
            owonSentHistoricalRecordState: {ID: 0x5004, type: DataType.UINT8, manufacturerCode: ManufacturerCode.OWON_TECHNOLOGY_INC},
            owonAccumulativeEnergyThreshold: {ID: 0x5006, type: DataType.UINT8, manufacturerCode: ManufacturerCode.OWON_TECHNOLOGY_INC},
            owonReportMode: {ID: 0x5007, type: DataType.UINT8, manufacturerCode: ManufacturerCode.OWON_TECHNOLOGY_INC},
            owonPercentChangeInPower: {ID: 0x5008, type: DataType.UINT8, manufacturerCode: ManufacturerCode.OWON_TECHNOLOGY_INC},
            schneiderActiveEnergyTotal: {ID: 0x4010, type: DataType.INT48, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderReactiveEnergyTotal: {ID: 0x4011, type: DataType.INT48, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderApparentEnergyTotal: {ID: 0x4012, type: DataType.INT48, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderPartialActiveEnergyTotal: {ID: 0x4014, type: DataType.INT48, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderPartialReactiveEnergyTotal: {ID: 0x4015, type: DataType.INT48, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderPartialApparentEnergyTotal: {ID: 0x4016, type: DataType.INT48, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderPartialActiveEnergyL1Phase: {ID: 0x4100, type: DataType.INT48, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderPartialReactiveEnergyL1Phase: {ID: 0x4101, type: DataType.INT48, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderPartialApparentEnergyL1Phase: {ID: 0x4102, type: DataType.INT48, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderActiveEnergyL1Phase: {ID: 0x4103, type: DataType.INT48, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderReactiveEnergyL1Phase: {ID: 0x4104, type: DataType.INT48, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderApparentEnergyL1Phase: {ID: 0x4105, type: DataType.INT48, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderPartialActiveEnergyL2Phase: {ID: 0x4200, type: DataType.INT48, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderPartialReactiveEnergyL2Phase: {ID: 0x4201, type: DataType.INT48, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderPartialApparentEnergyL2Phase: {ID: 0x4202, type: DataType.INT48, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderActiveEnergyL2Phase: {ID: 0x4203, type: DataType.INT48, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderReactiveEnergyL2Phase: {ID: 0x4204, type: DataType.INT48, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderApparentEnergyL2Phase: {ID: 0x4205, type: DataType.INT48, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderPartialActiveEnergyL3Phase: {ID: 0x4300, type: DataType.INT48, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderPartialReactiveEnergyL3Phase: {ID: 0x4301, type: DataType.INT48, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderPartialApparentEnergyL3Phase: {ID: 0x4302, type: DataType.INT48, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderActiveEnergyL3Phase: {ID: 0x4303, type: DataType.INT48, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderReactiveEnergyL3Phase: {ID: 0x4304, type: DataType.INT48, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderApparentEnergyL3Phase: {ID: 0x4305, type: DataType.INT48, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderActiveEnergyMultiplier: {ID: 0x4400, type: DataType.UINT24, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderActiveEnergyDivisor: {ID: 0x4401, type: DataType.UINT24, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderReactiveEnergyMultiplier: {ID: 0x4402, type: DataType.UINT24, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderReactiveEnergyDivisor: {ID: 0x4403, type: DataType.UINT24, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderApparentEnergyMultiplier: {ID: 0x4404, type: DataType.UINT24, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderApparentEnergyDivisor: {ID: 0x4405, type: DataType.UINT24, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderEnergyResetDateTime: {ID: 0x4501, type: DataType.UTC, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderEnergyCountersReportingPeriod: {ID: 0x4600, type: DataType.UINT16, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
        },
        commands: {
            getProfile: {
                ID: 0,
                parameters: [],
            },
            reqMirror: {
                ID: 1,
                parameters: [],
            },
            mirrorRem: {
                ID: 2,
                parameters: [],
            },
            reqFastPollMode: {
                ID: 3,
                parameters: [],
            },
            getSnapshot: {
                ID: 4,
                parameters: [],
            },
            takeSnapshot: {
                ID: 5,
                parameters: [],
            },
            mirrorReportAttrRsp: {
                ID: 6,
                parameters: [],
            },
            owonGetHistoryRecord: {
                ID: 0x20,
                parameters: [],
            },
            owonStopSendingHistoricalRecord: {
                ID: 0x21,
                parameters: [],
            },
        },
        commandsResponse: {
            getProfileRsp: {
                ID: 0,
                parameters: [],
            },
            reqMirrorRsp: {
                ID: 1,
                parameters: [],
            },
            mirrorRemRsp: {
                ID: 2,
                parameters: [],
            },
            reqFastPollModeRsp: {
                ID: 3,
                parameters: [],
            },
            getSnapshotRsp: {
                ID: 4,
                parameters: [],
            },
            owonGetHistoryRecordRsp: {
                ID: 0x20,
                parameters: [],
            },
        },
    },
    tunneling: {
        ID: 0x0704,
        attributes: {},
        commands: {
            transferData: {
                ID: 2,
                parameters: [
                    {name: 'tunnelID', type: DataType.UINT16},
                    {name: 'data', type: BuffaloZclDataType.BUFFER},
                ],
            },
        },
        commandsResponse: {
            transferDataResp: {
                ID: 1,
                parameters: [
                    {name: 'tunnelID', type: DataType.UINT16},
                    {name: 'data', type: BuffaloZclDataType.BUFFER},
                ],
            },
        },
    },
    telecommunicationsInformation: {
        ID: 2304,
        attributes: {
            nodeDescription: {ID: 0, type: DataType.CHAR_STR},
            deliveryEnable: {ID: 1, type: DataType.BOOLEAN},
            pushInformationTimer: {ID: 2, type: DataType.UINT32},
            enableSecureConfiguration: {ID: 3, type: DataType.BOOLEAN},
            numberOfContents: {ID: 16, type: DataType.UINT16},
            contentRootID: {ID: 17, type: DataType.UINT16},
        },
        commands: {},
        commandsResponse: {},
    },
    telecommunicationsVoiceOverZigbee: {
        ID: 2308,
        attributes: {
            codecType: {ID: 0, type: DataType.ENUM8},
            samplingFrequency: {ID: 1, type: DataType.ENUM8},
            codecrate: {ID: 2, type: DataType.ENUM8},
            establishmentTimeout: {ID: 3, type: DataType.UINT8},
            codecTypeSub1: {ID: 4, type: DataType.ENUM8},
            codecTypeSub2: {ID: 5, type: DataType.ENUM8},
            codecTypeSub3: {ID: 6, type: DataType.ENUM8},
            compressionType: {ID: 7, type: DataType.ENUM8},
            compressionRate: {ID: 8, type: DataType.ENUM8},
            optionFlags: {ID: 9, type: DataType.BITMAP8},
            threshold: {ID: 10, type: DataType.UINT8},
        },
        commands: {},
        commandsResponse: {},
    },
    telecommunicationsChatting: {
        ID: 2309,
        attributes: {
            uID: {ID: 0, type: DataType.UINT16},
            nickname: {ID: 1, type: DataType.CHAR_STR},
            cID: {ID: 16, type: DataType.UINT16},
            name: {ID: 17, type: DataType.CHAR_STR},
            enableAddChat: {ID: 18, type: DataType.BOOLEAN},
        },
        commands: {},
        commandsResponse: {},
    },
    haApplianceIdentification: {
        ID: 2816,
        attributes: {
            basicIdentification: {ID: 0, type: DataType.UINT56},
            companyName: {ID: 16, type: DataType.CHAR_STR},
            companyId: {ID: 17, type: DataType.UINT16},
            brandName: {ID: 18, type: DataType.CHAR_STR},
            brandId: {ID: 19, type: DataType.UINT16},
            model: {ID: 20, type: DataType.OCTET_STR},
            partNumber: {ID: 21, type: DataType.OCTET_STR},
            productRevision: {ID: 22, type: DataType.OCTET_STR},
            softwareRevision: {ID: 23, type: DataType.OCTET_STR},
            productTypeName: {ID: 24, type: DataType.OCTET_STR},
            productTypeId: {ID: 25, type: DataType.UINT16},
            cecedSpecificationVersion: {ID: 26, type: DataType.UINT8},
        },
        commands: {},
        commandsResponse: {},
    },
    haMeterIdentification: {
        ID: 2817,
        attributes: {
            companyName: {ID: 0, type: DataType.CHAR_STR},
            meterTypeId: {ID: 1, type: DataType.UINT16},
            dataQualityId: {ID: 4, type: DataType.UINT16},
            customerName: {ID: 5, type: DataType.CHAR_STR},
            model: {ID: 6, type: DataType.CHAR_STR},
            partNumber: {ID: 7, type: DataType.CHAR_STR},
            productRevision: {ID: 8, type: DataType.CHAR_STR},
            softwareRevision: {ID: 10, type: DataType.CHAR_STR},
            utilityName: {ID: 11, type: DataType.CHAR_STR},
            pod: {ID: 12, type: DataType.CHAR_STR},
            availablePower: {ID: 13, type: DataType.INT24},
            powerThreshold: {ID: 14, type: DataType.INT24},
        },
        commands: {},
        commandsResponse: {},
    },
    haApplianceEventsAlerts: {
        ID: 2818,
        attributes: {},
        commands: {
            getAlerts: {
                ID: 0,
                parameters: [],
            },
        },
        commandsResponse: {
            getAlertsRsp: {
                ID: 0,
                parameters: [
                    {name: 'alertscount', type: DataType.UINT8},
                    {name: 'aalert', type: BuffaloZclDataType.LIST_UINT24},
                ],
            },
            alertsNotification: {
                ID: 1,
                parameters: [
                    {name: 'alertscount', type: DataType.UINT8},
                    {name: 'aalert', type: BuffaloZclDataType.LIST_UINT24},
                ],
            },
            eventNotification: {
                ID: 2,
                parameters: [
                    {name: 'eventheader', type: DataType.UINT8},
                    {name: 'eventid', type: DataType.UINT8},
                ],
            },
        },
    },
    haApplianceStatistics: {
        ID: 2819,
        attributes: {
            logMaxSize: {ID: 0, type: DataType.UINT32},
            logQueueMaxSize: {ID: 1, type: DataType.UINT8},
        },
        commands: {
            log: {
                ID: 0,
                parameters: [{name: 'logid', type: DataType.UINT32}],
            },
            logQueue: {
                ID: 1,
                parameters: [],
            },
        },
        commandsResponse: {
            logNotification: {
                ID: 0,
                parameters: [
                    {name: 'timestamp', type: DataType.UINT32},
                    {name: 'logid', type: DataType.UINT32},
                    {name: 'loglength', type: DataType.UINT32},
                    {name: 'logpayload', type: BuffaloZclDataType.LIST_UINT8},
                ],
            },
            logRsp: {
                ID: 1,
                parameters: [
                    {name: 'timestamp', type: DataType.UINT32},
                    {name: 'logid', type: DataType.UINT32},
                    {name: 'loglength', type: DataType.UINT32},
                    {name: 'logpayload', type: BuffaloZclDataType.LIST_UINT8},
                ],
            },
            logQueueRsp: {
                ID: 2,
                parameters: [
                    {name: 'logqueuesize', type: DataType.UINT8},
                    {name: 'logid', type: BuffaloZclDataType.LIST_UINT32},
                ],
            },
            statisticsAvailable: {
                ID: 3,
                parameters: [
                    {name: 'logqueuesize', type: DataType.UINT8},
                    {name: 'logid', type: BuffaloZclDataType.LIST_UINT32},
                ],
            },
        },
    },
    haElectricalMeasurement: {
        ID: 2820,
        attributes: {
            measurementType: {ID: 0, type: DataType.BITMAP32},
            dcVoltage: {ID: 256, type: DataType.INT16},
            dcVoltageMin: {ID: 257, type: DataType.INT16},
            dcvoltagemax: {ID: 258, type: DataType.INT16},
            dcCurrent: {ID: 259, type: DataType.INT16},
            dcCurrentMin: {ID: 260, type: DataType.INT16},
            dcCurrentMax: {ID: 261, type: DataType.INT16},
            dcPower: {ID: 262, type: DataType.INT16},
            dcPowerMin: {ID: 263, type: DataType.INT16},
            dcPowerMax: {ID: 264, type: DataType.INT16},
            dcVoltageMultiplier: {ID: 512, type: DataType.UINT16},
            dcVoltageDivisor: {ID: 513, type: DataType.UINT16},
            dcCurrentMultiplier: {ID: 514, type: DataType.UINT16},
            dcCurrentDivisor: {ID: 515, type: DataType.UINT16},
            dcPowerMultiplier: {ID: 516, type: DataType.UINT16},
            dcPowerDivisor: {ID: 517, type: DataType.UINT16},
            acFrequency: {ID: 768, type: DataType.UINT16},
            acFrequencyMin: {ID: 769, type: DataType.UINT16},
            acFrequencyMax: {ID: 770, type: DataType.UINT16},
            neutralCurrent: {ID: 771, type: DataType.UINT16},
            totalActivePower: {ID: 772, type: DataType.INT32},
            totalReactivePower: {ID: 773, type: DataType.INT32},
            totalApparentPower: {ID: 774, type: DataType.UINT32},
            meas1stHarmonicCurrent: {ID: 775, type: DataType.INT16},
            meas3rdHarmonicCurrent: {ID: 776, type: DataType.INT16},
            meas5thHarmonicCurrent: {ID: 777, type: DataType.INT16},
            meas7thHarmonicCurrent: {ID: 778, type: DataType.INT16},
            meas9thHarmonicCurrent: {ID: 779, type: DataType.INT16},
            meas11thHarmonicCurrent: {ID: 780, type: DataType.INT16},
            measPhase1stHarmonicCurrent: {ID: 781, type: DataType.INT16},
            measPhase3rdHarmonicCurrent: {ID: 782, type: DataType.INT16},
            measPhase5thHarmonicCurrent: {ID: 783, type: DataType.INT16},
            measPhase7thHarmonicCurrent: {ID: 784, type: DataType.INT16},
            measPhase9thHarmonicCurrent: {ID: 785, type: DataType.INT16},
            measPhase11thHarmonicCurrent: {ID: 786, type: DataType.INT16},
            acFrequencyMultiplier: {ID: 1024, type: DataType.UINT16},
            acFrequencyDivisor: {ID: 1025, type: DataType.UINT16},
            powerMultiplier: {ID: 1026, type: DataType.UINT32},
            powerDivisor: {ID: 1027, type: DataType.UINT32},
            harmonicCurrentMultiplier: {ID: 1028, type: DataType.INT8},
            phaseHarmonicCurrentMultiplier: {ID: 1029, type: DataType.INT8},
            instantaneousVoltage: {ID: 1280, type: DataType.INT16},
            instantaneousLineCurrent: {ID: 1281, type: DataType.UINT16},
            instantaneousActiveCurrent: {ID: 1282, type: DataType.INT16},
            instantaneousReactiveCurrent: {ID: 1283, type: DataType.INT16},
            instantaneousPower: {ID: 1284, type: DataType.INT16},
            rmsVoltage: {ID: 1285, type: DataType.UINT16},
            rmsVoltageMin: {ID: 1286, type: DataType.UINT16},
            rmsVoltageMax: {ID: 1287, type: DataType.UINT16},
            rmsCurrent: {ID: 1288, type: DataType.UINT16},
            rmsCurrentMin: {ID: 1289, type: DataType.UINT16},
            rmsCurrentMax: {ID: 1290, type: DataType.UINT16},
            activePower: {ID: 1291, type: DataType.INT16},
            activePowerMin: {ID: 1292, type: DataType.INT16},
            activePowerMax: {ID: 1293, type: DataType.INT16},
            reactivePower: {ID: 1294, type: DataType.INT16},
            apparentPower: {ID: 1295, type: DataType.UINT16},
            powerFactor: {ID: 1296, type: DataType.INT8},
            averageRmsVoltageMeasPeriod: {ID: 1297, type: DataType.UINT16},
            averageRmsOverVoltageCounter: {ID: 1298, type: DataType.UINT16},
            averageRmsUnderVoltageCounter: {ID: 1299, type: DataType.UINT16},
            rmsExtremeOverVoltagePeriod: {ID: 1300, type: DataType.UINT16},
            rmsExtremeUnderVoltagePeriod: {ID: 1301, type: DataType.UINT16},
            rmsVoltageSagPeriod: {ID: 1302, type: DataType.UINT16},
            rmsVoltageSwellPeriod: {ID: 1303, type: DataType.UINT16},
            acVoltageMultiplier: {ID: 1536, type: DataType.UINT16},
            acVoltageDivisor: {ID: 1537, type: DataType.UINT16},
            acCurrentMultiplier: {ID: 1538, type: DataType.UINT16},
            acCurrentDivisor: {ID: 1539, type: DataType.UINT16},
            acPowerMultiplier: {ID: 1540, type: DataType.UINT16},
            acPowerDivisor: {ID: 1541, type: DataType.UINT16},
            dcOverloadAlarmsMask: {ID: 1792, type: DataType.BITMAP8},
            dcVoltageOverload: {ID: 1793, type: DataType.INT16},
            dcCurrentOverload: {ID: 1794, type: DataType.INT16},
            acAlarmsMask: {ID: 2048, type: DataType.BITMAP16},
            acVoltageOverload: {ID: 2049, type: DataType.INT16},
            acCurrentOverload: {ID: 2050, type: DataType.INT16},
            acActivePowerOverload: {ID: 2051, type: DataType.INT16},
            acReactivePowerOverload: {ID: 2052, type: DataType.INT16},
            averageRmsOverVoltage: {ID: 2053, type: DataType.INT16},
            averageRmsUnderVoltage: {ID: 2054, type: DataType.INT16},
            rmsExtremeOverVoltage: {ID: 2055, type: DataType.INT16},
            rmsExtremeUnderVoltage: {ID: 2056, type: DataType.INT16},
            rmsVoltageSag: {ID: 2057, type: DataType.INT16},
            rmsVoltageSwell: {ID: 2058, type: DataType.INT16},
            lineCurrentPhB: {ID: 2305, type: DataType.UINT16},
            activeCurrentPhB: {ID: 2306, type: DataType.INT16},
            reactiveCurrentPhB: {ID: 2307, type: DataType.INT16},
            rmsVoltagePhB: {ID: 2309, type: DataType.UINT16},
            rmsVoltageMinPhB: {ID: 2310, type: DataType.UINT16},
            rmsVoltageMaxPhB: {ID: 2311, type: DataType.UINT16},
            rmsCurrentPhB: {ID: 2312, type: DataType.UINT16},
            rmsCurrentMinPhB: {ID: 2313, type: DataType.UINT16},
            rmsCurrentMaxPhB: {ID: 2314, type: DataType.UINT16},
            activePowerPhB: {ID: 2315, type: DataType.INT16},
            activePowerMinPhB: {ID: 2316, type: DataType.INT16},
            activePowerMaxPhB: {ID: 2317, type: DataType.INT16},
            reactivePowerPhB: {ID: 2318, type: DataType.INT16},
            apparentPowerPhB: {ID: 2319, type: DataType.UINT16},
            powerFactorPhB: {ID: 2320, type: DataType.INT8},
            averageRmsVoltageMeasurePeriodPhB: {ID: 2321, type: DataType.UINT16},
            averageRmsOverVoltageCounterPhB: {ID: 2322, type: DataType.UINT16},
            averageUnderVoltageCounterPhB: {ID: 2323, type: DataType.UINT16},
            rmsExtremeOverVoltagePeriodPhB: {ID: 2324, type: DataType.UINT16},
            rmsExtremeUnderVoltagePeriodPhB: {ID: 2325, type: DataType.UINT16},
            rmsVoltageSagPeriodPhB: {ID: 2326, type: DataType.UINT16},
            rmsVoltageSwellPeriodPhB: {ID: 2327, type: DataType.UINT16},
            lineCurrentPhC: {ID: 2561, type: DataType.UINT16},
            activeCurrentPhC: {ID: 2562, type: DataType.INT16},
            reactiveCurrentPhC: {ID: 2563, type: DataType.INT16},
            rmsVoltagePhC: {ID: 2565, type: DataType.UINT16},
            rmsVoltageMinPhC: {ID: 2566, type: DataType.UINT16},
            rmsVoltageMaxPhC: {ID: 2567, type: DataType.UINT16},
            rmsCurrentPhC: {ID: 2568, type: DataType.UINT16},
            rmsCurrentMinPhC: {ID: 2569, type: DataType.UINT16},
            rmsCurrentMaxPhC: {ID: 2570, type: DataType.UINT16},
            activePowerPhC: {ID: 2571, type: DataType.INT16},
            activePowerMinPhC: {ID: 2572, type: DataType.INT16},
            activePowerMaxPhC: {ID: 2573, type: DataType.INT16},
            reactivePowerPhC: {ID: 2574, type: DataType.INT16},
            apparentPowerPhC: {ID: 2575, type: DataType.UINT16},
            powerFactorPhC: {ID: 2576, type: DataType.INT8},
            averageRmsVoltageMeasPeriodPhC: {ID: 2577, type: DataType.UINT16},
            averageRmsOverVoltageCounterPhC: {ID: 2578, type: DataType.UINT16},
            averageUnderVoltageCounterPhC: {ID: 2579, type: DataType.UINT16},
            rmsExtremeOverVoltagePeriodPhC: {ID: 2580, type: DataType.UINT16},
            rmsExtremeUnderVoltagePeriodPhC: {ID: 2581, type: DataType.UINT16},
            rmsVoltageSagPeriodPhC: {ID: 2582, type: DataType.UINT16},
            rmsVoltageSwellPeriodPhC: {ID: 2583, type: DataType.UINT16},
            schneiderActivePowerDemandTotal: {ID: 0x4300, type: DataType.INT32, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderReactivePowerDemandTotal: {ID: 0x4303, type: DataType.INT32, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderApparentPowerDemandTotal: {ID: 0x4318, type: DataType.INT32, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderDemandIntervalDuration: {ID: 0x4319, type: DataType.UINT24, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderDemandDateTime: {ID: 0x4320, type: DataType.UTC, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderActivePowerDemandPhase1: {ID: 0x4509, type: DataType.INT32, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderReactivePowerDemandPhase1: {ID: 0x450a, type: DataType.INT32, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderApparentPowerDemandPhase1: {ID: 0x450b, type: DataType.INT32, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderDemandIntervalMinimalVoltageL1: {ID: 0x4510, type: DataType.UINT16, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderDemandIntervalMaximalCurrentI1: {ID: 0x4513, type: DataType.UINT16, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderActivePowerDemandPhase2: {ID: 0x4909, type: DataType.INT32, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderReactivePowerDemandPhase2: {ID: 0x490a, type: DataType.INT32, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderApparentPowerDemandPhase2: {ID: 0x490b, type: DataType.INT32, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderDemandIntervalMinimalVoltageL2: {ID: 0x4910, type: DataType.UINT16, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderDemandIntervalMaximalCurrentI2: {ID: 0x4913, type: DataType.UINT16, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderActivePowerDemandPhase3: {ID: 0x4a09, type: DataType.INT32, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderReactivePowerDemandPhase3: {ID: 0x4a0a, type: DataType.INT32, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderApparentPowerDemandPhase3: {ID: 0x4a0b, type: DataType.INT32, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderDemandIntervalMinimalVoltageL3: {ID: 0x4a10, type: DataType.UINT16, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderDemandIntervalMaximalCurrentI3: {ID: 0x4a13, type: DataType.UINT16, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderCurrentSensorMultiplier: {ID: 0x4e00, type: DataType.UINT8, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
        },
        commands: {
            getProfileInfo: {
                ID: 0,
                parameters: [],
            },
            getMeasurementProfile: {
                ID: 1,
                parameters: [
                    {name: 'attrId', type: DataType.UINT16},
                    {name: 'starttime', type: DataType.UINT32},
                    {name: 'numofuntervals', type: DataType.UINT8},
                ],
            },
        },
        commandsResponse: {
            getProfileInfoRsp: {
                ID: 0,
                parameters: [
                    {name: 'profilecount', type: DataType.UINT8},
                    {name: 'profileintervalperiod', type: DataType.UINT8},
                    {name: 'maxnumofintervals', type: DataType.UINT8},
                    {name: 'numofattrs', type: DataType.UINT8},
                    {name: 'listofattr', type: BuffaloZclDataType.LIST_UINT16},
                ],
            },
            getMeasurementProfileRsp: {
                ID: 1,
                parameters: [
                    {name: 'starttime', type: DataType.UINT32},
                    {name: 'status', type: DataType.UINT8},
                    {name: 'profileintervalperiod', type: DataType.UINT8},
                    {name: 'numofintervalsdeliv', type: DataType.UINT8},
                    {name: 'attrId', type: DataType.UINT16},
                    {name: 'intervals', type: BuffaloZclDataType.LIST_UINT8},
                ],
            },
        },
    },
    haDiagnostic: {
        ID: 2821,
        attributes: {
            numberOfResets: {ID: 0, type: DataType.UINT16},
            persistentMemoryWrites: {ID: 1, type: DataType.UINT16},
            macRxBcast: {ID: 256, type: DataType.UINT32},
            macTxBcast: {ID: 257, type: DataType.UINT32},
            macRxUcast: {ID: 258, type: DataType.UINT32},
            macTxUcast: {ID: 259, type: DataType.UINT32},
            macTxUcastRetry: {ID: 260, type: DataType.UINT16},
            macTxUcastFail: {ID: 261, type: DataType.UINT16},
            aPSRxBcast: {ID: 262, type: DataType.UINT16},
            aPSTxBcast: {ID: 263, type: DataType.UINT16},
            aPSRxUcast: {ID: 264, type: DataType.UINT16},
            aPSTxUcastSuccess: {ID: 265, type: DataType.UINT16},
            aPSTxUcastRetry: {ID: 266, type: DataType.UINT16},
            aPSTxUcastFail: {ID: 267, type: DataType.UINT16},
            routeDiscInitiated: {ID: 268, type: DataType.UINT16},
            neighborAdded: {ID: 269, type: DataType.UINT16},
            neighborRemoved: {ID: 270, type: DataType.UINT16},
            neighborStale: {ID: 271, type: DataType.UINT16},
            joinIndication: {ID: 272, type: DataType.UINT16},
            childMoved: {ID: 273, type: DataType.UINT16},
            nwkFcFailure: {ID: 274, type: DataType.UINT16},
            apsFcFailure: {ID: 275, type: DataType.UINT16},
            apsUnauthorizedKey: {ID: 276, type: DataType.UINT16},
            nwkDecryptFailures: {ID: 277, type: DataType.UINT16},
            apsDecryptFailures: {ID: 278, type: DataType.UINT16},
            packetBufferAllocateFailures: {ID: 279, type: DataType.UINT16},
            relayedUcast: {ID: 280, type: DataType.UINT16},
            phyToMacQueueLimitReached: {ID: 281, type: DataType.UINT16},
            packetValidateDropCount: {ID: 282, type: DataType.UINT16},
            averageMacRetryPerApsMessageSent: {ID: 283, type: DataType.UINT16},
            lastMessageLqi: {ID: 284, type: DataType.UINT8},
            lastMessageRssi: {ID: 285, type: DataType.INT8},
            danfossSystemStatusCode: {ID: 0x4000, type: DataType.BITMAP16, manufacturerCode: ManufacturerCode.DANFOSS_A_S},
            danfossSystemStatusWater: {ID: 0x4200, type: DataType.ENUM8, manufacturerCode: ManufacturerCode.DANFOSS_A_S},
            danfossMultimasterRole: {ID: 0x4201, type: DataType.ENUM8, manufacturerCode: ManufacturerCode.DANFOSS_A_S},
            schneiderMeterStatus: {ID: 0xff01, type: DataType.UINT32, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderDiagnosticRegister1: {ID: 0xff02, type: DataType.UINT32, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
            schneiderCommunicationQuality: {ID: 0x4000, type: DataType.UINT8, manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC},
        },
        commands: {},
        commandsResponse: {},
    },
    touchlink: {
        ID: 4096,
        attributes: {},
        commands: {
            scanRequest: {
                ID: 0x00,
                response: 0x01,
                parameters: [
                    {name: 'transactionID', type: DataType.UINT32},
                    {name: 'zigbeeInformation', type: DataType.BITMAP8},
                    {name: 'touchlinkInformation', type: DataType.BITMAP8},
                ],
            },
            deviceInformation: {
                ID: 0x02,
                response: 0x03,
                parameters: [
                    {name: 'transactionID', type: DataType.UINT32},
                    {name: 'startIndex', type: DataType.UINT8},
                ],
            },
            identifyRequest: {
                ID: 0x06,
                parameters: [
                    {name: 'transactionID', type: DataType.UINT32},
                    {name: 'duration', type: DataType.UINT16},
                ],
            },
            resetToFactoryNew: {
                ID: 0x07,
                parameters: [{name: 'transactionID', type: DataType.UINT32}],
            },
            networkStart: {
                ID: 0x10,
                response: 0x11,
                parameters: [
                    {name: 'transactionID', type: DataType.UINT32},
                    {name: 'extendedPANID', type: DataType.IEEE_ADDR},
                    {name: 'keyIndex', type: DataType.UINT8},
                    {name: 'encryptedNetworkKey', type: DataType.SEC_KEY},
                    {name: 'logicalChannel', type: DataType.UINT8},
                    {name: 'panID', type: DataType.UINT16},
                    {name: 'nwkAddr', type: DataType.UINT16},
                    {name: 'groupIDsBegin', type: DataType.UINT16},
                    {name: 'groupIDsEnd', type: DataType.UINT16},
                    {name: 'freeNwkAddrRangeBegin', type: DataType.UINT16},
                    {name: 'freeNwkAddrRangeEnd', type: DataType.UINT16},
                    {name: 'freeGroupIDRangeBegin', type: DataType.UINT16},
                    {name: 'freeGroupIDRangeEnd', type: DataType.UINT16},
                    {name: 'initiatorIEEE', type: DataType.IEEE_ADDR},
                    {name: 'initiatorNwkAddr', type: DataType.UINT16},
                ],
            },
            networkJoinRouter: {
                ID: 0x12,
                response: 0x13,
                parameters: [
                    {name: 'transactionID', type: DataType.UINT32},
                    {name: 'extendedPANID', type: DataType.IEEE_ADDR},
                    {name: 'keyIndex', type: DataType.UINT8},
                    {name: 'encryptedNetworkKey', type: DataType.SEC_KEY},
                    {name: 'networkUpdateID', type: DataType.UINT8},
                    {name: 'logicalChannel', type: DataType.UINT8},
                    {name: 'panID', type: DataType.UINT16},
                    {name: 'nwkAddr', type: DataType.UINT16},
                    {name: 'groupIDsBegin', type: DataType.UINT16},
                    {name: 'groupIDsEnd', type: DataType.UINT16},
                    {name: 'freeNwkAddrRangeBegin', type: DataType.UINT16},
                    {name: 'freeNwkAddrRangeEnd', type: DataType.UINT16},
                    {name: 'freeGroupIDRangeBegin', type: DataType.UINT16},
                    {name: 'freeGroupIDRangeEnd', type: DataType.UINT16},
                ],
            },
            networkJoinEndDevice: {
                ID: 0x14,
                response: 0x15,
                parameters: [
                    {name: 'transactionID', type: DataType.UINT32},
                    {name: 'extendedPANID', type: DataType.IEEE_ADDR},
                    {name: 'keyIndex', type: DataType.UINT8},
                    {name: 'encryptedNetworkKey', type: DataType.SEC_KEY},
                    {name: 'networkUpdateID', type: DataType.UINT8},
                    {name: 'logicalChannel', type: DataType.UINT8},
                    {name: 'panID', type: DataType.UINT16},
                    {name: 'nwkAddr', type: DataType.UINT16},
                    {name: 'groupIDsBegin', type: DataType.UINT16},
                    {name: 'groupIDsEnd', type: DataType.UINT16},
                    {name: 'freeNwkAddrRangeBegin', type: DataType.UINT16},
                    {name: 'freeNwkAddrRangeEnd', type: DataType.UINT16},
                    {name: 'freeGroupIDRangeBegin', type: DataType.UINT16},
                    {name: 'freeGroupIDRangeEnd', type: DataType.UINT16},
                ],
            },
            networkUpdate: {
                ID: 0x16,
                parameters: [
                    {name: 'transactionID', type: DataType.UINT32},
                    {name: 'extendedPANID', type: DataType.IEEE_ADDR},
                    {name: 'networkUpdateID', type: DataType.UINT8},
                    {name: 'logicalChannel', type: DataType.UINT8},
                    {name: 'panID', type: DataType.UINT16},
                    {name: 'nwkAddr', type: DataType.UINT16},
                ],
            },
            getGroupIdentifiers: {
                ID: 0x41,
                response: 0x41,
                parameters: [{name: 'startIndex', type: DataType.UINT8}],
            },
            getEndpointList: {
                ID: 0x42,
                response: 0x42,
                parameters: [{name: 'startIndex', type: DataType.UINT8}],
            },
        },
        commandsResponse: {
            scanResponse: {
                ID: 0x01,
                parameters: [
                    {name: 'transactionID', type: DataType.UINT32},
                    {name: 'rssiCorrection', type: DataType.UINT8},
                    {name: 'zigbeeInformation', type: DataType.UINT8},
                    {name: 'touchlinkInformation', type: DataType.UINT8},
                    {name: 'keyBitmask', type: DataType.UINT16},
                    {name: 'responseID', type: DataType.UINT32},
                    {name: 'extendedPanID', type: DataType.IEEE_ADDR},
                    {name: 'networkUpdateID', type: DataType.UINT8},
                    {name: 'logicalChannel', type: DataType.UINT8},
                    {name: 'panID', type: DataType.UINT16},
                    {name: 'networkAddress', type: DataType.UINT16},
                    {name: 'numberOfSubDevices', type: DataType.UINT8},
                    {name: 'totalGroupIdentifiers', type: DataType.UINT8},
                    {
                        name: 'endpointID',
                        type: DataType.UINT8,
                        conditions: [{type: ParameterCondition.FIELD_EQUAL, field: 'numberOfSubDevices', value: 1}],
                    },
                    {
                        name: 'profileID',
                        type: DataType.UINT16,
                        conditions: [{type: ParameterCondition.FIELD_EQUAL, field: 'numberOfSubDevices', value: 1}],
                    },
                    {
                        name: 'deviceID',
                        type: DataType.UINT16,
                        conditions: [{type: ParameterCondition.FIELD_EQUAL, field: 'numberOfSubDevices', value: 1}],
                    },
                    {
                        name: 'version',
                        type: DataType.UINT8,
                        conditions: [{type: ParameterCondition.FIELD_EQUAL, field: 'numberOfSubDevices', value: 1}],
                    },
                    {
                        name: 'groupIDCount',
                        type: DataType.UINT8,
                        conditions: [{type: ParameterCondition.FIELD_EQUAL, field: 'numberOfSubDevices', value: 1}],
                    },
                ],
            },
            deviceInformation: {
                ID: 0x03,
                parameters: [
                    {name: 'transactionID', type: DataType.UINT32},
                    {name: 'numberOfSubDevices', type: DataType.UINT8},
                    {name: 'startIndex', type: DataType.UINT8},
                    {name: 'deviceInfoCount', type: DataType.UINT8},
                    /**
                     * TODO: (this * deviceInfoCount)
                     * {name: 'ieeeAddress', type: DataType.IEEE_ADDR},
                     * {name: 'endpointID', type: DataType.UINT8},
                     * {name: 'profileID', type: DataType.UINT16},
                     * {name: 'deviceID', type: DataType.UINT16},
                     * {name: 'version', type: DataType.UINT8},
                     * {name: 'groupIdCount', type: DataType.UINT8},
                     * {name: 'sort', type: DataType.UINT8},
                     */
                    // {name: 'deviceInfoRecord', type: TODO},
                ],
            },
            networkStart: {
                ID: 0x11,
                parameters: [
                    {name: 'transactionID', type: DataType.UINT32},
                    /**
                     * - 0x00 Success
                     * - 0x01 Failure
                     * - 0x02 – 0xff Reserved
                     */
                    {name: 'status', type: DataType.ENUM8},
                    {name: 'extendedPANID', type: DataType.IEEE_ADDR},
                    {name: 'networkUpdateID', type: DataType.UINT8},
                    {name: 'logicalChannel', type: DataType.UINT8},
                    {name: 'panID', type: DataType.UINT16},
                ],
            },
            networkJoinRouter: {
                ID: 0x13,
                parameters: [
                    {name: 'transactionID', type: DataType.UINT32},
                    /**
                     * - 0x00 Success
                     * - 0x01 Failure
                     * - 0x02 – 0xff Reserved
                     */
                    {name: 'status', type: DataType.ENUM8},
                ],
            },
            networkJoinEndDevice: {
                ID: 0x15,
                parameters: [
                    {name: 'transactionID', type: DataType.UINT32},
                    /**
                     * - 0x00 Success
                     * - 0x01 Failure
                     * - 0x02 – 0xff Reserved
                     */
                    {name: 'status', type: DataType.ENUM8},
                ],
            },
            endpointInformation: {
                ID: 0x40,
                parameters: [
                    {name: 'ieeeAddress', type: DataType.IEEE_ADDR},
                    {name: 'networkAddress', type: DataType.UINT16},
                    {name: 'endpointID', type: DataType.UINT8},
                    {name: 'profileID', type: DataType.UINT16},
                    {name: 'deviceID', type: DataType.UINT16},
                    {name: 'version', type: DataType.UINT8},
                ],
            },
            getGroupIdentifiers: {
                ID: 0x41,
                parameters: [
                    {name: 'total', type: DataType.UINT8},
                    {name: 'startIndex', type: DataType.UINT8},
                    {name: 'count', type: DataType.UINT8},
                    /**
                     * TODO: (this * count)
                     * {name: 'groupID', type: DataType.UINT16},
                     * {name: 'groupType', type: DataType.UINT8},
                     */
                    // {name: 'groupInfoList', type: TODO},
                ],
            },
            getEndpointList: {
                ID: 0x42,
                parameters: [
                    {name: 'total', type: DataType.UINT8},
                    {name: 'startIndex', type: DataType.UINT8},
                    {name: 'count', type: DataType.UINT8},
                    /**
                     * TODO: (this * count)
                     * {name: 'networkAddress', type: DataType.UINT16},
                     * {name: 'endpointID', type: DataType.UINT8},
                     * {name: 'profileID', type: DataType.UINT16},
                     * {name: 'deviceID', type: DataType.UINT16},
                     * {name: 'version', type: DataType.UINT8},
                     */
                    // {name: 'endpointInfoList', type: TODO},
                ],
            },
        },
    },
    manuSpecificClusterAduroSmart: {
        ID: 64716,
        attributes: {},
        commands: {
            cmd0: {
                ID: 0,
                parameters: [],
            },
        },
        commandsResponse: {},
    },
    manuSpecificOsram: {
        ID: 64527,
        attributes: {},
        commands: {
            saveStartupParams: {
                ID: 1,
                parameters: [],
            },
            resetStartupParams: {
                ID: 2,
                parameters: [],
            },
        },
        commandsResponse: {
            saveStartupParamsRsp: {
                ID: 0,
                parameters: [],
            },
        },
    },
    manuSpecificPhilips: {
        ID: 0xfc00,
        manufacturerCode: ManufacturerCode.SIGNIFY_NETHERLANDS_B_V,
        attributes: {
            config: {ID: 49, type: DataType.BITMAP16},
        },
        commands: {},
        commandsResponse: {
            hueNotification: {
                ID: 0,
                parameters: [
                    {name: 'button', type: DataType.UINT8},
                    {name: 'unknown1', type: DataType.UINT24},
                    {name: 'type', type: DataType.UINT8},
                    {name: 'unknown2', type: DataType.UINT8},
                    {name: 'time', type: DataType.UINT8},
                    {name: 'unknown2', type: DataType.UINT8},
                ],
            },
        },
    },
    manuSpecificPhilips2: {
        ID: 0xfc03,
        manufacturerCode: ManufacturerCode.SIGNIFY_NETHERLANDS_B_V,
        attributes: {
            state: {ID: 0x0002, type: DataType.OCTET_STR},
        },
        commands: {
            multiColor: {
                ID: 0,
                parameters: [{name: 'data', type: BuffaloZclDataType.BUFFER}],
            },
        },
        commandsResponse: {},
    },
    manuSpecificSinope: {
        ID: 65281,
        manufacturerCode: ManufacturerCode.SINOPE_TECHNOLOGIES,
        attributes: {
            // attribute ID :1's readable
            keypadLockout: {ID: 2, type: DataType.ENUM8},
            // 'firmware number': {ID: 3, type: DataType.UNKNOWN},
            firmwareVersion: {ID: 4, type: DataType.CHAR_STR},
            outdoorTempToDisplay: {ID: 16, type: DataType.INT16},
            outdoorTempToDisplayTimeout: {ID: 17, type: DataType.UINT16},
            secondScreenBehavior: {ID: 18, type: DataType.ENUM8}, // auto:0,setpoint:1,outside:2
            currentTimeToDisplay: {ID: 32, type: DataType.UINT32},
            ledIntensityOn: {ID: 82, type: DataType.UINT8},
            ledIntensityOff: {ID: 83, type: DataType.UINT8},
            ledColorOn: {ID: 80, type: DataType.UINT24}, // inversed hex BBGGRR
            ledColorOff: {ID: 81, type: DataType.UINT24},
            onLedIntensity: {ID: 82, type: DataType.UINT8}, // percent
            offLedIntensity: {ID: 83, type: DataType.UINT8}, // percent
            actionReport: {ID: 84, type: DataType.ENUM8}, // singleTapUp: 1,2, doubleTapUp: 1,4, singleTapDown: 17,18, doubleTapDown: 17,20
            minimumBrightness: {ID: 85, type: DataType.UINT16},
            connectedLoadRM: {ID: 96, type: DataType.UINT16}, // unit watt/hr for Calypso RM3500 & Load Controller RM3250
            currentLoad: {ID: 112, type: DataType.BITMAP8}, // related to ecoMode(s)
            ecoMode: {ID: 113, type: DataType.INT8}, // default:-128||-100-0-100%
            ecoMode1: {ID: 114, type: DataType.UINT8}, // default:255||0-99
            ecoMode2: {ID: 115, type: DataType.UINT8}, // default 255||0-100
            unknown: {ID: 117, type: DataType.BITMAP32}, // RW *testing*
            drConfigWaterTempMin: {ID: 118, type: DataType.UINT8}, // value 45 or 0
            drConfigWaterTempTime: {ID: 119, type: DataType.UINT8}, // default 2
            drWTTimeOn: {ID: 120, type: DataType.UINT16},
            unknown1: {ID: 128, type: DataType.UINT32}, // readOnly stringNumber *testing*
            dimmerTimmer: {ID: 160, type: DataType.UINT32},
            unknown2: {ID: 256, type: DataType.UINT8}, // readOnly *testing*
            floorControlMode: {ID: 261, type: DataType.ENUM8}, // airFloorMode
            auxOutputMode: {ID: 262, type: DataType.ENUM8},
            floorTemperature: {ID: 263, type: DataType.INT16},
            ambiantMaxHeatSetpointLimit: {ID: 264, type: DataType.INT16},
            floorMinHeatSetpointLimit: {ID: 265, type: DataType.INT16},
            floorMaxHeatSetpointLimit: {ID: 266, type: DataType.INT16},
            temperatureSensor: {ID: 267, type: DataType.ENUM8},
            floorLimitStatus: {ID: 268, type: DataType.ENUM8},
            roomTemperature: {ID: 269, type: DataType.INT16},
            timeFormatToDisplay: {ID: 276, type: DataType.ENUM8},
            GFCiStatus: {ID: 277, type: DataType.ENUM8},
            auxConnectedLoad: {ID: 280, type: DataType.UINT16},
            connectedLoad: {ID: 281, type: DataType.UINT16},
            pumpProtection: {ID: 296, type: DataType.UINT8},
            unknown3: {ID: 298, type: DataType.ENUM8}, // RW default:60||5,10,15,20,30,60 *testing*
            currentSetpoint: {ID: 299, type: DataType.INT16}, // W:to ocuppiedHeatSetpoint, R:depends of SinopeOccupancy
            // attribute ID: 300's readable, returns a buffer
            reportLocalTemperature: {ID: 301, type: DataType.INT16},
            // attribute ID: 512's readable
            flowMeterConfig: {ID: 576, type: DataType.ARRAY},
            coldLoadPickupStatus: {ID: 643, type: DataType.UINT8},
        },
        commands: {},
        commandsResponse: {},
    },
    manuSpecificLegrandDevices: {
        ID: 0xfc01,
        manufacturerCode: ManufacturerCode.LEGRAND_GROUP,
        attributes: {
            // attributes seems to vary depending on the device. Can't be static
        },
        commands: {},
        commandsResponse: {},
    },
    manuSpecificLegrandDevices2: {
        ID: 0xfc40,
        manufacturerCode: ManufacturerCode.LEGRAND_GROUP,
        attributes: {},
        commands: {
            command0: {
                ID: 0,
                parameters: [{name: 'data', type: BuffaloZclDataType.BUFFER}],
            },
        },
        commandsResponse: {},
    },
    manuSpecificLegrandDevices3: {
        ID: 0xfc41,
        manufacturerCode: ManufacturerCode.LEGRAND_GROUP,
        attributes: {},
        commands: {
            command0: {
                ID: 0,
                parameters: [{name: 'data', type: BuffaloZclDataType.BUFFER}],
            },
        },
        commandsResponse: {},
    },
    manuSpecificNiko1: {
        ID: 0xfc00,
        manufacturerCode: ManufacturerCode.NIKO_NV,
        attributes: {
            /* WARNING: 0x0000 has different datatypes!
             *          enum8 (switch) vs. bitmap8 (outlet)
             *          unknown usage/function on outlet
             */
            switchOperationMode: {ID: 0x0000, type: DataType.ENUM8},
            outletLedColor: {ID: 0x0100, type: DataType.UINT24},
            outletChildLock: {ID: 0x0101, type: DataType.UINT8},
            outletLedState: {ID: 0x0104, type: DataType.UINT8},
        },
        commands: {},
        commandsResponse: {},
    },
    manuSpecificNiko2: {
        ID: 0xfc01,
        manufacturerCode: ManufacturerCode.NIKO_NV,
        attributes: {
            switchAction: {ID: 0x0002, type: DataType.UINT8},
        },
        commands: {},
        commandsResponse: {},
    },
    wiserDeviceInfo: {
        ID: 0xfe03, // 65027
        attributes: {
            deviceInfo: {ID: 32, type: DataType.CHAR_STR},
        },
        commands: {},
        commandsResponse: {},
    },
    /**
     * Tuya cluster
     *
     * Common parameters:
     *
     *  seq -  Sequence number of transmitted data, range 0-65535, revert to 0 after reaching 65535
     *
     * Official Tuya documentation: https://developer.tuya.com/en/docs/iot-device-dev/tuya-zigbee-universal-docking-access-standard?id=K9ik6zvofpzql#subtitle-6-Private%20cluster
     *
     */
    manuSpecificTuya: {
        ID: 0xef00, // 61184
        attributes: {},
        commands: {
            /**
             * Gateway-side data request
             */
            dataRequest: {
                ID: 0,
                parameters: [
                    {name: 'seq', type: DataType.UINT16},
                    {name: 'dpValues', type: BuffaloZclDataType.LIST_TUYA_DATAPOINT_VALUES},
                ],
            },
            /**
             * GW send, trigger MCU side to report all current information, no zcl payload.
             * Note: Device side can make a policy, data better not to report centrally
             */
            dataQuery: {
                ID: 3,
                parameters: [],
            },
            /**
             * Gw->Zigbee gateway query MCU version
             */
            mcuVersionRequest: {
                ID: 0x10,
                parameters: [{name: 'seq', type: DataType.UINT16}],
            },

            /**
             * FIXME: This command is not listed in Tuya zigbee cluster description,
             *  but there is some command 0x04 (description is: Command Issuance)
             *  in `Serial command list` section of the same document
             *  So, need to investigate more information about it
             */
            sendData: {
                ID: 4,
                parameters: [
                    {name: 'seq', type: DataType.UINT16},
                    {name: 'dpValues', type: BuffaloZclDataType.LIST_TUYA_DATAPOINT_VALUES},
                ],
            },

            /**
             * Gw->Zigbee gateway notifies MCU of upgrade
             */
            mcuOtaNotify: {
                ID: 0x12,
                parameters: [
                    {name: 'seq', type: DataType.UINT16},
                    // FIXME: key is fixed (8 byte) uint8 array
                    //  Ask Koen is there any type to read fixed size uint_8t.
                    //  currently there is `length` property in options but sems it is
                    //  ignored in `writePayloadCluster()` and other methods.
                    //  So, as workaround we use hi/low for key, which is not best solution
                    {name: 'key_hi', type: DataType.UINT32},
                    {name: 'key_lo', type: DataType.UINT32},
                    {name: 'version', type: DataType.UINT8},
                    {name: 'imageSize', type: DataType.UINT32},
                    {name: 'crc', type: DataType.UINT32},
                ],
            },

            /**
             * Gw->Zigbee gateway returns the requested upgrade package for MCU
             */
            mcuOtaBlockDataResponse: {
                ID: 0x14,
                parameters: [
                    {name: 'seq', type: DataType.UINT16},
                    {name: 'status', type: DataType.UINT8},
                    {name: 'key_hi', type: DataType.UINT32},
                    {name: 'key_lo', type: DataType.UINT32},
                    {name: 'version', type: DataType.UINT8},
                    {name: 'offset', type: DataType.UINT32},
                    {name: 'imageData', type: BuffaloZclDataType.LIST_UINT8},
                ],
            },

            /**
             * Time synchronization (bidirectional)
             */
            mcuSyncTime: {
                ID: 0x24,
                parameters: [
                    {name: 'payloadSize', type: DataType.UINT16},
                    {name: 'payload', type: BuffaloZclDataType.LIST_UINT8},
                ],
            },

            /**
             * Gateway connection status (bidirectional)
             */
            mcuGatewayConnectionStatus: {
                ID: 0x25,
                parameters: [
                    {name: 'payloadSize', type: DataType.UINT16},
                    {name: 'payload', type: DataType.UINT8},
                ],
            },
        },
        commandsResponse: {
            /**
             * Reply to MCU-side data request
             */
            dataResponse: {
                ID: 1,
                parameters: [
                    {name: 'seq', type: DataType.UINT16},
                    {name: 'dpValues', type: BuffaloZclDataType.LIST_TUYA_DATAPOINT_VALUES},
                ],
            },
            /**
             * MCU-side data active upload (bidirectional)
             */
            dataReport: {
                ID: 2,
                parameters: [
                    {name: 'seq', type: DataType.UINT16},
                    {name: 'dpValues', type: BuffaloZclDataType.LIST_TUYA_DATAPOINT_VALUES},
                ],
            },
            /**
             * FIXME: This command is not listed in Tuya zigbee cluster description,
             *  but there is some command 0x05 (description is: Status query)
             *  in `Serial command list` section of the same document
             *  So, need to investigate more information about it
             */
            activeStatusReportAlt: {
                ID: 5,
                parameters: [
                    {name: 'seq', type: DataType.UINT16},
                    {name: 'dpValues', type: BuffaloZclDataType.LIST_TUYA_DATAPOINT_VALUES},
                ],
            },
            /**
             * FIXME: This command is not listed in Tuya zigbee cluster description,
             *  but there is some command 0x06 (description is: Status query)
             *  in `Serial command list` section of the same document
             *  So, need to investigate more information about it
             */
            activeStatusReport: {
                ID: 6,
                parameters: [
                    {name: 'seq', type: DataType.UINT16},
                    {name: 'dpValues', type: BuffaloZclDataType.LIST_TUYA_DATAPOINT_VALUES},
                ],
            },
            /**
             * Zigbee->Gw MCU return version or actively report version
             */
            mcuVersionResponse: {
                ID: 0x11,
                parameters: [
                    {name: 'seq', type: DataType.UINT16},
                    {name: 'version', type: DataType.UINT8},
                ],
            },

            /**
             * Zigbee->Gw requests an upgrade package for the MCU
             */
            mcuOtaBlockDataRequest: {
                ID: 0x13,
                parameters: [
                    {name: 'seq', type: DataType.UINT16},
                    {name: 'key_hi', type: DataType.UINT32},
                    {name: 'key_lo', type: DataType.UINT32},
                    {name: 'version', type: DataType.UINT8},
                    {name: 'offset', type: DataType.UINT32},
                    {name: 'size', type: DataType.UINT32},
                ],
            },

            /**
             * Zigbee->Gw returns the upgrade result for the mcu
             */
            mcuOtaResult: {
                ID: 0x15,
                parameters: [
                    {name: 'seq', type: DataType.UINT16},
                    {name: 'status', type: DataType.UINT8},
                    {name: 'key_hi', type: DataType.UINT32},
                    {name: 'key_lo', type: DataType.UINT32},
                    {name: 'version', type: DataType.UINT8},
                ],
            },

            /**
             * Time synchronization (bidirectional)
             */
            mcuSyncTime: {
                ID: 0x24,
                parameters: [{name: 'payloadSize', type: DataType.UINT16}],
            },

            /**
             * Gateway connection status (bidirectional)
             */
            mcuGatewayConnectionStatus: {
                ID: 0x25,
                parameters: [{name: 'payloadSize', type: DataType.UINT16}],
            },
        },
    },
    manuSpecificLumi: {
        ID: 0xfcc0,
        manufacturerCode: ManufacturerCode.LUMI_UNITED_TECHOLOGY_LTD_SHENZHEN,
        attributes: {
            mode: {ID: 0x0009, type: DataType.UINT8},
            illuminance: {ID: 0x0112, type: DataType.UINT32},
            displayUnit: {ID: 0x0114, type: DataType.UINT8},
            airQuality: {ID: 0x0129, type: DataType.UINT8},
            curtainReverse: {ID: 0x0400, type: DataType.BOOLEAN},
            curtainHandOpen: {ID: 0x0401, type: DataType.BOOLEAN},
            curtainCalibrated: {ID: 0x0402, type: DataType.BOOLEAN},
        },
        commands: {},
        commandsResponse: {},
    },
    liXeePrivate: {
        ID: 0xff66,
        manufacturerCode: ManufacturerCode.NXP_SEMICONDUCTORS,
        attributes: {
            currentTarif: {ID: 0x0000, type: DataType.CHAR_STR},
            tomorrowColor: {ID: 0x0001, type: DataType.CHAR_STR},
            scheduleHPHC: {ID: 0x0002, type: DataType.UINT8},
            presencePotential: {ID: 0x0003, type: DataType.UINT8},
            startNoticeEJP: {ID: 0x0004, type: DataType.UINT8},
            warnDPS: {ID: 0x0005, type: DataType.UINT16},
            warnDIR1: {ID: 0x0006, type: DataType.UINT16},
            warnDIR2: {ID: 0x0007, type: DataType.UINT16},
            warnDIR3: {ID: 0x0008, type: DataType.UINT16},
            motDEtat: {ID: 0x0009, type: DataType.CHAR_STR},
            currentPrice: {ID: 0x0200, type: DataType.CHAR_STR},
            currentIndexTarif: {ID: 0x0201, type: DataType.UINT8},
            currentDate: {ID: 0x0202, type: DataType.CHAR_STR},
            activeEnergyOutD01: {ID: 0x0203, type: DataType.UINT32},
            activeEnergyOutD02: {ID: 0x0204, type: DataType.UINT32},
            activeEnergyOutD03: {ID: 0x0205, type: DataType.UINT32},
            activeEnergyOutD04: {ID: 0x0206, type: DataType.UINT32},
            injectedVA: {ID: 0x0207, type: DataType.UINT16},
            injectedVAMaxN: {ID: 0x0208, type: DataType.INT16},
            injectedVAMaxN1: {ID: 0x0209, type: DataType.INT16},
            injectedActiveLoadN: {ID: 0x0210, type: DataType.INT16},
            injectedActiveLoadN1: {ID: 0x0211, type: DataType.INT16},
            drawnVAMaxN1: {ID: 0x0212, type: DataType.INT16},
            drawnVAMaxN1P2: {ID: 0x0213, type: DataType.INT16},
            drawnVAMaxN1P3: {ID: 0x0214, type: DataType.INT16},
            message1: {ID: 0x0215, type: DataType.CHAR_STR},
            message2: {ID: 0x0216, type: DataType.CHAR_STR},
            statusRegister: {ID: 0x0217, type: DataType.OCTET_STR},
            startMobilePoint1: {ID: 0x0218, type: DataType.UINT8},
            stopMobilePoint1: {ID: 0x0219, type: DataType.UINT8},
            startMobilePoint2: {ID: 0x0220, type: DataType.UINT8},
            stopMobilePoint2: {ID: 0x0221, type: DataType.UINT8},
            startMobilePoint3: {ID: 0x0222, type: DataType.UINT8},
            stopMobilePoint3: {ID: 0x0223, type: DataType.UINT8},
            relais: {ID: 0x0224, type: DataType.UINT16},
            daysNumberCurrentCalendar: {ID: 0x0225, type: DataType.UINT8},
            daysNumberNextCalendar: {ID: 0x0226, type: DataType.UINT8},
            daysProfileCurrentCalendar: {ID: 0x0227, type: DataType.LONG_OCTET_STR},
            daysProfileNextCalendar: {ID: 0x0228, type: DataType.LONG_OCTET_STR},
            linkyMode: {ID: 0x0300, type: DataType.UINT8},
        },
        commands: {},
        commandsResponse: {},
    },
    manuSpecificTuya_2: {
        ID: 0xe002,
        attributes: {
            alarm_temperature_max: {ID: 53258, type: DataType.INT16},
            alarm_temperature_min: {ID: 53259, type: DataType.INT16},
            alarm_humidity_max: {ID: 53261, type: DataType.INT16},
            alarm_humidity_min: {ID: 53262, type: DataType.INT16},
            alarm_humidity: {ID: 53263, type: DataType.ENUM8},
            alarm_temperature: {ID: 53254, type: DataType.ENUM8},
            unknown: {ID: 53264, type: DataType.UINT8},
        },
        commands: {},
        commandsResponse: {},
    },
    manuSpecificTuya_3: {
        ID: 0xe001,
        attributes: {
            powerOnBehavior: {ID: 0xd010, type: DataType.ENUM8},
            switchMode: {ID: 0xd020, type: DataType.ENUM8},
            switchType: {ID: 0xd030, type: DataType.ENUM8},
        },
        commands: {
            setOptions1: {
                ID: 0xe5,
                parameters: [{name: 'data', type: BuffaloZclDataType.BUFFER}],
            },
            setOptions2: {
                ID: 0xe6,
                parameters: [{name: 'data', type: BuffaloZclDataType.BUFFER}],
            },
            setOptions3: {
                ID: 0xe7,
                parameters: [{name: 'data', type: BuffaloZclDataType.BUFFER}],
            },
        },
        commandsResponse: {},
    },
    manuSpecificCentraliteHumidity: {
        ID: 0xfc45,
        manufacturerCode: ManufacturerCode.CENTRALITE_SYSTEMS_INC,
        attributes: {
            measuredValue: {ID: 0, type: DataType.UINT16},
        },
        commands: {},
        commandsResponse: {},
    },
    manuSpecificSmartThingsArrivalSensor: {
        ID: 0xfc05,
        manufacturerCode: ManufacturerCode.SMARTTHINGS_INC,
        attributes: {},
        commands: {},
        commandsResponse: {
            arrivalSensorNotify: {
                ID: 1,
                parameters: [],
            },
        },
    },
    manuSpecificSamsungAccelerometer: {
        ID: 0xfc02,
        manufacturerCode: ManufacturerCode.SMARTTHINGS_INC,
        attributes: {
            motion_threshold_multiplier: {ID: 0, type: DataType.UINT8},
            motion_threshold: {ID: 2, type: DataType.UINT16},
            acceleration: {ID: 16, type: DataType.BITMAP8},
            x_axis: {ID: 18, type: DataType.INT16},
            y_axis: {ID: 19, type: DataType.INT16},
            z_axis: {ID: 20, type: DataType.INT16},
        },
        commands: {},
        commandsResponse: {},
    },
    heimanSpecificAirQuality: {
        // from HS2AQ-3.0海曼智能空气质量检测仪API文档-V01
        ID: 0xfc81,
        manufacturerCode: ManufacturerCode.HEIMAN_TECHNOLOGY_CO_LTD,
        attributes: {
            language: {ID: 0xf000, type: DataType.UINT8},
            unitOfMeasure: {ID: 0xf001, type: DataType.UINT8},
            batteryState: {ID: 0xf002, type: DataType.UINT8}, //  (0 is not charged, 1 is charging, 2 is fully charged)
            pm10measuredValue: {ID: 0xf003, type: DataType.UINT16},
            tvocMeasuredValue: {ID: 0xf004, type: DataType.UINT16},
            aqiMeasuredValue: {ID: 0xf005, type: DataType.UINT16},
            temperatureMeasuredMax: {ID: 0xf006, type: DataType.INT16},
            temperatureMeasuredMin: {ID: 0xf007, type: DataType.INT16},
            humidityMeasuredMax: {ID: 0xf008, type: DataType.UINT16},
            humidityMeasuredMin: {ID: 0xf009, type: DataType.UINT16},
            alarmEnable: {ID: 0xf00a, type: DataType.UINT16},
        },
        commands: {
            setLanguage: {
                ID: 0x011b,
                parameters: [
                    // (1: English 0: Chinese)
                    {name: 'languageCode', type: DataType.UINT8},
                ],
            },
            setUnitOfTemperature: {
                ID: 0x011c,
                parameters: [
                    // (0: ℉ 1: ℃)
                    {name: 'unitsCode', type: DataType.UINT8},
                ],
            },
            getTime: {
                ID: 0x011d,
                parameters: [],
            },
        },
        commandsResponse: {},
    },
    heimanSpecificScenes: {
        // from HS2SS-3.0海曼智能情景开关API文档-V01
        ID: 0xfc80,
        manufacturerCode: ManufacturerCode.HEIMAN_TECHNOLOGY_CO_LTD,
        attributes: {},
        commands: {
            cinema: {
                ID: 0xf0,
                parameters: [],
            },
            atHome: {
                ID: 0xf1,
                parameters: [],
            },
            sleep: {
                ID: 0xf2,
                parameters: [],
            },
            goOut: {
                ID: 0xf3,
                parameters: [],
            },
            repast: {
                ID: 0xf4,
                parameters: [],
            },
        },
        commandsResponse: {},
    },
    tradfriButton: {
        ID: 0xfc80,
        manufacturerCode: ManufacturerCode.IKEA_OF_SWEDEN,
        attributes: {},
        commands: {
            action1: {
                ID: 1,
                parameters: [{name: 'data', type: DataType.UINT8}],
            },
            action2: {
                ID: 2,
                parameters: [{name: 'data', type: DataType.UINT8}],
            },
            action3: {
                ID: 3,
                parameters: [{name: 'data', type: DataType.UINT8}],
            },
            action4: {
                ID: 4,
                parameters: [{name: 'data', type: DataType.UINT8}],
            },
            action6: {
                ID: 6,
                parameters: [{name: 'data', type: DataType.UINT8}],
            },
        },
        commandsResponse: {},
    },
    heimanSpecificInfraRedRemote: {
        // from HS2IRC-3.0海曼智能红外转发控制器API-V01文档
        ID: 0xfc82,
        manufacturerCode: ManufacturerCode.HEIMAN_TECHNOLOGY_CO_LTD,
        attributes: {},
        commands: {
            sendKey: {
                ID: 0xf0,
                parameters: [
                    {name: 'id', type: DataType.UINT8},
                    {name: 'keyCode', type: DataType.UINT8},
                ],
            },
            studyKey: {
                // Total we can have 30 keycode for each device ID (1..30).
                ID: 0xf1,
                // response: 0xf2,
                parameters: [
                    {name: 'id', type: DataType.UINT8},
                    {name: 'keyCode', type: DataType.UINT8},
                ],
            },
            deleteKey: {
                ID: 0xf3,
                parameters: [
                    // 1-15 - Delete specific ID, >= 16 - Delete All
                    {name: 'id', type: DataType.UINT8},
                    // 1-30 - Delete specific keycode, >= 31 - Delete All keycodes for the ID
                    {name: 'keyCode', type: DataType.UINT8},
                ],
            },
            createId: {
                // Total we can have 15 device IDs (1..15).
                ID: 0xf4,
                // response: 0xf5,
                parameters: [{name: 'modelType', type: DataType.UINT8}],
            },
            getIdAndKeyCodeList: {
                ID: 0xf6,
                // response: 0xf7,
                parameters: [],
            },
        },
        commandsResponse: {
            studyKeyRsp: {
                ID: 0xf2,
                parameters: [
                    {name: 'id', type: DataType.UINT8},
                    {name: 'keyCode', type: DataType.UINT8},
                    {name: 'result', type: DataType.UINT8}, // 0 - success, 1 - fail
                ],
            },
            createIdRsp: {
                ID: 0xf5,
                parameters: [
                    {name: 'id', type: DataType.UINT8}, // 0xFF - create failed
                    {name: 'modelType', type: DataType.UINT8},
                ],
            },
            getIdAndKeyCodeListRsp: {
                ID: 0xf7,
                parameters: [
                    {name: 'packetsTotal', type: DataType.UINT8},
                    {name: 'packetNumber', type: DataType.UINT8},
                    {name: 'packetLength', type: DataType.UINT8}, // Max length is 70 bytes
                    // HELP for learnedDevicesList data structure:
                    //   struct structPacketPayload {
                    //     uint8_t ID;
                    //     uint8_t ModeType;
                    //     uint8_t KeyNum;
                    //     uint8_t KeyCode[KeyNum];
                    //   } arayPacketPayload[CurentPacketLenght];
                    // }
                    {name: 'learnedDevicesList', type: BuffaloZclDataType.LIST_UINT8},
                ],
            },
        },
    },
    schneiderSpecificPilotMode: {
        ID: 0xff23,
        manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC,
        attributes: {
            pilotMode: {ID: 0x0031, type: DataType.ENUM8},
        },
        commands: {},
        commandsResponse: {},
    },
    elkoOccupancySettingClusterServer: {
        ID: 0xff19,
        manufacturerCode: ManufacturerCode.ADEO,
        attributes: {
            AmbienceLightThreshold: {ID: 0x0000, type: DataType.UINT16},
            OccupancyActions: {ID: 0x0001, type: DataType.ENUM8},
            UnoccupiedLevelDflt: {ID: 0x0002, type: DataType.UINT8},
            UnoccupiedLevel: {ID: 0x0003, type: DataType.UINT8},
        },
        commands: {},
        commandsResponse: {},
    },
    elkoSwitchConfigurationClusterServer: {
        ID: 0xff17,
        manufacturerCode: ManufacturerCode.ADEO,
        attributes: {
            SwitchIndication: {ID: 0x0000, type: DataType.ENUM8},
            UpSceneID: {ID: 0x0010, type: DataType.UINT8},
            UpGroupID: {ID: 0x0011, type: DataType.UINT16},
            DownSceneID: {ID: 0x0020, type: DataType.UINT8},
            DownGroupID: {ID: 0x0021, type: DataType.UINT16},
            SwitchActions: {ID: 0x0001, type: DataType.ENUM8},
        },
        commands: {},
        commandsResponse: {},
    },
    manuSpecificSchneiderLightSwitchConfiguration: {
        ID: 0xff17,
        manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC,
        attributes: {
            ledIndication: {ID: 0x0000, type: DataType.ENUM8},
            upSceneID: {ID: 0x0010, type: DataType.UINT8},
            upGroupID: {ID: 0x0011, type: DataType.UINT16},
            downSceneID: {ID: 0x0020, type: DataType.UINT8},
            downGroupID: {ID: 0x0021, type: DataType.UINT16},
            switchActions: {ID: 0x0001, type: DataType.ENUM8},
        },
        commands: {},
        commandsResponse: {},
    },
    manuSpecificSchneiderFanSwitchConfiguration: {
        ID: 0xfc04,
        manufacturerCode: ManufacturerCode.SCHNEIDER_ELECTRIC,
        attributes: {
            ledIndication: {ID: 0x0002, type: DataType.UINT8},
            ledOrientation: {ID: 0x0060, type: DataType.UINT8},
        },
        commands: {},
        commandsResponse: {},
    },
    sprutDevice: {
        ID: 26112,
        manufacturerCode: 26214,
        attributes: {},
        commands: {},
        commandsResponse: {},
    },
    sprutVoc: {
        ID: 26113,
        manufacturerCode: 26214,
        attributes: {
            voc: {ID: 26112, type: DataType.UINT16},
        },
        commands: {},
        commandsResponse: {},
    },
    sprutNoise: {
        ID: 26114,
        manufacturerCode: 26214,
        attributes: {
            noise: {ID: 26112, type: DataType.SINGLE_PREC},
            noiseDetected: {ID: 26113, type: DataType.BITMAP8},
            noiseDetectLevel: {ID: 26114, type: DataType.SINGLE_PREC},
            noiseAfterDetectDelay: {ID: 26115, type: DataType.UINT16},
        },
        commands: {},
        commandsResponse: {},
    },
    sprutIrBlaster: {
        ID: 26115,
        manufacturerCode: 26214,
        attributes: {},
        commands: {
            playStore: {
                ID: 0x00,
                parameters: [{name: 'param', type: DataType.UINT8}],
            },
            learnStart: {
                ID: 0x01,
                parameters: [{name: 'value', type: DataType.UINT8}],
            },
            learnStop: {
                ID: 0x02,
                parameters: [{name: 'value', type: DataType.UINT8}],
            },
            clearStore: {
                ID: 0x03,
                parameters: [],
            },
            playRam: {
                ID: 0x04,
                parameters: [],
            },
            learnRamStart: {
                ID: 0x05,
                parameters: [],
            },
            learnRamStop: {
                ID: 0x06,
                parameters: [],
            },
        },
        commandsResponse: {},
    },
    manuSpecificSiglisZigfred: {
        ID: 0xfc42,
        manufacturerCode: 0x129c,
        attributes: {
            buttonEvent: {ID: 0x0008, type: DataType.UINT32},
        },
        commands: {
            siglisZigfredButtonEvent: {
                ID: 0x02,
                parameters: [
                    {name: 'button', type: DataType.UINT8},
                    {name: 'type', type: DataType.UINT8},
                    {name: 'duration', type: DataType.UINT16},
                ],
            },
        },
        commandsResponse: {},
    },
    owonClearMetering: {
        ID: 0xffe0,
        manufacturerCode: ManufacturerCode.OWON_TECHNOLOGY_INC,
        attributes: {},
        commands: {
            owonClearMeasurementData: {
                ID: 0x00,
                parameters: [],
            },
        },
        commandsResponse: {},
    },
    zosungIRTransmit: {
        ID: 0xed00,
        attributes: {},
        commands: {
            zosungSendIRCode00: {
                ID: 0,
                parameters: [
                    {name: 'seq', type: DataType.UINT16},
                    {name: 'length', type: DataType.UINT32},
                    {name: 'unk1', type: DataType.UINT32},
                    {name: 'unk2', type: DataType.UINT16},
                    {name: 'unk3', type: DataType.UINT8},
                    {name: 'cmd', type: DataType.UINT8},
                    {name: 'unk4', type: DataType.UINT16},
                ],
            },
            zosungSendIRCode01: {
                ID: 1,
                parameters: [
                    {name: 'zero', type: DataType.UINT8},
                    {name: 'seq', type: DataType.UINT16},
                    {name: 'length', type: DataType.UINT32},
                    {name: 'unk1', type: DataType.UINT32},
                    {name: 'unk2', type: DataType.UINT16},
                    {name: 'unk3', type: DataType.UINT8},
                    {name: 'cmd', type: DataType.UINT8},
                    {name: 'unk4', type: DataType.UINT16},
                ],
            },
            zosungSendIRCode02: {
                ID: 2,
                parameters: [
                    {name: 'seq', type: DataType.UINT16},
                    {name: 'position', type: DataType.UINT32},
                    {name: 'maxlen', type: DataType.UINT8},
                ],
            },
            zosungSendIRCode03: {
                ID: 3,
                parameters: [
                    {name: 'zero', type: DataType.UINT8},
                    {name: 'seq', type: DataType.UINT16},
                    {name: 'position', type: DataType.UINT32},
                    {name: 'msgpart', type: DataType.OCTET_STR},
                    {name: 'msgpartcrc', type: DataType.UINT8},
                ],
            },
            zosungSendIRCode04: {
                ID: 4,
                parameters: [
                    {name: 'zero0', type: DataType.UINT8},
                    {name: 'seq', type: DataType.UINT16},
                    {name: 'zero1', type: DataType.UINT16},
                ],
            },
            zosungSendIRCode05: {
                ID: 5,
                parameters: [
                    {name: 'seq', type: DataType.UINT16},
                    {name: 'zero', type: DataType.UINT16},
                ],
            },
        },
        commandsResponse: {
            zosungSendIRCode03Resp: {
                ID: 3,
                parameters: [
                    {name: 'zero', type: DataType.UINT8},
                    {name: 'seq', type: DataType.UINT16},
                    {name: 'position', type: DataType.UINT32},
                    {name: 'msgpart', type: DataType.OCTET_STR},
                    {name: 'msgpartcrc', type: DataType.UINT8},
                ],
            },
            zosungSendIRCode05Resp: {
                ID: 5,
                parameters: [
                    {name: 'seq', type: DataType.UINT16},
                    {name: 'zero', type: DataType.UINT16},
                ],
            },
        },
    },
    zosungIRControl: {
        ID: 0xe004,
        attributes: {},
        commands: {
            zosungControlIRCommand00: {
                ID: 0,
                parameters: [
                    // JSON string with a command.
                    {name: 'data', type: BuffaloZclDataType.BUFFER},
                ],
            },
        },
        commandsResponse: {},
    },
    manuSpecificAssaDoorLock: {
        ID: 0xfc00,
        attributes: {
            autoLockTime: {ID: 0x0012, type: DataType.UINT8},
            wrongCodeAttempts: {ID: 0x0013, type: DataType.UINT8},
            shutdownTime: {ID: 0x0014, type: DataType.UINT8},
            batteryLevel: {ID: 0x0015, type: DataType.UINT8},
            insideEscutcheonLED: {ID: 0x0016, type: DataType.UINT8},
            volume: {ID: 0x0017, type: DataType.UINT8},
            lockMode: {ID: 0x0018, type: DataType.UINT8},
            language: {ID: 0x0019, type: DataType.UINT8},
            allCodesLockout: {ID: 0x001a, type: DataType.BOOLEAN},
            oneTouchLocking: {ID: 0x001b, type: DataType.BOOLEAN},
            privacyButtonSetting: {ID: 0x001c, type: DataType.BOOLEAN},
            /* enableLogging: {ID: 0x0020, type: DataType.BOOLEAN},*/ // marked in C4 driver as not supported
            numberLogRecordsSupported: {ID: 0x0021, type: DataType.UINT16},
            numberPinsSupported: {ID: 0x0030, type: DataType.UINT8},
            numberScheduleSlotsPerUser: {ID: 0x0040, type: DataType.UINT8},
            alarmMask: {ID: 0x0050, type: DataType.UINT8},
        },
        commands: {
            getLockStatus: {
                ID: 0x10,
                response: 0,
                parameters: [],
            },
            getBatteryLevel: {
                ID: 0x12,
                parameters: [],
            },
            setRFLockoutTime: {
                ID: 0x13,
                parameters: [],
            },
            /* getLogRecord: {
                ID: 0x20,
                parameters: [],
            },*/ // marked in C4 driver as not supported
            userCodeSet: {
                ID: 0x30,
                parameters: [
                    // bit pack ("bbb", slot, status, pinLength) .. pin
                    {name: 'payload', type: DataType.CHAR_STR},
                ],
            },
            userCodeGet: {
                ID: 0x31,
                parameters: [
                    // bit pack ("b", slot)
                    {name: 'payload', type: DataType.CHAR_STR},
                ],
            },
            userCodeClear: {
                ID: 0x32,
                parameters: [
                    // bit pack ("b", slot)
                    {name: 'payload', type: DataType.CHAR_STR},
                ],
            },
            clearAllUserCodes: {
                ID: 0x33,
                parameters: [],
            },
            setUserCodeStatus: {
                ID: 0x34,
                parameters: [],
            },
            getUserCodeStatus: {
                ID: 0x35,
                parameters: [],
            },
            getLastUserIdEntered: {
                ID: 0x36,
                parameters: [],
            },
            userAdded: {
                ID: 0x37,
                parameters: [],
            },
            userDeleted: {
                ID: 0x38,
                parameters: [],
            },
            setScheduleSlot: {
                ID: 0x40,
                parameters: [
                    // bit pack ("bbbbbbb", 0, slot, weeklyScheduleNumber, startHour, startMinute, hours, minutes)
                    {name: 'payload', type: DataType.CHAR_STR},
                ],
            },
            getScheduleSlot: {
                ID: 0x41,
                parameters: [
                    // bit pack ("bb", slot, userId)
                    {name: 'payload', type: DataType.CHAR_STR},
                ],
            },
            setScheduleSlotStatus: {
                ID: 0x42,
                parameters: [
                    // bit pack ("bbb", 0, slot, status)
                    {name: 'payload', type: DataType.CHAR_STR},
                ],
            },
            reflash: {
                ID: 0x60,
                response: 1,
                parameters: [
                    // bit pack ("bI", version, length)
                    {name: 'payload', type: DataType.CHAR_STR},
                ],
            },
            reflashData: {
                ID: 0x61,
                response: 2,
                parameters: [
                    // bit pack ("IH", segmentId - 1, length) .. string sub (data, start, finish)
                    {name: 'payload', type: DataType.CHAR_STR},
                ],
            },
            reflashStatus: {
                ID: 0x62,
                response: 3,
                parameters: [
                    // bit pack ("bI", reflashStatusParameter, 0x00)
                    {name: 'payload', type: DataType.CHAR_STR},
                ],
            },
            getReflashLock: {
                ID: 0x90,
                parameters: [],
            },
            getHistory: {
                ID: 0xa0,
                parameters: [],
            },
            getLogin: {
                ID: 0xa1,
                parameters: [],
            },
            getUser: {
                ID: 0xa2,
                parameters: [],
            },
            getUsers: {
                ID: 0xa3,
                parameters: [],
            },
            getMandatoryAttributes: {
                ID: 0xb0,
                parameters: [],
            },
            readAttribute: {
                ID: 0xb1,
                parameters: [],
            },
            writeAttribute: {
                ID: 0xb2,
                parameters: [],
            },
            configureReporting: {
                ID: 0xb3,
                parameters: [],
            },
            getBasicClusterAttributes: {
                ID: 0xb4,
                parameters: [],
            },
        },
        commandsResponse: {
            getLockStatusRsp: {
                ID: 0,
                parameters: [{name: 'status', type: DataType.UINT8}],
            },
            reflashRsp: {
                ID: 1,
                parameters: [{name: 'status', type: DataType.UINT8}],
            },
            reflashDataRsp: {
                ID: 2,
                parameters: [{name: 'status', type: DataType.UINT8}],
            },
            reflashStatusRsp: {
                ID: 3,
                parameters: [{name: 'status', type: DataType.UINT8}],
            },
            /* boltStateRsp: {
                ID: 4,
                parameters: [
                    {name: 'state', type: DataType.UINT8},
                ],
            },*/ // C4 driver has this response yet there is no command - maybe a non-specific cluster response?
            /* lockStatusReportRsp: {
                ID: 5,
                parameters: [
                    {name: 'status', type: DataType.UINT8},
                ],
            },*/ // C4 driver has this response yet there is no command - maybe a non-specific cluster response?
            /* handleStateRsp: {
                ID: 6,
                parameters: [
                    {name: 'state', type: DataType.UINT8},
                ],
            },*/ // C4 driver has this response yet there is no command - maybe a non-specific cluster response?
            /* userStatusRsp: {
                ID: 7,
                parameters: [
                    {name: 'status', type: DataType.UINT8},
                ],
            },*/ // C4 driver has this response yet there is no command - maybe a non-specific cluster response?
        },
    },
    manuSpecificDoorman: {
        ID: 0xeacc,
        attributes: {},
        commands: {
            getConfigurationParameter: {
                ID: 0xfc,
                parameters: [
                    // bit pack ("bbb", 0x00, 0x00, configurationId)
                    {name: 'payload', type: DataType.CHAR_STR},
                ],
            },
            setConfigurationParameter: {
                ID: 0xfd,
                parameters: [
                    // bit pack ("bbbb", 0x00, 0x00, configurationId, value)
                    {name: 'payload', type: DataType.CHAR_STR},
                ],
            },
            integrationModeActivation: {
                ID: 0x25,
                parameters: [
                    // bit pack ("bbbbb", slot, codeType, string sub (userCode, 1, 2), string sub (userCode, 3, 4), string sub (userCode, 5, 6)) .. String duplicate (0xff, 12)
                    {name: 'payload', type: DataType.CHAR_STR},
                ],
            },
            armDisarm: {
                ID: 0x4e,
                parameters: [
                    // bit pack ("bb", lockSequenceNumber, operatingParameter)
                    {name: 'payload', type: DataType.CHAR_STR},
                ],
            },
        },
        commandsResponse: {},
    },
    manuSpecificProfalux1: {
        ID: 0xfc21, // Config cluster, 0xfc20 mostly for commands it seems
        manufacturerCode: ManufacturerCode.PROFALUX,
        attributes: {
            motorCoverType: {ID: 0, type: DataType.UINT8}, // 0 : rolling shutters (volet), 1 : rolling shutters with tilt (BSO), 2: shade (store)
        },
        commands: {},
        commandsResponse: {},
    },
    manuSpecificAmazonWWAH: {
        ID: 0xfc57,
        manufacturerCode: ManufacturerCode.AMAZON_LAB126,
        attributes: {
            disableOTADowngrades: {ID: 0x0002, type: DataType.BOOLEAN},
            mgmtLeaveWithoutRejoinEnabled: {ID: 0x0003, type: DataType.BOOLEAN},
            nwkRetryCount: {ID: 0x0004, type: DataType.UINT8},
            macRetryCount: {ID: 0x0005, type: DataType.UINT8},
            routerCheckInEnabled: {ID: 0x0006, type: DataType.BOOLEAN},
            touchlinkInterpanEnabled: {ID: 0x0007, type: DataType.BOOLEAN},
            wwahParentClassificationEnabled: {ID: 0x0008, type: DataType.BOOLEAN},
            wwahAppEventRetryEnabled: {ID: 0x0009, type: DataType.BOOLEAN},
            wwahAppEventRetryQueueSize: {ID: 0x000a, type: DataType.UINT8},
            wwahRejoinEnabled: {ID: 0x000b, type: DataType.BOOLEAN},
            macPollFailureWaitTime: {ID: 0x000c, type: DataType.UINT8},
            configurationModeEnabled: {ID: 0x000d, type: DataType.BOOLEAN},
            currentDebugReportID: {ID: 0x000e, type: DataType.UINT8},
            tcSecurityOnNwkKeyRotationEnabled: {ID: 0x000f, type: DataType.BOOLEAN},
            wwahBadParentRecoveryEnabled: {ID: 0x0010, type: DataType.BOOLEAN},
            pendingNetworkUpdateChannel: {ID: 0x0011, type: DataType.UINT8},
            pendingNetworkUpdatePANID: {ID: 0x0012, type: DataType.UINT16},
            otaMaxOfflineDuration: {ID: 0x0013, type: DataType.UINT16},
            clusterRevision: {ID: 0xfffd, type: DataType.UINT16},
        },
        commands: {
            clearBindingTable: {
                ID: 0x0a,
                parameters: [],
            },
        },
        commandsResponse: {},
    },
};

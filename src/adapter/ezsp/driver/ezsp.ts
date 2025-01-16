/* v8 ignore start */

import {EventEmitter} from 'node:events';

import {Queue, wait, Waitress} from '../../../utils';
import {logger} from '../../../utils/logger';
import {SerialPortOptions} from '../../tstype';
import {
    EZSPFrameDesc,
    FRAME_NAMES_BY_ID,
    FRAMES,
    ParamsDesc,
    ZDOREQUEST_NAME_BY_ID,
    ZDOREQUESTS,
    ZDORESPONSE_NAME_BY_ID,
    ZDORESPONSES,
} from './commands';
import * as t from './types';
import {
    EmberConcentratorType,
    EmberOutgoingMessageType,
    EmberStatus,
    EmberZdoConfigurationFlags,
    EzspConfigId,
    EzspDecisionBitmask,
    EzspDecisionId,
    EzspPolicyId,
} from './types/named';
import {EmberApsFrame, EmberNetworkParameters} from './types/struct';
import {SerialDriver} from './uart';

const NS = 'zh:ezsp:ezsp';

const MAX_SERIAL_CONNECT_ATTEMPTS = 4;
/** In ms. This is multiplied by tries count (above), e.g. 4 tries = 5000, 10000, 15000 */
const SERIAL_CONNECT_NEW_ATTEMPT_MIN_DELAY = 5000;
const MTOR_MIN_INTERVAL = 10;
const MTOR_MAX_INTERVAL = 90;
const MTOR_ROUTE_ERROR_THRESHOLD = 4;
const MTOR_DELIVERY_FAIL_THRESHOLD = 3;
const MAX_WATCHDOG_FAILURES = 4;
//const RESET_ATTEMPT_BACKOFF_TIME = 5;
const WATCHDOG_WAKE_PERIOD = 10; // in sec
//const EZSP_COUNTER_CLEAR_INTERVAL = 180;  // Clear counters every n * WATCHDOG_WAKE_PERIOD
const EZSP_DEFAULT_RADIUS = 0;
const EZSP_MULTICAST_NON_MEMBER_RADIUS = 3;

const CONFIG_IDS_PRE_V9: number[][] = [
    [EzspConfigId.CONFIG_TC_REJOINS_USING_WELL_KNOWN_KEY_TIMEOUT_S, 90],
    [EzspConfigId.CONFIG_TRUST_CENTER_ADDRESS_CACHE_SIZE, 2],
    //[EzspConfigId.CONFIG_SUPPORTED_NETWORKS, 1],
    [EzspConfigId.CONFIG_FRAGMENT_DELAY_MS, 50],
    [EzspConfigId.CONFIG_PAN_ID_CONFLICT_REPORT_THRESHOLD, 2],
    //[EzspConfigId.CONFIG_SOURCE_ROUTE_TABLE_SIZE, 16],
    //[EzspConfigId.CONFIG_ADDRESS_TABLE_SIZE, 16],
    [
        EzspConfigId.CONFIG_APPLICATION_ZDO_FLAGS,
        EmberZdoConfigurationFlags.APP_HANDLES_UNSUPPORTED_ZDO_REQUESTS | EmberZdoConfigurationFlags.APP_RECEIVES_SUPPORTED_ZDO_REQUESTS,
    ],
    [EzspConfigId.CONFIG_INDIRECT_TRANSMISSION_TIMEOUT, 7680],
    [EzspConfigId.CONFIG_END_DEVICE_POLL_TIMEOUT, 14],
    [EzspConfigId.CONFIG_SECURITY_LEVEL, 5],
    [EzspConfigId.CONFIG_STACK_PROFILE, 2],
    //[EzspConfigId.CONFIG_TX_POWER_MODE, 3],
    [EzspConfigId.CONFIG_FRAGMENT_WINDOW_SIZE, 1],
    //[EzspConfigId.CONFIG_NEIGHBOR_TABLE_SIZE, 16],
    //[EzspConfigId.CONFIG_ROUTE_TABLE_SIZE, 16],
    //[EzspConfigId.CONFIG_BINDING_TABLE_SIZE, 32],
    //[EzspConfigId.CONFIG_KEY_TABLE_SIZE, 12],
    //[EzspConfigId.CONFIG_ZLL_GROUP_ADDRESSES, 0],
    //[EzspConfigId.CONFIG_ZLL_RSSI_THRESHOLD, 0],
    //[EzspConfigId.CONFIG_APS_UNICAST_MESSAGE_COUNT, 255],
    //[EzspConfigId.CONFIG_BROADCAST_TABLE_SIZE, 43],
    //[EzspConfigId.CONFIG_MAX_HOPS, 30],
    //[EzspConfigId.CONFIG_MAX_END_DEVICE_CHILDREN, 32],
    [EzspConfigId.CONFIG_PACKET_BUFFER_COUNT, 255],
];

/**
 * Can only decrease "NCP Memory Allocation" configs at runtime from V9 on.
 * @see https://www.silabs.com/documents/public/release-notes/emberznet-release-notes-7.0.1.0.pdf
 */
const CONFIG_IDS_CURRENT: number[][] = [
    [EzspConfigId.CONFIG_TC_REJOINS_USING_WELL_KNOWN_KEY_TIMEOUT_S, 90],
    [EzspConfigId.CONFIG_TRUST_CENTER_ADDRESS_CACHE_SIZE, 2],
    [EzspConfigId.CONFIG_FRAGMENT_DELAY_MS, 50],
    [EzspConfigId.CONFIG_PAN_ID_CONFLICT_REPORT_THRESHOLD, 2],
    [
        EzspConfigId.CONFIG_APPLICATION_ZDO_FLAGS,
        EmberZdoConfigurationFlags.APP_HANDLES_UNSUPPORTED_ZDO_REQUESTS | EmberZdoConfigurationFlags.APP_RECEIVES_SUPPORTED_ZDO_REQUESTS,
    ],
    [EzspConfigId.CONFIG_INDIRECT_TRANSMISSION_TIMEOUT, 7680],
    [EzspConfigId.CONFIG_END_DEVICE_POLL_TIMEOUT, 14],
    [EzspConfigId.CONFIG_SECURITY_LEVEL, 5],
    [EzspConfigId.CONFIG_STACK_PROFILE, 2],
    [EzspConfigId.CONFIG_FRAGMENT_WINDOW_SIZE, 1],
];

const POLICY_IDS_PRE_V8: number[][] = [
    // [EzspPolicyId.BINDING_MODIFICATION_POLICY,
    //     EzspDecisionId.DISALLOW_BINDING_MODIFICATION],
    // [EzspPolicyId.UNICAST_REPLIES_POLICY, EzspDecisionId.HOST_WILL_NOT_SUPPLY_REPLY],
    // [EzspPolicyId.POLL_HANDLER_POLICY, EzspDecisionId.POLL_HANDLER_IGNORE],
    // [EzspPolicyId.MESSAGE_CONTENTS_IN_CALLBACK_POLICY,
    //     EzspDecisionId.MESSAGE_TAG_ONLY_IN_CALLBACK],
    // [EzspPolicyId.PACKET_VALIDATE_LIBRARY_POLICY,
    //     EzspDecisionId.PACKET_VALIDATE_LIBRARY_CHECKS_DISABLED],
    // [EzspPolicyId.ZLL_POLICY, EzspDecisionId.ALLOW_JOINS],
    // [EzspPolicyId.TC_REJOINS_USING_WELL_KNOWN_KEY_POLICY, EzspDecisionId.ALLOW_JOINS],
    [EzspPolicyId.APP_KEY_REQUEST_POLICY, EzspDecisionId.DENY_APP_KEY_REQUESTS],
    [EzspPolicyId.TC_KEY_REQUEST_POLICY, EzspDecisionId.ALLOW_TC_KEY_REQUESTS],
];

const POLICY_IDS_CURRENT: number[][] = [
    [EzspPolicyId.APP_KEY_REQUEST_POLICY, EzspDecisionId.DENY_APP_KEY_REQUESTS],
    [EzspPolicyId.TC_KEY_REQUEST_POLICY, EzspDecisionId.ALLOW_TC_KEY_REQUESTS],
    [EzspPolicyId.TRUST_CENTER_POLICY, EzspDecisionBitmask.ALLOW_UNSECURED_REJOINS | EzspDecisionBitmask.ALLOW_JOINS],
];

type EZSPFrame = {
    sequence: number;
    frameId: number;
    frameName: string;
    payload: EZSPFrameData;
};

type EZSPWaitressMatcher = {
    sequence: number | null;
    frameId: number | string;
};

export class EZSPFrameData {
    _cls_: string;
    _id_: number;
    _isRequest_: boolean;
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
    [name: string]: any;

    static createFrame(ezspv: number, frame_id: number, isRequest: boolean, params: ParamsDesc | Buffer): EZSPFrameData {
        const names = FRAME_NAMES_BY_ID[frame_id];
        if (!names) {
            throw new Error(`Unrecognized frame FrameID ${frame_id}`);
        }
        let frm: EZSPFrameData;
        names.every((frameName) => {
            const frameDesc = EZSPFrameData.getFrame(frameName);
            if ((frameDesc.maxV && frameDesc.maxV < ezspv) || (frameDesc.minV && frameDesc.minV > ezspv)) {
                return true;
            }
            try {
                frm = new EZSPFrameData(frameName, isRequest, params);
            } catch (error) {
                logger.error(`Frame ${frameName} parsing error: ${error}`, NS);
                return true;
            }
            return false;
        });
        return frm!;
    }

    static getFrame(name: string): EZSPFrameDesc {
        const frameDesc = FRAMES[name];
        if (!frameDesc) throw new Error(`Unrecognized frame from FrameID ${name}`);
        return frameDesc;
    }

    constructor(key: string, isRequest: boolean, params: ParamsDesc | Buffer | undefined) {
        this._cls_ = key;
        this._id_ = FRAMES[this._cls_].ID;

        this._isRequest_ = isRequest;
        const frame = EZSPFrameData.getFrame(key);
        const frameDesc = this._isRequest_ ? frame.request || {} : frame.response || {};
        if (Buffer.isBuffer(params)) {
            let data = params;
            for (const prop of Object.getOwnPropertyNames(frameDesc)) {
                [this[prop], data] = frameDesc[prop].deserialize(frameDesc[prop], data);
            }
        } else {
            for (const prop of Object.getOwnPropertyNames(frameDesc)) {
                this[prop] = params![prop]; // XXX: assumed defined with logic
            }
        }
    }

    serialize(): Buffer {
        const frame = EZSPFrameData.getFrame(this._cls_);
        const frameDesc = this._isRequest_ ? frame.request || {} : frame.response || {};
        const result = [];
        for (const prop of Object.getOwnPropertyNames(frameDesc)) {
            result.push(frameDesc[prop].serialize(frameDesc[prop], this[prop]));
        }
        return Buffer.concat(result);
    }

    get name(): string {
        return this._cls_;
    }

    get id(): number {
        return this._id_;
    }
}

export class EZSPZDORequestFrameData {
    _cls_: string;
    _id_: number;
    _isRequest_: boolean;
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
    [name: string]: any;

    static getFrame(key: string | number): EZSPFrameDesc {
        const name = typeof key == 'string' ? key : ZDOREQUEST_NAME_BY_ID[key];
        const frameDesc = ZDOREQUESTS[name];
        if (!frameDesc) throw new Error(`Unrecognized ZDOFrame from FrameID ${key}`);
        return frameDesc;
    }

    constructor(key: string | number, isRequest: boolean, params: ParamsDesc | Buffer) {
        if (typeof key == 'string') {
            this._cls_ = key;
            this._id_ = ZDOREQUESTS[this._cls_].ID;
        } else {
            this._id_ = key;
            this._cls_ = ZDOREQUEST_NAME_BY_ID[key];
        }

        this._isRequest_ = isRequest;
        const frame = EZSPZDORequestFrameData.getFrame(key);
        const frameDesc = this._isRequest_ ? frame.request || {} : frame.response || {};
        if (Buffer.isBuffer(params)) {
            let data = params;
            for (const prop of Object.getOwnPropertyNames(frameDesc)) {
                [this[prop], data] = frameDesc[prop].deserialize(frameDesc[prop], data);
            }
        } else {
            for (const prop of Object.getOwnPropertyNames(frameDesc)) {
                this[prop] = params[prop];
            }
        }
    }

    serialize(): Buffer {
        const frame = EZSPZDORequestFrameData.getFrame(this._cls_);
        const frameDesc = this._isRequest_ ? frame.request || {} : frame.response || {};
        const result = [];
        for (const prop of Object.getOwnPropertyNames(frameDesc)) {
            result.push(frameDesc[prop].serialize(frameDesc[prop], this[prop]));
        }
        return Buffer.concat(result);
    }

    get name(): string {
        return this._cls_;
    }

    get id(): number {
        return this._id_;
    }
}

export class EZSPZDOResponseFrameData {
    _cls_: string;
    _id_: number;
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
    [name: string]: any;

    static getFrame(key: string | number): ParamsDesc {
        const name = typeof key == 'string' ? key : ZDORESPONSE_NAME_BY_ID[key];
        const frameDesc = ZDORESPONSES[name];
        if (!frameDesc) throw new Error(`Unrecognized ZDOFrame from FrameID ${key}`);
        return frameDesc.params;
    }

    constructor(key: string | number, params: ParamsDesc | Buffer) {
        if (typeof key == 'string') {
            this._cls_ = key;
            this._id_ = ZDORESPONSES[this._cls_].ID;
        } else {
            this._id_ = key;
            this._cls_ = ZDORESPONSE_NAME_BY_ID[key];
        }

        const frameDesc = EZSPZDOResponseFrameData.getFrame(key);
        if (Buffer.isBuffer(params)) {
            let data = params;
            for (const prop of Object.getOwnPropertyNames(frameDesc)) {
                [this[prop], data] = frameDesc[prop].deserialize(frameDesc[prop], data);
            }
        } else {
            for (const prop of Object.getOwnPropertyNames(frameDesc)) {
                this[prop] = params[prop];
            }
        }
    }

    serialize(): Buffer {
        const frameDesc = EZSPZDOResponseFrameData.getFrame(this._cls_);
        const result = [];
        for (const prop of Object.getOwnPropertyNames(frameDesc)) {
            result.push(frameDesc[prop].serialize(frameDesc[prop], this[prop]));
        }
        return Buffer.concat(result);
    }

    get name(): string {
        return this._cls_;
    }

    get id(): number {
        return this._id_;
    }
}

export class Ezsp extends EventEmitter {
    ezspV = 4;
    cmdSeq = 0; // command sequence

    // COMMANDS_BY_ID = new Map<number, { name: string, inArgs: any[], outArgs: any[] }>();
    private serialDriver: SerialDriver;
    private waitress: Waitress<EZSPFrame, EZSPWaitressMatcher>;
    private queue: Queue;
    private watchdogTimer?: NodeJS.Timeout;
    private failures = 0;
    private inResetingProcess = false;

    constructor() {
        super();
        this.queue = new Queue();
        this.waitress = new Waitress<EZSPFrame, EZSPWaitressMatcher>(this.waitressValidator, this.waitressTimeoutFormatter);

        this.serialDriver = new SerialDriver();
        this.serialDriver.on('received', this.onFrameReceived.bind(this));
        this.serialDriver.on('close', this.onSerialClose.bind(this));
    }

    public async connect(options: SerialPortOptions): Promise<void> {
        let lastError = null;

        const resetForReconnect = (): void => {
            throw new Error('Failure to connect');
        };
        this.serialDriver.on('reset', resetForReconnect);

        for (let i = 1; i <= MAX_SERIAL_CONNECT_ATTEMPTS; i++) {
            try {
                await this.serialDriver.connect(options);
                break;
            } catch (error) {
                logger.error(`Connection attempt ${i} error: ${error}`, NS);

                if (i < MAX_SERIAL_CONNECT_ATTEMPTS) {
                    await wait(SERIAL_CONNECT_NEW_ATTEMPT_MIN_DELAY * i);
                    logger.debug(`Next attempt ${i + 1}`, NS);
                }

                lastError = error;
            }
        }

        this.serialDriver.off('reset', resetForReconnect);

        if (!this.serialDriver.isInitialized()) {
            throw new Error('Failure to connect', {cause: lastError});
        }

        this.inResetingProcess = false;

        this.serialDriver.on('reset', this.onSerialReset.bind(this));

        if (WATCHDOG_WAKE_PERIOD) {
            this.watchdogTimer = setInterval(this.watchdogHandler.bind(this), WATCHDOG_WAKE_PERIOD * 1000);
        }
    }

    public isInitialized(): boolean {
        return this.serialDriver?.isInitialized();
    }

    private onSerialReset(): void {
        logger.debug('onSerialReset()', NS);
        this.inResetingProcess = true;
        this.emit('reset');
    }

    private onSerialClose(): void {
        logger.debug('onSerialClose()', NS);
        if (!this.inResetingProcess) {
            this.emit('close');
        }
    }

    public async close(emitClose: boolean): Promise<void> {
        logger.debug('Closing Ezsp', NS);

        clearTimeout(this.watchdogTimer);
        this.queue.clear();
        await this.serialDriver.close(emitClose);
    }

    /**
     * Handle a received EZSP frame
     *
     * The protocol has taken care of UART specific framing etc, so we should
     * just have EZSP application stuff here, with all escaping/stuffing and
     * data randomization removed.
     * @param data
     */
    private onFrameReceived(data: Buffer): void {
        logger.debug(`<== Frame: ${data.toString('hex')}`, NS);

        let frameId: number;
        const sequence = data[0];

        if (this.ezspV < 8) {
            [frameId, data] = [data[2], data.subarray(3)];
        } else {
            [[frameId], data] = t.deserialize(data.subarray(3), [t.uint16_t]);
        }

        if (frameId === 255) {
            frameId = 0;

            if (data.length > 1) {
                frameId = data[1];
                data = data.subarray(2);
            }
        }

        const frm = EZSPFrameData.createFrame(this.ezspV, frameId, false, data);

        if (!frm) {
            logger.error(`Unparsed frame 0x${frameId.toString(16)}. Skipped`, NS);
            return;
        }

        logger.debug(() => `<== 0x${frameId.toString(16)}: ${JSON.stringify(frm)}`, NS);

        const handled = this.waitress.resolve({
            frameId,
            frameName: frm.name,
            sequence,
            payload: frm,
        });

        if (!handled) {
            this.emit('frame', frm.name, frm);
        }

        if (frameId === 0) {
            this.ezspV = frm.protocolVersion;
        }
    }

    async version(): Promise<number> {
        const version = this.ezspV;
        const result = await this.execCommand('version', {desiredProtocolVersion: version});

        if (result.protocolVersion >= 14) {
            throw new Error(`'ezsp' driver is not compatible with firmware 8.x.x or above (EZSP v14+). Use 'ember' driver instead.`);
        }

        if (result.protocolVersion !== version) {
            logger.debug(`Switching to eszp version ${result.protocolVersion}`, NS);

            await this.execCommand('version', {desiredProtocolVersion: result.protocolVersion});
        }

        return result.protocolVersion;
    }

    async networkInit(): Promise<boolean> {
        const waiter = this.waitFor('stackStatusHandler', null);
        const result = await this.execCommand('networkInit');

        logger.debug(`Network init result: ${JSON.stringify(result)}`, NS);

        if (result.status !== EmberStatus.SUCCESS) {
            this.waitress.remove(waiter.ID);
            throw new Error('Failure to init network');
        }

        const response = await waiter.start().promise;

        return response.payload.status == EmberStatus.NETWORK_UP;
    }

    async leaveNetwork(): Promise<number> {
        const waiter = this.waitFor('stackStatusHandler', null);
        const result = await this.execCommand('leaveNetwork');

        logger.debug(`Network init result: ${JSON.stringify(result)}`, NS);

        if (result.status !== EmberStatus.SUCCESS) {
            this.waitress.remove(waiter.ID);
            throw new Error('Failure to leave network: ' + JSON.stringify(result));
        }

        const response = await waiter.start().promise;

        if (response.payload.status !== EmberStatus.NETWORK_DOWN) {
            throw new Error(`Wrong network status: ${JSON.stringify(response.payload)}`);
        }

        return response.payload.status;
    }

    async setConfigurationValue(configId: number, value: number): Promise<void> {
        const configName = EzspConfigId.valueToName(EzspConfigId, configId);
        logger.debug(`Set ${configName} = ${value}`, NS);
        const ret = await this.execCommand('setConfigurationValue', {configId: configId, value: value});

        if (ret.status !== EmberStatus.SUCCESS) {
            logger.error(`Command (setConfigurationValue(${configName}, ${value})) returned unexpected state: ${JSON.stringify(ret)}`, NS);
        }
    }

    async getConfigurationValue(configId: number): Promise<number> {
        const configName = EzspConfigId.valueToName(EzspConfigId, configId);
        logger.debug(`Get ${configName}`, NS);
        const ret = await this.execCommand('getConfigurationValue', {configId: configId});

        if (ret.status !== EmberStatus.SUCCESS) {
            logger.error(`Command (getConfigurationValue(${configName})) returned unexpected state: ${JSON.stringify(ret)}`, NS);
        }

        logger.debug(`Got ${configName} = ${ret.value}`, NS);
        return ret.value;
    }

    async getMulticastTableEntry(index: number): Promise<t.EmberMulticastTableEntry> {
        const ret = await this.execCommand('getMulticastTableEntry', {index: index});
        return ret.value;
    }

    async setMulticastTableEntry(index: number, entry: t.EmberMulticastTableEntry): Promise<EmberStatus> {
        const ret = await this.execCommand('setMulticastTableEntry', {index: index, value: entry});

        if (ret.status !== EmberStatus.SUCCESS) {
            logger.error(`Command (setMulticastTableEntry) returned unexpected state: ${JSON.stringify(ret)}`, NS);
        }

        return ret.status;
    }

    async setInitialSecurityState(entry: t.EmberInitialSecurityState): Promise<EmberStatus> {
        const ret = await this.execCommand('setInitialSecurityState', {state: entry});

        if (ret.success !== EmberStatus.SUCCESS) {
            logger.error(`Command (setInitialSecurityState) returned unexpected state: ${JSON.stringify(ret)}`, NS);
        }

        return ret.success;
    }

    async getCurrentSecurityState(): Promise<EZSPFrameData> {
        const ret = await this.execCommand('getCurrentSecurityState');

        if (ret.status !== EmberStatus.SUCCESS) {
            logger.error(`Command (getCurrentSecurityState) returned unexpected state: ${JSON.stringify(ret)}`, NS);
        }

        return ret;
    }

    async setValue(valueId: t.EzspValueId, value: number): Promise<EZSPFrameData> {
        const valueName = t.EzspValueId.valueToName(t.EzspValueId, valueId);
        logger.debug(`Set ${valueName} = ${value}`, NS);
        const ret = await this.execCommand('setValue', {valueId, value});

        if (ret.status !== EmberStatus.SUCCESS) {
            logger.error(`Command (setValue(${valueName}, ${value})) returned unexpected state: ${JSON.stringify(ret)}`, NS);
        }

        return ret;
    }

    async getValue(valueId: t.EzspValueId): Promise<Buffer> {
        const valueName = t.EzspValueId.valueToName(t.EzspValueId, valueId);
        logger.debug(`Get ${valueName}`, NS);
        const ret = await this.execCommand('getValue', {valueId});

        if (ret.status !== EmberStatus.SUCCESS) {
            logger.error(`Command (getValue(${valueName})) returned unexpected state: ${JSON.stringify(ret)}`, NS);
        }

        logger.debug(`Got ${valueName} = ${ret.value}`, NS);
        return ret.value;
    }

    async setPolicy(policyId: EzspPolicyId, value: number): Promise<EZSPFrameData> {
        const policyName = EzspPolicyId.valueToName(EzspPolicyId, policyId);
        logger.debug(`Set ${policyName} = ${value}`, NS);
        const ret = await this.execCommand('setPolicy', {policyId: policyId, decisionId: value});

        if (ret.status !== EmberStatus.SUCCESS) {
            logger.error(`Command (setPolicy(${policyName}, ${value})) returned unexpected state: ${JSON.stringify(ret)}`, NS);
        }

        return ret;
    }

    async updateConfig(): Promise<void> {
        const config = this.ezspV < 9 ? CONFIG_IDS_PRE_V9 : CONFIG_IDS_CURRENT;

        for (const [confName, value] of config) {
            try {
                await this.setConfigurationValue(confName, value);
            } catch (error) {
                logger.error(`setConfigurationValue(${confName}, ${value}) error: ${error}`, NS);
            }
        }
    }

    async updatePolicies(): Promise<void> {
        // Set up the policies for what the NCP should do.
        const policies = this.ezspV < 8 ? POLICY_IDS_PRE_V8 : POLICY_IDS_CURRENT;

        for (const [policy, value] of policies) {
            try {
                await this.setPolicy(policy, value);
            } catch (error) {
                logger.error(`setPolicy(${policy}, ${value}) error: ${error}`, NS);
            }
        }
    }

    public makeZDOframe(name: string | number, params: ParamsDesc): Buffer {
        const frmData = new EZSPZDORequestFrameData(name, true, params);
        return frmData.serialize();
    }

    private makeFrame(name: string, params: ParamsDesc | undefined, seq: number): Buffer {
        const frmData = new EZSPFrameData(name, true, params);

        logger.debug(() => `==> ${JSON.stringify(frmData)}`, NS);

        const frame = [seq & 255];

        if (this.ezspV < 8) {
            if (this.ezspV >= 5) {
                frame.push(0x00, 0xff, 0x00, frmData.id);
            } else {
                frame.push(0x00, frmData.id);
            }
        } else {
            const cmd_id = t.serialize([frmData.id], [t.uint16_t]);

            frame.push(0x00, 0x01, ...cmd_id);
        }

        return Buffer.concat([Buffer.from(frame), frmData.serialize()]);
    }

    public async execCommand(name: string, params?: ParamsDesc): Promise<EZSPFrameData> {
        logger.debug(() => `==> ${name}: ${JSON.stringify(params)}`, NS);

        if (!this.serialDriver.isInitialized()) {
            throw new Error('Connection not initialized');
        }

        return await this.queue.execute<EZSPFrameData>(async (): Promise<EZSPFrameData> => {
            const data = this.makeFrame(name, params, this.cmdSeq);
            const waiter = this.waitFor(name, this.cmdSeq);
            this.cmdSeq = (this.cmdSeq + 1) & 255;

            try {
                await this.serialDriver.sendDATA(data);

                const response = await waiter.start().promise;

                return response.payload;
            } catch {
                this.waitress.remove(waiter.ID);
                throw new Error(`Failure send ${name}:` + JSON.stringify(data));
            }
        });
    }

    async formNetwork(params: EmberNetworkParameters): Promise<number> {
        const waiter = this.waitFor('stackStatusHandler', null);
        const v = await this.execCommand('formNetwork', {parameters: params});

        if (v.status !== EmberStatus.SUCCESS) {
            this.waitress.remove(waiter.ID);

            logger.error('Failure forming network: ' + JSON.stringify(v), NS);

            throw new Error('Failure forming network: ' + JSON.stringify(v));
        }

        const response = await waiter.start().promise;

        if (response.payload.status !== EmberStatus.NETWORK_UP) {
            logger.error('Wrong network status: ' + JSON.stringify(response.payload), NS);

            throw new Error('Wrong network status: ' + JSON.stringify(response.payload));
        }

        return response.payload.status;
    }

    public sendUnicast(direct: EmberOutgoingMessageType, nwk: number, apsFrame: EmberApsFrame, seq: number, data: Buffer): Promise<EZSPFrameData> {
        return this.execCommand('sendUnicast', {
            type: direct,
            indexOrDestination: nwk,
            apsFrame: apsFrame,
            messageTag: seq,
            message: data,
        });
    }

    public sendMulticast(apsFrame: EmberApsFrame, seq: number, data: Buffer): Promise<EZSPFrameData> {
        return this.execCommand('sendMulticast', {
            apsFrame: apsFrame,
            hops: EZSP_DEFAULT_RADIUS,
            nonmemberRadius: EZSP_MULTICAST_NON_MEMBER_RADIUS,
            messageTag: seq,
            message: data,
        });
    }

    public async setSourceRouting(): Promise<void> {
        const res = await this.execCommand('setConcentrator', {
            on: true,
            concentratorType: EmberConcentratorType.HIGH_RAM_CONCENTRATOR,
            minTime: MTOR_MIN_INTERVAL,
            maxTime: MTOR_MAX_INTERVAL,
            routeErrorThreshold: MTOR_ROUTE_ERROR_THRESHOLD,
            deliveryFailureThreshold: MTOR_DELIVERY_FAIL_THRESHOLD,
            maxHops: 0,
        });

        logger.debug(`Set concentrator type: ${JSON.stringify(res)}`, NS);

        if (res.status != EmberStatus.SUCCESS) {
            logger.error(`Couldn't set concentrator ${JSON.stringify(res)}`, NS);
        }

        if (this.ezspV >= 8) {
            await this.execCommand('setSourceRouteDiscoveryMode', {mode: 1});
        }
    }

    public sendBroadcast(destination: number, apsFrame: EmberApsFrame, seq: number, data: Buffer): Promise<EZSPFrameData> {
        return this.execCommand('sendBroadcast', {
            destination: destination,
            apsFrame: apsFrame,
            radius: EZSP_DEFAULT_RADIUS,
            messageTag: seq,
            message: data,
        });
    }

    public waitFor(
        frameId: string | number,
        sequence: number | null,
        timeout = 10000,
    ): {start: () => {promise: Promise<EZSPFrame>; ID: number}; ID: number} {
        return this.waitress.waitFor({frameId, sequence}, timeout);
    }

    private waitressTimeoutFormatter(matcher: EZSPWaitressMatcher, timeout: number): string {
        return `${JSON.stringify(matcher)} after ${timeout}ms`;
    }

    private waitressValidator(payload: EZSPFrame, matcher: EZSPWaitressMatcher): boolean {
        const frameNames = typeof matcher.frameId == 'string' ? [matcher.frameId] : FRAME_NAMES_BY_ID[matcher.frameId];
        return (matcher.sequence == null || payload.sequence === matcher.sequence) && frameNames.includes(payload.frameName);
    }

    private async watchdogHandler(): Promise<void> {
        logger.debug(`Time to watchdog ... ${this.failures}`, NS);

        if (this.inResetingProcess) {
            logger.debug('The reset process is in progress...', NS);
            return;
        }

        try {
            await this.execCommand('nop');
        } catch (error) {
            logger.error(`Watchdog heartbeat timeout ${error}`, NS);

            if (!this.inResetingProcess) {
                this.failures += 1;

                if (this.failures > MAX_WATCHDOG_FAILURES) {
                    this.failures = 0;

                    this.emit('reset');
                }
            }
        }
    }
}

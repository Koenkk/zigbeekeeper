/* v8 ignore start */

import assert from 'node:assert';
import EventEmitter from 'node:events';

import {TsType} from '..';
import {KeyValue} from '../../controller/tstype';
import {Queue, Waitress} from '../../utils';
import {logger} from '../../utils/logger';
import * as ZSpec from '../../zspec';
import * as Zdo from '../../zspec/zdo';
import {ZBOSSNetworkInfo} from './adapter/zbossAdapter';
import {ZDO_REQ_CLUSTER_ID_TO_ZBOSS_COMMAND_ID} from './commands';
import {CommandId, ResetOptions, StatusCodeGeneric} from './enums';
import {FrameType, makeFrame, ZBOSSFrame} from './frame';
import {ZBOSSUart} from './uart';

const NS = 'zh:zboss:driv';

const MAX_INIT_ATTEMPTS = 5;

type ZBOSSWaitressMatcher = {
    tsn?: number;
    commandId: number;
};

export class ZBOSSDriver extends EventEmitter {
    public readonly port: ZBOSSUart;
    private waitress: Waitress<ZBOSSFrame, ZBOSSWaitressMatcher>;
    private queue: Queue;
    private tsn = 1; // command sequence

    constructor(options: TsType.SerialPortOptions) {
        super();
        this.queue = new Queue();
        this.waitress = new Waitress<ZBOSSFrame, ZBOSSWaitressMatcher>(this.waitressValidator, this.waitressTimeoutFormatter);

        this.port = new ZBOSSUart(options);
        this.port.on('frame', this.onFrame.bind(this));
    }

    public async connect(): Promise<boolean> {
        logger.info(`Driver connecting`, NS);

        let status: boolean = false;

        for (let i = 0; i < MAX_INIT_ATTEMPTS; i++) {
            status = await this.port.resetNcp();

            // fail early if we couldn't even get the port set up
            if (!status) {
                return status;
            }

            status = await this.port.start();

            if (status) {
                logger.info(`Driver connected`, NS);
                return status;
            }
        }

        return status;
    }

    public async reset(options = ResetOptions.NoOptions): Promise<void> {
        logger.info(`Driver reset`, NS);
        this.port.inReset = true;
        await this.execCommand(CommandId.NCP_RESET, {options}, 10000);
    }

    public async getNetworkInfo(): Promise<ZBOSSNetworkInfo> {
        let result = await this.execCommand(CommandId.GET_JOINED, {});
        const joined = result.payload.joined == 1;

        if (!joined) {
            logger.debug('Network not formed', NS);
        }

        result = await this.execCommand(CommandId.GET_ZIGBEE_ROLE, {});
        const nodeType = result.payload.role;

        result = await this.execCommand(CommandId.GET_LOCAL_IEEE_ADDR, {mac: 0});
        const ieeeAddr = result.payload.ieee;

        result = await this.execCommand(CommandId.GET_EXTENDED_PAN_ID, {});
        // TODO: bug in extendedPanID - got reversed value
        const extendedPanID = result.payload.extendedPanID.reverse();

        result = await this.execCommand(CommandId.GET_PAN_ID, {});
        const panID = result.payload.panID;

        result = await this.execCommand(CommandId.GET_ZIGBEE_CHANNEL, {});
        const channel = result.payload.channel;

        return {
            joined,
            nodeType,
            ieeeAddr,
            network: {
                panID,
                extendedPanID,
                channel,
            },
        };
    }

    public async addEndpoint(
        endpoint: number,
        profileId: number,
        deviceId: number,
        inputClusters: number[],
        outputClusters: number[],
    ): Promise<void> {
        const res = await this.execCommand(CommandId.AF_SET_SIMPLE_DESC, {
            endpoint: endpoint,
            profileID: profileId,
            deviceID: deviceId,
            version: 0,
            inputClusterCount: inputClusters.length,
            outputClusterCount: outputClusters.length,
            inputClusters: inputClusters,
            outputClusters: outputClusters,
        });

        logger.debug(() => `Adding endpoint: ${JSON.stringify(res)}`, NS);
    }

    public async stop(): Promise<void> {
        await this.port.stop();

        logger.info(`Driver stopped`, NS);
    }

    private onFrame(frame: ZBOSSFrame): void {
        logger.debug(() => `<== Frame: ${JSON.stringify(frame)}`, NS);

        const handled = this.waitress.resolve(frame);

        if (!handled) {
            this.emit('frame', frame);
        }
    }

    public isInitialized(): boolean | undefined {
        return this.port.portOpen && !this.port.inReset;
    }

    public async execCommand(commandId: number, params: KeyValue = {}, timeout: number = 10000): Promise<ZBOSSFrame> {
        logger.debug(() => `==> ${CommandId[commandId]}(${commandId}): ${JSON.stringify(params)}`, NS);

        if (!this.port.portOpen) {
            throw new Error('Connection not initialized');
        }

        return await this.queue.execute<ZBOSSFrame>(async (): Promise<ZBOSSFrame> => {
            const frame = makeFrame(FrameType.REQUEST, commandId, params);
            frame.tsn = this.tsn;
            const waiter = this.waitFor(commandId, commandId == CommandId.NCP_RESET ? undefined : this.tsn, timeout);
            this.tsn = (this.tsn + 1) & 255;

            try {
                logger.debug(() => `==> FRAME: ${JSON.stringify(frame)}`, NS);
                await this.port.sendFrame(frame);

                const response = await waiter.start().promise;
                if (response?.payload?.status !== StatusCodeGeneric.OK) {
                    throw new Error(`Error on command ${CommandId[commandId]}(${commandId}): ${JSON.stringify(response)}`);
                }

                return response;
            } catch (error) {
                this.waitress.remove(waiter.ID);
                logger.error(`==> Error: ${error}`, NS);
                throw new Error(`Failure send ${commandId}:` + JSON.stringify(frame));
            }
        });
    }

    public waitFor(
        commandId: number,
        tsn: number | undefined,
        timeout = 10000,
    ): {start: () => {promise: Promise<ZBOSSFrame>; ID: number}; ID: number} {
        return this.waitress.waitFor({commandId, tsn}, timeout);
    }

    private waitressTimeoutFormatter(matcher: ZBOSSWaitressMatcher, timeout: number): string {
        return `${JSON.stringify(matcher)} after ${timeout}ms`;
    }

    private waitressValidator(payload: ZBOSSFrame, matcher: ZBOSSWaitressMatcher): boolean {
        return (matcher.tsn === undefined || matcher.tsn === payload.tsn) && matcher.commandId == payload.commandId;
    }

    public async request(ieee: string, profileID: number, clusterID: number, dstEp: number, srcEp: number, data: Buffer): Promise<ZBOSSFrame> {
        const payload = {
            paramLength: 21,
            dataLength: data.length,
            addr: ieee,
            profileID: profileID,
            clusterID: clusterID,
            dstEndpoint: dstEp,
            srcEndpoint: srcEp,
            radius: 3,
            dstAddrMode: 3, // ADDRESS MODE ieee
            txOptions: 2, // ROUTE DISCOVERY
            useAlias: 0,
            aliasAddr: 0,
            aliasSequence: 0,
            data: data,
        };
        return await this.execCommand(CommandId.APSDE_DATA_REQ, payload);
    }

    public async brequest(
        addr: ZSpec.BroadcastAddress,
        profileID: number,
        clusterID: number,
        dstEp: number,
        srcEp: number,
        data: Buffer,
    ): Promise<ZBOSSFrame> {
        const payload = {
            paramLength: 21,
            dataLength: data.length,
            addr: `0x${addr.toString(16).padStart(16, '0')}`,
            profileID: profileID,
            clusterID: clusterID,
            dstEndpoint: dstEp,
            srcEndpoint: srcEp,
            radius: 3,
            dstAddrMode: 2, // ADDRESS MODE broadcast
            txOptions: 2, // ROUTE DISCOVERY
            useAlias: 0,
            aliasAddr: 0,
            aliasSequence: 0,
            data: data,
        };
        return await this.execCommand(CommandId.APSDE_DATA_REQ, payload);
    }

    public async grequest(group: number, profileID: number, clusterID: number, srcEp: number, data: Buffer): Promise<ZBOSSFrame> {
        const payload = {
            paramLength: 20,
            dataLength: data.length,
            addr: `0x${group.toString(16).padStart(16, '0')}`,
            profileID: profileID,
            clusterID: clusterID,
            srcEndpoint: srcEp,
            radius: 3,
            dstAddrMode: 1, // ADDRESS MODE group
            txOptions: 2, // ROUTE DISCOVERY
            useAlias: 0,
            aliasAddr: 0,
            aliasSequence: 0,
            data: data,
        };
        return await this.execCommand(CommandId.APSDE_DATA_REQ, payload);
    }

    public async requestZdo(clusterId: Zdo.ClusterId, payload: Buffer, disableResponse: boolean): Promise<ZBOSSFrame | void> {
        if (!this.port.portOpen) {
            throw new Error('Connection not initialized');
        }

        const commandId = ZDO_REQ_CLUSTER_ID_TO_ZBOSS_COMMAND_ID[clusterId];
        assert(commandId !== undefined, `ZDO cluster ID '${clusterId}' not supported.`);

        const cmdLog = `${Zdo.ClusterId[clusterId]}(cmd: ${commandId})`;
        logger.debug(() => `===> ZDO ${cmdLog}: ${payload.toString('hex')}`, NS);

        return await this.queue.execute<ZBOSSFrame | void>(async () => {
            const buf = Buffer.alloc(5 + payload.length);
            buf.writeInt8(0, 0);
            buf.writeInt8(FrameType.REQUEST, 1);
            buf.writeUInt16LE(commandId, 2);
            buf.writeUInt8(this.tsn, 4);
            buf.set(payload, 5);

            let waiter;

            if (!disableResponse) {
                waiter = this.waitFor(commandId, this.tsn, 10000);
            }

            this.tsn = (this.tsn + 1) & 255;

            try {
                await this.port.sendBuffer(buf);

                if (waiter) {
                    return await waiter.start().promise;
                }
            } catch (error) {
                if (waiter) {
                    this.waitress.remove(waiter.ID);
                }

                logger.debug(`=x=> Failed to send ${cmdLog}: ${(error as Error).stack}`, NS);
                throw new Error(`Failed to send ${cmdLog}.`);
            }
        });
    }

    public async ieeeByNwk(nwk: number): Promise<string> {
        return (await this.execCommand(CommandId.NWK_GET_IEEE_BY_SHORT, {nwk: nwk})).payload.ieee;
    }
}

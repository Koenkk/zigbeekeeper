import {ClusterId as ZdoClusterId} from '../../../zspec/zdo';
import {Type as CommandType} from '../unpi/constants';
import ParameterType from './parameterType';

export type MtType = number | number[] | string | Buffer | {[s: string]: number | string}[];

export interface MtParameter {
    name: string;
    parameterType: ParameterType;
}

interface MtCmdBase {
    name: string;
    ID: number;
    type: number;
    request: MtParameter[];
    response: MtParameter[];
    zdo: {cluterId: ZdoClusterId; convert: (buffer: Buffer) => Buffer};
}

interface MtCmdAreq extends Omit<MtCmdBase, 'response' | 'zdo'> {
    type: CommandType.AREQ;
}

interface MtCmdSreq extends Omit<MtCmdBase, 'zdo'> {
    type: CommandType.SREQ;
}

export interface MtCmdAreqZdo extends Omit<MtCmdBase, 'request' | 'response'> {
    type: CommandType.AREQ;
}

export type MtCmd = MtCmdAreq | MtCmdSreq | MtCmdAreqZdo;

export type ZpiObjectPayload = {[s: string]: any};

export interface BuffaloZnpOptions {
    length?: number;
    startIndex?: number;
}

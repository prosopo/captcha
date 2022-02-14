import { AnyJson } from '@polkadot/types/types/codec';
import { Registry } from 'redspot/types/provider';
export declare type DecodeFunction = (registry: Registry, data: Uint8Array) => AnyJson;
export declare const buildDecodeVector: (typeName: string) => DecodeFunction;

import {decodeU8a, decodeU8aVec, typeToConstructor} from "@polkadot/types-codec/utils";
import { AnyJson } from "@polkadot/types/types/codec";
import { Registry } from "redspot/types/provider";
// const {encodeAddress} = require('@polkadot/util-crypto');

export type DecodeFunction = (registry: Registry, data: Uint8Array) => AnyJson;

export const buildDecodeVector = (typeName: string): DecodeFunction => {
    return (registry: Registry, data: Uint8Array): AnyJson => {
        const vecType = typeToConstructor(registry, typeName);
        const decoded = decodeU8aVec(registry, data, 0, vecType, 1);
        
        return decoded[0].flatMap(value => value.toHuman());
    }
}

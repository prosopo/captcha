import {Captcha, Dataset, DatasetSchema} from "./types/captcha";
import {ERRORS} from './errors'

const {u8aConcat, u8aToHex} = require('@polkadot/util');
const {blake2AsU8a} = require('@polkadot/util-crypto');

function hash(data: string): Uint8Array {
    return blake2AsU8a(data);
}

export function hashDataset(captchas: Captcha[]): Uint8Array {
    try {
        // each captcha is a leaf in a very wide merkle tree
        const hashes = captchas.map(captcha => hash(captcha['id'] + captcha['solution'] + captcha['salt']));
        return hash(u8aConcat(hashes))
    } catch (err) {
        throw(`${ERRORS.DATASET.HASH_ERROR.message}:\n${err}`);
    }

}


export function parseCaptchaDataset(captchaJSON: JSON): Dataset {
    try {
        return DatasetSchema.parse(captchaJSON)
    } catch (err) {
        throw(`${ERRORS.DATASET.PARSE_ERROR.message}:\n${err}`);
    }
}


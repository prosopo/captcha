import {ERRORS} from './errors'

const {decodeAddress, encodeAddress} = require('@polkadot/keyring');
const {hexToU8a, isHex} = require('@polkadot/util');
const fs = require('fs');

export function encodeStringAddress(address: string) {
    if (address.startsWith("0x")) {
        address = address.slice(2,)
    }
    try {
        return encodeAddress(
            isHex(address)
                ? hexToU8a(address)
                : decodeAddress(address)
        );
    } catch (error) {
        throw new Error(`${ERRORS.CONTRACT.INVALID_ADDRESS}:${error}\n${address}`);
    }
};

export function loadJSONFile(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath));
    } catch (err) {
        throw new Error(`${ERRORS.GENERAL.JSON_LOAD_FAILED}:${err}`);
    }
}
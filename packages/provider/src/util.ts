const {decodeAddress, encodeAddress} = require('@polkadot/keyring');
const {hexToU8a, isHex} = require('@polkadot/util');
const fs = require('fs');

export function encodeStringAddress(address: string) {
    if (address.startsWith("0x")) {
        address = address.slice(2,)
    }
    try {
        let encoded = encodeAddress(
            isHex(address)
                ? hexToU8a(address)
                : decodeAddress(address)
        );

        return encoded;
    } catch (error) {
        throw(`Failed to encode invalid address::${error}::${address}`);
    }
};

export function loadJSONFile(filePath) {
    return JSON.parse(fs.readFileSync(filePath));
}
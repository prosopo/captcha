import { isAddress } from '@polkadot/util-crypto'
import { decodeAddress, encodeAddress } from '@polkadot/keyring'
import { hexToU8a, isHex, u8aToHex } from '@polkadot/util'

const ss58Format = 42
const arg = process.argv.slice(2)[0].trim()

let bytes: Uint8Array | undefined = undefined;
let hex: string | undefined = undefined;
let ss58: string | undefined = undefined;

if(isAddress(arg)) {
    bytes = decodeAddress(arg)
} else if(isHex(arg)) {
    bytes = hexToU8a(arg)
} else { // must be byte array in json format
    bytes = new Uint8Array(JSON.parse(arg))
}

hex = hex || u8aToHex(bytes)
ss58 = ss58 || encodeAddress(hex, ss58Format)

console.log(`bytes: [${bytes}]`)
console.log(`hex: ${hex}`)
console.log(`ss58: ${ss58}`)
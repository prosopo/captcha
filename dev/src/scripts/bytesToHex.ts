import { u8aToHex } from '@polkadot/util'

const arg = process.argv.slice(2)[0].trim()
console.log(`arg          : ${arg}`)

const byteArray = arg.split(',').map((x) => parseInt(x));

const hex = Array.from(byteArray, function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
}).join('')

console.log(hex);
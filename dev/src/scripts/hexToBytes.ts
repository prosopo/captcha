import { hexToU8a } from '@polkadot/util'

const arg = process.argv.slice(2)[0].trim()
console.log(`arg          : ${arg}`)

console.log(hexToU8a(arg))
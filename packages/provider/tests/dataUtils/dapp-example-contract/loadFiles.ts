import fse from 'fs-extra'
import { hexToU8a, isWasm } from '@polkadot/util'
import { Abi } from '@polkadot/api-contract'

const path = require('node:path')

// TODO use the .contract file instead of the .json and .wasm files. Polkadot-JS apps is also erroring out when using
//   the .wasm and .json files. The .contract file works but I don't know why.

export async function DappAbiJSON(): Promise<Abi> {
    try {
        const json = JSON.parse(await fse.readFile(path.resolve(__dirname, 'dapp.contract'), { encoding: 'utf8' }))
        return new Abi(json)
    } catch (e) {
        console.error(`Error loading dapp.json: ${e}`)
        process.exit(1)
    }
}

export async function DappWasm(): Promise<Uint8Array> {
    const wasm: `0x${string}` = `0x${fse.readFileSync(path.resolve(__dirname, './dapp.wasm')).toString('hex')}`
    const wasmBytes = hexToU8a(wasm)
    if (isWasm(wasmBytes)) {
        return wasmBytes
    } else {
        console.error(`Error loading dapp.wasm: ${wasm.slice(0, 10)}...`)
        process.exit(1)
    }
}

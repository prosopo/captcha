import fse from 'fs-extra'
import { hexToU8a, isWasm } from '@polkadot/util'
import { Abi } from '@polkadot/api-contract'

const path = require('node:path')

export async function DappAbiJSON(): Promise<Abi> {
    try {
        return new Abi(JSON.parse(await fse.readFile(path.resolve(__dirname, 'dapp.json'), { encoding: 'utf8' })))
    } catch (e) {
        console.error(`Error loading dapp.json: ${e}`)
        process.exit(1)
    }
}

export async function DappWasm(): Promise<Uint8Array> {
    const wasm = fse.readFileSync(path.resolve(__dirname, './dapp.wasm')).toString('hex')
    const wasmBytes = hexToU8a(wasm)
    if (isWasm(wasmBytes)) {
        return wasmBytes
    } else {
        console.error(`Error loading dapp.wasm: ${wasm.slice(0, 10)}...`)
        process.exit(1)
    }
}

// TODO use the .contract file instead of the .json and .wasm files. Polkadot-JS apps is also erroring out when using
//   the .wasm and .json files. The .contract file works but I don't know why.

import { Abi } from '@polkadot/api-contract'
import fse from 'fs-extra'
import path from 'node:path'
import { hexToU8a, isWasm } from '@polkadot/util'

export async function AbiJSON(filePath: string): Promise<Abi> {
    try {
        const json = JSON.parse(
            await fse.readFile(path.resolve(__dirname, filePath), {
                encoding: 'utf8',
            })
        )
        return new Abi(json)
    } catch (e) {
        console.error(`Error loading contract json: ${e}`)
        process.exit(1)
    }
}

export async function Wasm(filePath: string): Promise<Uint8Array> {
    const wasm: `0x${string}` = `0x${fse.readFileSync(path.resolve(__dirname, filePath)).toString('hex')}`
    const wasmBytes = hexToU8a(wasm)
    if (isWasm(wasmBytes)) {
        return wasmBytes
    } else {
        console.error(`Error loading contract wasm: ${wasm.slice(0, 10)}...`)
        process.exit(1)
    }
}

import path from 'node:path'
// Copyright 2021-2023 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { Abi } from '@polkadot/api-contract/Abi'
import { hexToU8a } from '@polkadot/util/hex'
import { isWasm } from '@polkadot/util/is'
import fse from 'fs-extra'

// TODO use the .contract file instead of the .json and .wasm files. Polkadot-JS apps is also erroring out when using
//   the .wasm and .json files. The .contract file works but I don't know why.

export async function DappAbiJSON(): Promise<Abi> {
    try {
        const json = JSON.parse(
            await fse.readFile(path.resolve(__dirname, 'dapp.contract'), {
                encoding: 'utf8',
            })
        )
        return new Abi(json)
    } catch (e) {
        console.error(`Error loading dapp.json: ${e}`)
        process.exit(1)
    }
}

export async function DappWasm(): Promise<Uint8Array> {
    const wasm: `0x${string}` = `0x${fse
        .readFileSync(path.resolve(__dirname, './dapp.wasm'))
        .toString('hex')}`
    const wasmBytes = hexToU8a(wasm)
    if (isWasm(wasmBytes)) {
        return wasmBytes
    }
    console.error(`Error loading dapp.wasm: ${wasm.slice(0, 10)}...`)
    process.exit(1)
}

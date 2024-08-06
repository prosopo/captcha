// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import { blake2AsHex, blake2AsU8a, keccakAsHex, keccakAsU8a } from '@polkadot/util-crypto'
import { decodeAddress, encodeAddress } from '@polkadot/keyring'
import { get } from '@prosopo/util'
import {
    hexToBn,
    hexToString,
    hexToU8a,
    isHex,
    stringToHex,
    stringToU8a,
    u8aToBn,
    u8aToFloat,
    u8aToHex,
    u8aToString,
} from '@polkadot/util'

function main() {
    const fns: {
        // biome-ignore lint/suspicious/noExplicitAny: has to be any type to represent any args
        [key: string]: (...args: any[]) => any
    } = {
        // biome-ignore lint/suspicious/noExplicitAny: has to be any type to represent any args
        arg: (arg: any) => arg,
        isHex,
        hexToString,
        hexToU8a,
        hexToBn,
        stringToHex,
        stringToU8a,
        blake2AsHex,
        blake2AsU8a,
        keccakAsHex,
        keccakAsU8a,
        decodeAddress,
        encodeAddress,
        u8aToHex,
        u8aToBn,
        u8aToFloat,
        u8aToString,
        jsonParse: JSON.parse,
        jsonStringify: JSON.stringify,
    }

    const arg = process.argv.slice(2)[0]

    const max = Object.keys(fns).reduce((max, key) => Math.max(max, key.length), 0)
    for (const fnName in fns) {
        const fn = get(fns, fnName)
        let result = ''
        try {
            result = fn(arg)
        } catch (e) {
            // ignore
        }
        // https://stackoverflow.com/questions/9781218/how-to-change-node-jss-console-font-color
        console.log(`\x1b[40m\x1b[33m${fnName.padEnd(max + 1, ' ')}:\x1b[37m ${result}`)
    }
}

main()

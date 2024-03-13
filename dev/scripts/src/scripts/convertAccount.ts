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
import { at } from '@prosopo/util'
import { decodeAddress, encodeAddress } from '@polkadot/keyring'
import { hexToU8a, isHex, u8aToHex } from '@polkadot/util'
import { isAddress } from '@polkadot/util-crypto'

const ss58Format = 42

const arg = at(process.argv.slice(2), 0).trim()

let bytes: Uint8Array | undefined = undefined
let hex: string | undefined = undefined
let ss58: string | undefined = undefined

if (isAddress(arg)) {
    bytes = decodeAddress(arg)
} else if (isHex(arg)) {
    bytes = hexToU8a(arg)
} else {
    // must be byte array in json format
    bytes = new Uint8Array(JSON.parse(arg))
}

hex = hex || u8aToHex(bytes)
ss58 = ss58 || encodeAddress(hex, ss58Format)

console.log(`bytes: [${bytes}]`)
console.log(`hex: ${hex}`)
console.log(`ss58: ${ss58}`)

// Copyright 2021-2022 Prosopo (UK) Ltd.
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
import { blake2AsHex, isAddress } from '@polkadot/util-crypto'
import { hexToNumber, hexToString, isHex, u8aToHex } from '@polkadot/util'
import { decodeAddress, encodeAddress } from '@polkadot/keyring'

const ss58Format = 42
const arg = process.argv.slice(2)[0].trim()
const argIsHex = isHex(arg)
const argIsAddress = isAddress(arg, false, ss58Format)
console.log(`arg          : ${arg}`)
console.log(`arg length   : ${arg.length}`)
console.log(`argIsAddress : ${argIsAddress}`)
console.log(`argIsHex     : ${argIsHex}`)

if (argIsAddress) {
    try {
        const encodedAddress = encodeAddress(decodeAddress(arg, false, ss58Format), ss58Format)
        const decodedAddress = decodeAddress(encodedAddress, false, ss58Format)
        if (encodedAddress === arg) {
            const hexAddress = u8aToHex(decodedAddress)
            console.log(`Hex address ${hexAddress}`)
            console.log(`Address bytes ${decodedAddress}`)
        } else {
            console.log(`Encoded address ${encodedAddress}`)

            console.log(`Address as hex ${u8aToHex(decodeAddress(encodedAddress))}`)
        }
    } catch (e) {
        console.log(`Address encoding/decoding failed: ${e}`)
    }
}
if (argIsHex) {
    console.log(`Decoding hex ${arg} to string`)
    console.log(hexToString(arg))
    console.log(`Decoding hex ${arg} to number`)
    console.log(hexToNumber(arg))
} else {
    console.log(`Hashing string ${arg} using blake2AsHex`)
    console.log(blake2AsHex(arg))
}

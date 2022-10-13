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
import {blake2AsHex, decodeAddress, encodeAddress, isAddress} from '@polkadot/util-crypto'
import {hexToString, isHex, u8aToHex} from '@polkadot/util'

const ss58Format = 42 
const bitLength = 128 
const arg = process.argv.slice(2)[0].trim()
const argIsHex = isHex(arg, bitLength)
const argIsAddress = isAddress(arg, false, ss58Format)
// console.log(`arg is: ${arg}`)
// console.log(`argIsAddress of bitLength ${bitLength} : ${argIsAddress}`)
// console.log(`argIsHex of bitLength ${bitLength}     : ${argIsHex}`)

if (argIsAddress) {
    const encodedAddress = encodeAddress(decodeAddress(arg, false, ss58Format), ss58Format);

    if (encodedAddress === arg) {
        const hexAddress = u8aToHex(decodeAddress(encodedAddress, false, ss58Format))
        console.log(`Hex address ${hexAddress}`)
    } else {
        console.log(`Encoded address ${encodedAddress}`)
    }

} else if (argIsHex) {
    console.log(`Decoding hex ${arg} to string`)
    console.log(hexToString(arg))
} else {
    console.log(`Encoding string ${arg} to hex`)
    console.log(blake2AsHex(arg))
}


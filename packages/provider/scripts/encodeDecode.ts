// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of provider <https://github.com/prosopo-io/provider>.
//
// provider is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// provider is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with provider.  If not, see <http://www.gnu.org/licenses/>.
import {blake2AsHex, decodeAddress, encodeAddress, isAddress} from '@polkadot/util-crypto'
import {hexToString, isHex, stringToHex, u8aToHex} from '@polkadot/util'

const ss58Format = 42 // TODO get this number from rpc
const bitLength = 128 // TODO get this number from rpc
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


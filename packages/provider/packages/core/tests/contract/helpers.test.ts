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
import { encodeStringArgs, unwrap } from '@prosopo/contract'
import { TypeDefInfo } from '@polkadot/types-create'
import { AbiMessage, DecodedMessage } from '@polkadot/api-contract/types'
import { ContractSelector } from '@polkadot/types/interfaces'
import { hexToU8a } from '@polkadot/util'

const chai = require('chai')
const expect = chai.expect
describe('CONTRACT HELPERS', () => {
    it('Unwrap function properly unwraps JSON', () => {
        const data = { Ok: { some: { other: 'data' } } }
        expect(unwrap(data)).to.deep.equal({ some: { other: 'data' } })
    })

    it('Properly encodes `Hash` arguments when passed unhashed', () => {
        const args = ['https://localhost:8282']
        const methodObj = {
            args: [
                { type: { type: 'Hash', info: TypeDefInfo.UInt }, name: '' }
            ],
            docs: [],
            fromU8a: function (): DecodedMessage { return {} as DecodedMessage },
            identifier: '',
            index: 0,
            method: '',
            selector: hexToU8a('0x42b45efa') as ContractSelector,
            toU8a: function (): AbiMessage { return {} as AbiMessage }
        }
        // @ts-ignore
        expect(encodeStringArgs(methodObj, args)).to.deep.equal([
            new Uint8Array([
                9, 253, 81, 160, 217, 224, 208, 123,
                233, 170, 171, 6, 67, 225, 21, 44,
                34, 205, 17, 217, 209, 40, 35, 85,
                82, 212, 118, 37, 107, 115, 81, 222
            ])
        ])
    })
})

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
import { AbiMessage, DecodedMessage } from '@polkadot/api-contract/types'
import { TypeDefInfo } from '@polkadot/types-create'
import { ContractSelector } from '@polkadot/types/interfaces'
import { hexToU8a } from '@polkadot/util'
import { encodeStringArgs, unwrap } from '@prosopo/contract'
import chai from 'chai'

const expect = chai.expect

describe('CONTRACT HELPERS', () => {
    it('Unwrap function properly unwraps JSON', () => {
        const data = { Ok: { some: { other: 'data' } } }

        expect(unwrap(data)).to.deep.equal({ some: { other: 'data' } })
    })

    it('Properly encodes `Hash` arguments when passed unhashed', () => {
        const args = ['https://localhost:8282']
        const methodObj = {
            args: [{ type: { type: 'Hash', info: TypeDefInfo.UInt }, name: '' }],
            docs: [],
            fromU8a: function (): DecodedMessage {
                return {} as DecodedMessage
            },
            identifier: '',
            index: 0,
            method: '',
            selector: hexToU8a('0x42b45efa') as ContractSelector,
            toU8a: function (): AbiMessage {
                return {} as AbiMessage
            },
        }

        // @ts-ignore
        expect(encodeStringArgs(methodObj, args)).to.deep.equal([
            '0x0000000000000000000068747470733a2f2f6c6f63616c686f73743a38323832',
        ])
    })
})

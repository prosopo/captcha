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
import { encodeStringAddress, shuffleArray } from '../src/util'
import { expect } from 'chai'
import { hexHash } from '@prosopo/common'

describe('UTIL FUNCTIONS', () => {
    it('does not modify an already encoded address', () => {
        expect(encodeStringAddress('5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL')).to.equal(
            '5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL'
        )
    })
    it('fails on an invalid address', () => {
        expect(function () {
            encodeStringAddress('xx')
        }).to.throw()
    })
    it('correctly encodes a hex string address', () => {
        expect(encodeStringAddress('0x1cbd2d43530a44705ad088af313e18f80b53ef16b36177cd4b77b846f2a5f07c')).to.equal(
            '5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL'
        )
    })
    it('shuffle function shuffles array', () => {
        expect(shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9])).to.not.deep.equal([1, 2, 3, 4, 5, 6, 7, 8, 9])
    })
    it('correctly hex hashes a string', () => {
        expect(hexHash('https://localhost:9229')).to.equal(
            '0x09fd51a0d9e0d07be9aaab0643e1152c22cd11d9d128235552d476256b7351de'
        )
    })
})

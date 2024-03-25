import { rng, seedLodash } from '@prosopo/util/lodash'
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
import { describe, expect, test } from 'vitest'

describe('rng', () => {
    test('generates random numbers using a seed', () => {
        const seed = 0
        const rand = rng(seed)
        const expected = [-1681090547, 408334984, 788430095, 3233831872, 963300000, -299378919, 97582850]
        for (let i = 0; i < expected.length; i++) {
            expect(rand.int()).to.equal(expected[i])
        }
    })
})

describe('seeded_lodash', () => {
    test('shuffles an array using a seed', () => {
        let array = [1, 2, 3, 4, 5]
        const seed = 0
        const _ = seedLodash(seed)
        array = _.shuffle(array)
        expect(array).to.deep.equal([4, 2, 1, 3, 5])
        array = _.shuffle(array)
        expect(array).to.deep.equal([3, 4, 1, 5, 2])
        array = _.shuffle(array)
        expect(array).to.deep.equal([3, 4, 5, 2, 1])
    })
})

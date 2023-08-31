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
import { describe, expect, test } from 'vitest'
import { permutations, rng, seedLodash } from '../src/util'

describe('util', () => {
    describe('permutations', () => {
        test('handles empty array', () => {
            expect([...permutations([])]).to.deep.equal([])
        })

        test('handles empty array with empty set', () => {
            expect([...permutations([], { includeEmpty: true })]).to.deep.equal([[]])
        })

        test('permutes correctly using same size bins', () => {
            expect([...permutations([2, 2, 2])]).to.deep.equal([
                [0, 0, 0],
                [0, 0, 1],
                [0, 1, 0],
                [0, 1, 1],
                [1, 0, 0],
                [1, 0, 1],
                [1, 1, 0],
                [1, 1, 1],
            ])
        })

        test('permutes correctly using different size bins', () => {
            expect([...permutations([1, 2, 3])]).to.deep.equal([
                [0, 0, 0],
                [0, 0, 1],
                [0, 0, 2],
                [0, 1, 0],
                [0, 1, 1],
                [0, 1, 2],
            ])
        })
    })

    describe('rng', () => {
        test('generates random numbers using a seed', () => {
            const seed = 0
            const rand = rng(seed)
            const expected = [-1065104217, 665175191, 222529346, 1915458065, -720845602, -50645347, -775619164]
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
            expect(array).to.deep.equal([1, 2, 4, 5, 3])
            array = _.shuffle(array)
            expect(array).to.deep.equal([2, 5, 1, 3, 4])
            array = _.shuffle(array)
            expect(array).to.deep.equal([3, 5, 2, 4, 1])
        })
    })
})

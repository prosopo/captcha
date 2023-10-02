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
import { at, get, permutations, rng, seedLodash } from '../util.js'
import { describe, expect, test } from 'vitest'

describe('util', () => {
    describe('at', () => {
        test('types', () => {
            // check the types are picked up correctly by ts
            const v1: number = at([1, 2, 3], 0)
            const v2: number | undefined = at([1, 2, 3, undefined], 0)
            const v3: string = at('abc', 0)
            const v4: string | undefined = at('abc', 0, { optional: true })
            const v5: number | undefined = at([1, 2, 3], 0, { optional: true })
            const v6: string = at('abc', 0, { optional: false })
            const v7: number = at([1, 2, 3], 0, { optional: false })
        })

        test('throw on empty array', () => {
            expect(() => at([], 0)).to.throw()
        })

        test('throw on index out of bounds high', () => {
            expect(() => at([1, 2, 3], 3, { noWrap: true })).to.throw()
        })

        test('throw on index out of bounds low', () => {
            expect(() => at([1, 2, 3], -1, { noWrap: true })).to.throw()
        })

        test('returns correct value', () => {
            expect(at([1, 2, 3], 0)).to.equal(1)
            expect(at([1, 2, 3], 1)).to.equal(2)
            expect(at([1, 2, 3], 2)).to.equal(3)
        })

        test('wraps index high', () => {
            expect(at([1, 2, 3], 3, { noWrap: false })).to.equal(1)
            expect(at([1, 2, 3], 4, { noWrap: false })).to.equal(2)
            expect(at([1, 2, 3], 5, { noWrap: false })).to.equal(3)
        })

        test('wraps index low', () => {
            expect(at([1, 2, 3], -1, { noWrap: false })).to.equal(3)
            expect(at([1, 2, 3], -2, { noWrap: false })).to.equal(2)
            expect(at([1, 2, 3], -3, { noWrap: false })).to.equal(1)
            expect(at([1, 2, 3], -4, { noWrap: false })).to.equal(3)
            expect(at([1, 2, 3], -5, { noWrap: false })).to.equal(2)
            expect(at([1, 2, 3], -6, { noWrap: false })).to.equal(1)
        })

        test('allow undefined in bounds', () => {
            expect(at([undefined, undefined, undefined], 0, { optional: true })).to.equal(undefined)
            expect(at([undefined, undefined, undefined], 1, { optional: true })).to.equal(undefined)
            expect(at([undefined, undefined, undefined], 2, { optional: true })).to.equal(undefined)
        })

        test('allow undefined out of bounds', () => {
            expect(at([undefined, undefined, undefined], 3, { optional: true, noBoundsCheck: true })).to.equal(
                undefined
            )
            expect(at([undefined, undefined, undefined], -1, { optional: true, noBoundsCheck: true })).to.equal(
                undefined
            )
        })
    })

    describe('get', () => {
        test('types', () => {
            // check the types are picked up correctly by ts
            const v1: number = get({ a: 1 }, 'a')
            const v2: number | undefined = get({ a: 1 }, 'a', false)
            const v3: number = get({ a: 1 }, 'a', true)
            const v4: number | undefined = get({ a: 1, b: undefined }, 'a')
            const v5: number | undefined = get({ a: 1, b: undefined }, 'a', false)
            // cast from any
            const v6: number = get(JSON.parse('{"a": 1}') as any, 'a')
            // cast from unknown
            const v7: number = get(JSON.parse('{"a": 1}') as unknown, 'a')
        })

        test('throw on undefined field string', () => {
            expect(() => get({ a: 1 }, 'b')).to.throw()
        })

        test('throw on undefined field number', () => {
            expect(() => get({ a: 1 }, 1)).to.throw()
        })

        test('get correct field string', () => {
            expect(get({ a: 1 }, 'a')).to.equal(1)
        })

        test('get correct field number', () => {
            expect(get({ 1: 1 }, 1)).to.equal(1)
        })
    })

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
})

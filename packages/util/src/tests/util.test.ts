import { describe, expect, test } from 'vitest'
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
import { at, get, merge, permutations } from '../util.js'

describe('util', () => {
    describe('merge', () => {
        // factors:
        // - types
        //     - primitive
        //     - array
        //     - object
        // - nesting
        //     - 0 levels
        //     - 1 levels
        //     - 2 levels
        // - array strat
        //     - 'update'
        //     - 'replace'
        // - merge nested els in array
        //     - true
        //     - false
        // - merge nested fields in obj
        //     - true
        //     - false

        test('array in array', () => {
            expect(
                merge(
                    [
                        [0, 1, 2],
                        [3, 4, 5],
                    ],
                    [
                        [6, 7],
                        [8, 9],
                    ]
                )
            ).to.deep.equal([
                [6, 7, 2],
                [8, 9, 5],
            ])
        })
        test('array in array atomic', () => {
            expect(
                merge(
                    [
                        [0, 1, 2],
                        [3, 4, 5],
                    ],
                    [
                        [6, 7],
                        [8, 9],
                    ],
                    { atomicArrays: true }
                )
            ).to.deep.equal([
                [6, 7],
                [8, 9],
            ])
        })
        test('array in object', () => {
            expect(merge({ a: [0, 1, 2] }, { a: [3, 4] })).to.deep.equal({
                a: [3, 4, 2],
            })
        })
        test('array in object atomic', () => {
            expect(
                merge({ a: [0, 1, 2] }, { a: [3, 4] }, { atomicArrays: true })
            ).to.deep.equal({ a: [3, 4] })
        })
        test('array in object in array', () => {
            expect(
                merge(
                    [{ a: [0, 1, 2] }, { b: [3, 4, 5] }],
                    [{ a: [6, 7] }, { b: [8, 9] }]
                )
            ).to.deep.equal([{ a: [6, 7, 2] }, { b: [8, 9, 5] }])
        })
        test('array in object in array atomic', () => {
            expect(
                merge(
                    [{ a: [0, 1, 2] }, { b: [3, 4, 5] }],
                    [{ a: [6, 7] }, { b: [8, 9] }],
                    { atomicArrays: true }
                )
            ).to.deep.equal([{ a: [6, 7] }, { b: [8, 9] }])
        })

        test('primitive replaces array', () => {
            expect(merge({ a: [1] }, { a: 1 })).to.deep.equal({ a: 1 })
        })
        test('primitive replaces object', () => {
            expect(merge({ a: { b: 1 } }, { a: 1 })).to.deep.equal({ a: 1 })
        })
        test('primitive replaces primitive', () => {
            expect(merge({ a: 1 }, { a: 2 })).to.deep.equal({ a: 2 })
        })
        test('array replaces primitive', () => {
            expect(merge({ a: 1 }, { a: [1] })).to.deep.equal({ a: [1] })
        })
        test('array replaces array', () => {
            expect(merge({ a: [1] }, { a: [2] })).to.deep.equal({ a: [2] })
        })
        test('array replaces object', () => {
            expect(merge({ a: { b: 1 } }, { a: [1] })).to.deep.equal({ a: [1] })
        })
        test('object replaces primitive', () => {
            expect(merge({ a: 1 }, { a: { b: 1 } })).to.deep.equal({
                a: { b: 1 },
            })
        })
        test('object replaces array', () => {
            expect(merge({ a: [1] }, { a: { b: 1 } })).to.deep.equal({
                a: { b: 1 },
            })
        })
        test('object replaces object', () => {
            expect(merge({ a: { b: 1 } }, { a: { c: 1 } })).to.deep.equal({
                a: { b: 1, c: 1 },
            })
        })
    })

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

            const a3: number = at([1, 2, 3], 0)
            const a4: number | undefined = at([1, 2, 3, undefined], 0)
            const a6: number | undefined = at([1, 2, 3], 0, { optional: true })
            const a7: number = at([1, 2, 3], 0, { optional: false })
            const a8: number = at([1, 2, 3], 0, {})
            const a9: number = at([1, 2, 3], 0, { noWrap: true })
            const a5: string = at('abc', 0)
            const a10: string = at('abc', 0, { optional: false })
            const a11: string | undefined = at('abc', 0, { optional: true })
            const a12: undefined = at([undefined, undefined, undefined], 0)
            const a13: undefined = at([undefined, undefined, undefined], 0, {
                optional: true,
            })
            const a14: undefined = at([undefined, undefined, undefined], 0, {
                optional: false,
            })
        })

        test('compatible with string', () => {
            expect(at('abc', 0)).to.equal('a')
            expect(at('abc', 1)).to.equal('b')
            expect(at('abc', 2)).to.equal('c')
            expect(at('abc', 3)).to.equal('a')
            expect(at('abc', 4)).to.equal('b')
            expect(at('abc', 5)).to.equal('c')
            expect(at('abc', -1)).to.equal('c')
            expect(at('abc', -2)).to.equal('b')
            expect(at('abc', -3)).to.equal('a')
            expect(at('abc', -4)).to.equal('c')
            expect(at('abc', -5)).to.equal('b')
            expect(at('abc', -6)).to.equal('a')
        })

        test('empty string', () => {
            expect(() => at('', 0)).to.throw()
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
            expect(
                at([undefined, undefined, undefined], 0, { optional: true })
            ).to.equal(undefined)
            expect(
                at([undefined, undefined, undefined], 1, { optional: true })
            ).to.equal(undefined)
            expect(
                at([undefined, undefined, undefined], 2, { optional: true })
            ).to.equal(undefined)
        })
    })

    describe('get', () => {
        test('types', () => {
            // check the types are picked up correctly by ts
            const v1: number = get({ a: 1 }, 'a')
            const v2: number | undefined = get({ a: 1 }, 'a', false)
            const v3: number = get({ a: 1 }, 'a', true)
            const v4: number | undefined = get({ a: 1, b: undefined }, 'a')
            const v5: number | undefined = get(
                { a: 1, b: undefined },
                'a',
                false
            )
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
            expect([...permutations([], { includeEmpty: true })]).to.deep.equal(
                [[]]
            )
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
})

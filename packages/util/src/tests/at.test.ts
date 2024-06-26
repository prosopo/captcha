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
import { at } from '../at.js'
import { describe, expect, test } from 'vitest'

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
        const a12: never = at([undefined, undefined, undefined], 0)
        const a13: undefined = at([undefined, undefined, undefined], 0, { optional: true })
        const a14: undefined = at([undefined, undefined, undefined], 0, { optional: false })

        const a15: string = at(['a', 'b', 'c'] as readonly string[], 0)

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
        expect(at([undefined, undefined, undefined], 0, { optional: true })).to.equal(undefined)
        expect(at([undefined, undefined, undefined], 1, { optional: true })).to.equal(undefined)
        expect(at([undefined, undefined, undefined], 2, { optional: true })).to.equal(undefined)
    })
})

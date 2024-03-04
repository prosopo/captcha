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
import { merge } from '../merge.js'

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
        expect(merge({ a: [0, 1, 2] }, { a: [3, 4] })).to.deep.equal({ a: [3, 4, 2] })
    })
    test('array in object atomic', () => {
        expect(merge({ a: [0, 1, 2] }, { a: [3, 4] }, { atomicArrays: true })).to.deep.equal({ a: [3, 4] })
    })
    test('array in object in array', () => {
        expect(merge([{ a: [0, 1, 2] }, { b: [3, 4, 5] }], [{ a: [6, 7] }, { b: [8, 9] }])).to.deep.equal([
            { a: [6, 7, 2] },
            { b: [8, 9, 5] },
        ])
    })
    test('array in object in array atomic', () => {
        expect(
            merge([{ a: [0, 1, 2] }, { b: [3, 4, 5] }], [{ a: [6, 7] }, { b: [8, 9] }], { atomicArrays: true })
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
        expect(merge({ a: 1 }, { a: { b: 1 } })).to.deep.equal({ a: { b: 1 } })
    })
    test('object replaces array', () => {
        expect(merge({ a: [1] }, { a: { b: 1 } })).to.deep.equal({ a: { b: 1 } })
    })
    test('object replaces object', () => {
        expect(merge({ a: { b: 1 } }, { a: { c: 1 } })).to.deep.equal({ a: { b: 1, c: 1 } })
    })
})

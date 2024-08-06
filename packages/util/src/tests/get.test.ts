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
import { get } from '../get.js'

describe('get', () => {
    test('types', () => {
        // check the types are picked up correctly by ts
        const v1: number = get({ a: 1 }, 'a')
        const v2: number | undefined = get({ a: 1 }, 'a', false)
        const v3: number = get({ a: 1 }, 'a', true)
        const v4: number | undefined = get({ a: 1, b: undefined }, 'a')
        const v5: number | undefined = get({ a: 1, b: undefined }, 'a', false)
        // cast from any
        // biome-ignore lint/suspicious/noExplicitAny: has to be any
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

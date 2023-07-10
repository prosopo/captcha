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
import { expect } from 'chai'
import UrlConverter from '../../src/node/UrlConverter'
describe('URL converter', () => {
    const urlAsBytes = new Uint8Array([178, 214, 156, 101, 214, 90, 103, 32])
    const url = 'https://www.prosopo.io'
    const converter = new UrlConverter()

    it('encodes lowercase url', () => {
        const bytes = converter.encode(url)
        expect(bytes).to.eql(urlAsBytes)
    })

    it('encodes uppercase url', () => {
        const bytes = converter.encode('https://www.prosopo.io'.toUpperCase())
        expect(bytes).to.eql(urlAsBytes)
    })

    it('encodes mixed case url', () => {
        const bytes = converter.encode('hTTps://wWw.prOSOpO.iO'.toUpperCase())
        expect(bytes).to.eql(urlAsBytes)
    })

    it('encodes empty url', () => {
        const bytes = converter.encode('')
        expect(bytes).to.eql(new Uint8Array([]))
    })

    it('decodes empty bytes', () => {
        const str = converter.decode(new Uint8Array([]))
        expect(str).to.eql('')
    })

    it('decodes non-empty bytes', () => {
        const str = converter.decode(urlAsBytes)
        expect(str).to.eql(url)
    })

    it('has only unique symbols', () => {
        const symbols = converter.getSymbols()
        expect(symbols.length).to.eql(new Set(symbols).size)
    })

    for (let i = 0; i < 10; i++) {
        it(`encodes/decodes random url ${i + 1}`, () => {
            const len = Math.random() * 100 + 1 // url lengths between 1-100
            const symbols = converter.getSymbols()
            const url = Array.from({ length: len }, () => symbols[Math.round(Math.random() * symbols.length)]).join('') // random url chars
            const bytes = converter.encode(url)
            const decodedUrl = converter.decode(bytes)
            expect(decodedUrl).to.eql(url, bytes.toString())
        })
    }
})

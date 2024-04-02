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
import { describe, it, expect, test } from 'vitest'
import config from '../index.js'

describe('env', () => {
    it('loads env files with extends', () => {
        expect(config({
            path: __dirname + '/extends/root.env',
            debug: true

        })).to.deep.equal({
            'root': 'true',
            'root.0': 'true',
            'root.1': 'true',
            'root.2': 'true',
            'root.0.0': 'true',
            'root.0.1': 'true',
        })
    })

    it('errors on circular extends', () => {
        expect(() => config({
            path: __dirname + '/circular/env'
        })).to.throw()
    })

    it('overrides extended values', () => {
        expect(config({
            path: __dirname + '/override/a.env',
        })).to.deep.equal({
            A: 'true',
            B: 'true',
            C: 'false',
            D: 'false',
            E: 'true'
        })
    })

    it('loads relative', () => {
        expect(config({
            path: './src/tests/override/c.env'
        })).to.deep.equal({
            C: 'true',
            D: 'true',
            E: 'true'
        })
    })

    it('errors on missing file', () => {
        expect(() => config({
            path: './src/tests/missing.env'
        })).to.throw()
    })
})

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
import { describe, expect, test, it } from 'vitest'
import { loadConfig } from '../index.js'
import { ConfigSchema } from './config.js'

describe('config', () => {
    
    it('should load config from env', async () => {
        expect(await loadConfig({ path: `${__dirname}/example.config.env`, schema: ConfigSchema })).to.deep.equal({
            a: true,
            b: 1,
            c: 'hello',
        })
    })

    // it('should load config from json', async () => {
    //     expect(await loadConfig({ path: `${__dirname}/example.config.json`, schema: ConfigSchema })).to.deep.equal({
    //         a: true,
    //         b: 1,
    //         c: 'hello',
    //     })
    // })

    // it('should load config from js', async () => {
    //     expect(await loadConfig({ path: `${__dirname}/example.config.js`, schema: ConfigSchema })).to.deep.equal({
    //         a: true,
    //         b: 1,
    //         c: 'hello',
    //     })
    // })

    // it('should load config from ts', async () => {
    //     expect(await loadConfig({ path: `${__dirname}/example.config.ts`, schema: ConfigSchema })).to.deep.equal({
    //         a: true,
    //         b: 1,
    //         c: 'hello',
    //     })
    // })

    it('should load into process.env', async () => {
        const config = await loadConfig({ path: `${__dirname}/example.config.env`, schema: ConfigSchema, populateProcessEnv: true})
        for(const key of Object.keys(config)) {
            expect(process.env[key]).to.equal(JSON.stringify(config[key as keyof typeof config]))
        }
    })
})

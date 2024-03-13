import { ProsopoEnvError, hexHash } from '@prosopo/common'
import { getTestConfig } from '@prosopo/config'
import { getPairAsync } from '@prosopo/contract'
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
import { MockEnvironment } from '@prosopo/env'
import { ScheduledTaskNames, ScheduledTaskStatus } from '@prosopo/types'
import { sleep } from '@prosopo/util'
import { describe, expect, test } from 'vitest'
import { checkIfTaskIsRunning, encodeStringAddress, shuffleArray } from '../util.js'

describe('UTIL FUNCTIONS', async () => {
    test('does not modify an already encoded address', () => {
        expect(encodeStringAddress('5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL')).to.equal(
            '5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL'
        )
    })
    test('fails on an invalid address', () => {
        expect(() => {
            encodeStringAddress('xx')
        }).to.throw()
    })
    test('correctly encodes a hex string address', () => {
        expect(encodeStringAddress('0x1cbd2d43530a44705ad088af313e18f80b53ef16b36177cd4b77b846f2a5f07c')).to.equal(
            '5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL'
        )
    })
    test('shuffle function shuffles array', () => {
        expect(shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9])).to.not.deep.equal([1, 2, 3, 4, 5, 6, 7, 8, 9])
    })
    test('correctly hex hashes a string', () => {
        expect(hexHash('https://localhost:9229')).to.equal(
            '0x775ce25b075f68de0db7d560a0b51c33bf9b7d33d23507d55d932ab9b3e75edd'
        )
    })
    test('correctly determines if a task is still running', async () => {
        const config = getTestConfig()
        const network = config.networks[config.defaultNetwork]
        const alicePair = await getPairAsync(network, '//Alice')
        const env = new MockEnvironment(getTestConfig(), alicePair)
        try {
            await env.isReady()
        } catch (e) {
            throw new ProsopoEnvError(e as Error)
        }
        // insert a task into the database
        await env
            .getDb()
            .storeScheduledTaskStatus('0x01', ScheduledTaskNames.BatchCommitment, ScheduledTaskStatus.Running)

        let result = await checkIfTaskIsRunning(ScheduledTaskNames.BatchCommitment, env.getDb())
        expect(result).to.equal(true)
        await env
            .getDb()
            .storeScheduledTaskStatus('0x01', ScheduledTaskNames.BatchCommitment, ScheduledTaskStatus.Completed)
        await sleep(1000)
        result = await checkIfTaskIsRunning(ScheduledTaskNames.BatchCommitment, env.getDb())
        expect(result).to.equal(false)
        await env.getDb().close()
    })
})

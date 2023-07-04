// Copyright 2021-2022 Prosopo (UK) Ltd.
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
import { KeypairType } from '@polkadot/util-crypto/types'
import { MockEnvironment } from '@prosopo/env'
import { ProsopoConfigSchema } from '@prosopo/types'
import { ProsopoEnvError, getPair, hexHash } from '@prosopo/common'
import { ScheduledTaskNames, ScheduledTaskStatus } from '@prosopo/types'
import { checkIfTaskIsRunning, encodeStringAddress, shuffleArray } from '../src/util'
import { expect } from 'chai'

describe('UTIL FUNCTIONS', async () => {
    let env: MockEnvironment
    let pairType: KeypairType
    let ss58Format: number

    it('does not modify an already encoded address', () => {
        expect(encodeStringAddress('5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL')).to.equal(
            '5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL'
        )
    })
    it('fails on an invalid address', () => {
        expect(function () {
            encodeStringAddress('xx')
        }).to.throw()
    })
    it('correctly encodes a hex string address', () => {
        expect(encodeStringAddress('0x1cbd2d43530a44705ad088af313e18f80b53ef16b36177cd4b77b846f2a5f07c')).to.equal(
            '5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL'
        )
    })
    it('shuffle function shuffles array', () => {
        expect(shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9])).to.not.deep.equal([1, 2, 3, 4, 5, 6, 7, 8, 9])
    })
    it('correctly hex hashes a string', () => {
        expect(hexHash('https://localhost:9229')).to.equal(
            '0x775ce25b075f68de0db7d560a0b51c33bf9b7d33d23507d55d932ab9b3e75edd'
        )
    })
    it('correctly determines if a task is still running', async () => {
        ss58Format = 42
        pairType = 'sr25519' as KeypairType
        const alicePair = await getPair(pairType, ss58Format, '//Alice')
        const config = ProsopoConfigSchema.parse(JSON.parse(process.env.config ? process.env.config : '{}'))
        env = new MockEnvironment(alicePair, config)
        try {
            await env.isReady()
        } catch (e) {
            throw new ProsopoEnvError(e, 'isReady')
        }
        // insert a task into the database
        env.db?.storeScheduledTaskStatus('0x01', ScheduledTaskNames.BatchCommitment, ScheduledTaskStatus.Running)
        if (!env.db) {
            throw new Error('Database not initialized')
        }
        checkIfTaskIsRunning(ScheduledTaskNames.BatchCommitment, env.db).then((result) => {
            expect(result).to.equal(true)
        })
        env.db?.storeScheduledTaskStatus('0x01', ScheduledTaskNames.BatchCommitment, ScheduledTaskStatus.Completed)
        checkIfTaskIsRunning(ScheduledTaskNames.BatchCommitment, env.db).then((result) => {
            expect(result).to.equal(false)
        })
    })
})

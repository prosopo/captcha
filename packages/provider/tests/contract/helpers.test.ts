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
import { AbiMessage, DecodedMessage } from '@polkadot/api-contract/types'
import { ContractSelector } from '@polkadot/types/interfaces'
import { KeypairType } from '@polkadot/util-crypto/types'
import { LogLevel, ProsopoEnvError, logger } from '@prosopo/common'
import { MockEnvironment } from '@prosopo/env'
import { ProsopoConfigSchema } from '@prosopo/types'
import { TypeDefInfo } from '@polkadot/types-create'
import { describe } from 'mocha'
import { encodeStringArgs } from '@prosopo/contract'
import { getPair } from '@prosopo/common'
import { hexToU8a } from '@polkadot/util'
import chai from 'chai'

const expect = chai.expect

describe('CONTRACT HELPERS', function () {
    const log = logger(LogLevel.Debug, 'TEST')
    let env: MockEnvironment
    let pairType: KeypairType
    let ss58Format: number

    beforeEach(async function () {
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
    })

    afterEach(async (): Promise<void> => {
        console.log('in after')
        await env.db?.close()
    })

    it('Properly encodes `Hash` arguments when passed unhashed', async function (done) {
        try {
            log.info('env ready')
            const args = ['https://localhost:8282']
            const methodObj = {
                args: [{ type: { type: 'Hash', info: TypeDefInfo.UInt }, name: '' }],
                docs: [],
                fromU8a: function (): DecodedMessage {
                    return {} as DecodedMessage
                },
                identifier: '',
                index: 0,
                method: '',
                path: [''],
                selector: hexToU8a('0x42b45efa') as ContractSelector,
                toU8a: function (): any {
                    return {} as AbiMessage
                },
            }
            expect(encodeStringArgs(env.contractInterface.abi, methodObj, args)[0].toString()).to.equal(
                hexToU8a('0x0000000000000000000068747470733a2f2f6c6f63616c686f73743a38323832').toString()
            )
            log.info('end of test')
            done()
        } catch (e) {
            //throw new Error(e)
            done(e)
        }
    })
})

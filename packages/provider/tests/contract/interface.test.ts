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
import { MockEnvironment } from '../mocks/mockenv'
import { before } from 'mocha'
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { getPair } from '../../src/index'
import { KeypairType } from '@polkadot/util-crypto/types'
import { getSs58Format } from '../../src/cli/util'

chai.should()
chai.use(chaiAsPromised)
const expect = chai.expect

describe('CONTRACT WRAPPER', () => {
    let contractApi

    before(async () => {
        // Register the dapp
        const ss58Format = getSs58Format()
        const pair = await getPair(
            (process.env.PAIR_TYPE as KeypairType) || ('sr25519' as KeypairType),
            ss58Format,
            undefined,
            undefined,
            undefined,
            '//Alice'
        )
        const mockEnv = new MockEnvironment(pair)

        await mockEnv.isReady()
        contractApi = mockEnv.contractInterface
    })

    //TODO fix this test when type api is stable
    //             return this.abi.registry.createType('ContractLayoutStructField ', storageEntry)

    // it.only('Gets the storage key from the ABI', async () => {
    //     const accounts = await contractApi.getStorageEntry('provider_accounts')
    //
    //     expect(accounts.layout.asCell.key.toString()).to.equal(
    //         '0x0100000000000000000000000000000000000000000000000000000000000000'
    //     )
    // })
})

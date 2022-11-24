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

const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')

chai.should()
chai.use(chaiAsPromised)
const expect = chai.expect

describe('CONTRACT WRAPPER', () => {
    let contractApi

    before(async () => {
        // Register the dapp
        const mockEnv = new MockEnvironment()

        await mockEnv.isReady()
        contractApi = mockEnv.contractInterface
    })

    it('Gets the contract method from the ABI when method name is valid', () => {
        expect(function () {
            contractApi.getContractMethod('dappRegister')
        }).to.not.throw()
    })

    it('Throws an error when method name is invalid', () => {
        expect(function () {
            contractApi.getContractMethod('methodThatDoesntExist')
        }).to.throw(/Invalid contract method/)
    })

    it('Gets the storage key from the ABI', async () => {
        const accounts = await contractApi.getStorageKey('provider_accounts')

        expect(accounts).to.equal('0x0100000000000000000000000000000000000000000000000000000000000000')
    })
})

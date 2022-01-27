// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of provider <https://github.com/prosopo-io/provider>.
//
// provider is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// provider is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with provider.  If not, see <http://www.gnu.org/licenses/>.
import { MockEnvironment } from '../mocks/mockenv'
import { ProsopoContractApi } from '../../src/contract/interface'

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
        await mockEnv.changeSigner('//Alice')
        contractApi = new ProsopoContractApi(mockEnv)
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

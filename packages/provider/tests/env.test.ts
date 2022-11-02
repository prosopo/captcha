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

import { Environment } from '../src/env'
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'

chai.should()
chai.use(chaiAsPromised)
const expect = chai.expect

describe('ENV TESTS', () => {
    it('Initiliases an environment', () => {
        const mnemonic = 'unaware pulp tuna oyster tortoise judge ordinary doll maid whisper cry cat'
        const env = new Environment(mnemonic)
        expect(env.mnemonic).to.equal(mnemonic)
        expect(env.config).to.not.be.null
        expect(env.defaultEnvironment).to.be.a.string
        expect(env.contractAddress).to.be.a.string
        expect(env.contractName).to.be.a.string
        expect(env.db).to.be.undefined
        expect(env.contractInterface).to.be.undefined
        expect(env.network).to.be.undefined
    })
    // it('Initiliases an environment and waits till it is ready', async () => {
    //     const mnemonic = "unaware pulp tuna oyster tortoise judge ordinary doll maid whisper cry cat"
    //     const env = new Environment(mnemonic)
    //     await env.isReady();
    //     expect(env.db).to.be.an('object')
    //     expect(env.network).to.be.an('object')
    //     expect(env.contractInterface).to.be.an.instanceof(ProsopoContractApi)
    // }
    // )
})

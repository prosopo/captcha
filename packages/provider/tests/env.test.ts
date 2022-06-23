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

import {Environment} from "../src/env";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {ProsopoContractApi} from '@prosopo/contract';

chai.should();
chai.use(chaiAsPromised);
const expect = chai.expect;

describe('ENV TESTS', () => {

  it('Initiliases an environment', () => {
      const mnemonic = "unaware pulp tuna oyster tortoise judge ordinary doll maid whisper cry cat"
      const env = new Environment(mnemonic)
      expect(env.mnemonic).to.equal(mnemonic)
      expect(env.config).to.not.be.null
      expect(env.defaultEnvironment).to.be.a.string
      expect(env.contractAddress).to.be.a.string
      expect(env.contractName).to.be.a.string
      expect(env.db).to.be.undefined
      expect(env.contractInterface).to.be.undefined
      expect(env.network).to.be.undefined
    }
  )
  it('Initiliases an environment and waits till it is ready', async () => {
      const mnemonic = "unaware pulp tuna oyster tortoise judge ordinary doll maid whisper cry cat"
      const env = new Environment(mnemonic)
      await env.isReady();
      expect(env.db).to.be.an('object')
      expect(env.network).to.be.an('object')
      expect(env.contractInterface).to.be.an.instanceof(ProsopoContractApi)
    }
  )
})

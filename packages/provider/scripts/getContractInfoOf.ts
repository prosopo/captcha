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
import {ApiPromise, WsProvider} from "@polkadot/api";

const providers = {
  'local': {'endpoint': 'ws://substrate-node:9944'},
  //'polkadot': {'endpoint': 'wss://rpc.polkadot.io'}
}

async function run() {
  // Construct
  for (let provider in providers) {
    const wsProvider = new WsProvider(providers[provider].endpoint);
    const api = await ApiPromise.create({provider: wsProvider});
    const result = await api.query.contracts.contractInfoOf('5CYKEXWU3L4zWregopd2bTjoZLH9yHBpfXaqkFaTfxacaSA1')
    console.log(result.toHuman())
    process.exit()
  }
}
run()

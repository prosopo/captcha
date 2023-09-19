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
import { ApiPromise, WsProvider } from '@polkadot/api'
import { get } from '@prosopo/util'

const providers = {
    kusama: { endpoint: 'wss://kusama-rpc.polkadot.io/' },
    polkadot: { endpoint: 'wss://rpc.polkadot.io' },
}

async function run() {
    // Construct
    for (const provider in providers) {
        const wsProvider = new WsProvider(get(providers, provider).endpoint)
        const api = await ApiPromise.create({ provider: wsProvider })

        // Do something
        const validators = await api.query.staking.validators.keys()
        console.log(`${validators.length} validators on ${provider}`)
    }
    process.exit()
}

run()

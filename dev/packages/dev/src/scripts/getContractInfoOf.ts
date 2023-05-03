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
import { ApiPromise, WsProvider } from '@polkadot/api'

const providers = {
    local: { endpoint: 'ws://substrate-node:9944' },
    //'polkadot': {'endpoint': 'wss://rpc.polkadot.io'}
}

async function run() {
    // Construct
    for (const provider in providers) {
        const wsProvider = new WsProvider(providers[provider].endpoint)
        const api = await ApiPromise.create({ provider: wsProvider })
        const result = await api.query.contracts.contractInfoOf('5CYKEXWU3L4zWregopd2bTjoZLH9yHBpfXaqkFaTfxacaSA1')
        console.log(result.toHuman())
        process.exit()
    }
}
run()

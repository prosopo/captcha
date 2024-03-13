// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import { at } from '@prosopo/util'

async function run(blockNumber: string | number) {
    // Construct
    const provider = 'ws://localhost:9944'
    const wsProvider = new WsProvider(provider)
    const api = await ApiPromise.create({ provider: wsProvider })

    // Do something
    const blockHash = await api.rpc.chain.getBlockHash(blockNumber)

    const block = await api.rpc.chain.getBlock(blockHash)
    console.log(JSON.stringify(block.toJSON(), null, 2))
}

run(at(process.argv.slice(2), 0))
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(-1)
    })

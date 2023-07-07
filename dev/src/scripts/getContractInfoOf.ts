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

const yargs = require('yargs')

const providers = {
    local: { endpoint: 'ws://substrate-node:9944' },
    polkadot: { endpoint: 'wss://rpc.polkadot.io' },
    rococo: { endpoint: 'wss://rococo-contracts-rpc.polkadot.io:443' },
}

async function getContractInfoOf(contractAddress: string, provider: string) {
    const wsProvider = new WsProvider(providers[provider].endpoint)
    const api = await ApiPromise.create({ provider: wsProvider })
    return await api.query.contracts.contractInfoOf(contractAddress)
}

async function run(argv) {
    const parsed = yargs(argv)
        .usage('Usage:  [options]')
        .option('contract', {
            type: 'string',
            demand: true,
            desc: 'The contract to get the info of',
        })
        .option('network', {
            type: 'string',
            demand: false,
            desc: 'The network to use',
        })
        .parse()
    return await getContractInfoOf(parsed.contract, parsed.network)
}
run(process.argv.slice(2))
    .then((result) => {
        console.log(result.toHuman())
        process.exit()
    })
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })

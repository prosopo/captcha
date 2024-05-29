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
import { Abi } from '@polkadot/api-contract'
import { AbiJSON, Wasm } from '../../util/index.js'
import { AccountId } from '@prosopo/types'
import { ContractDeployer, getPairAsync } from '@prosopo/contract'
import { EventRecord } from '@polkadot/types/interfaces'
import { ProviderEnvironment } from '@prosopo/env'
import { defaultConfig } from '@prosopo/cli'
import { get } from '@prosopo/util'
import { randomAsHex } from '@polkadot/util-crypto'
import path from 'path'

async function deploy(wasm: Uint8Array, abi: Abi) {
    const config = defaultConfig()
    const network = config.networks[defaultConfig().defaultNetwork]
    const pair = await getPairAsync(network, '//Alice')
    const env = new ProviderEnvironment(defaultConfig(), pair)
    await env.isReady()
    // initialSupply, faucetAmount, prosopoAccount, humanThreshold, recencyThreshold
    const params = ['1000000000000000', 1000, process.env.PROSOPO_CONTRACT_ADDRESS, 50, 1000000]
    const deployer = new ContractDeployer(env.getApi(), abi, wasm, pair, params, 0, 0, randomAsHex(), config.logLevel)
    return await deployer.deploy()
}
export async function run(): Promise<AccountId> {
    const wasm = await Wasm(path.resolve(process.env.PROSOPO_DAPP_WASM_PATH || '.'))
    const abi = await AbiJSON(path.resolve(process.env.PROSOPO_DAPP_ABI_PATH || '.'))
    const deployResult = await deploy(wasm, abi)

    const instantiateEvent: EventRecord | undefined = deployResult.events.find(
        (event) => event.event.section === 'contracts' && event.event.method === 'Instantiated'
    )

    const contractAddress = String(get(instantiateEvent?.event.data, 'contract'))

    return contractAddress
}

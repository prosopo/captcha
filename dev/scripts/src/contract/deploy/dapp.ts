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
import { Abi } from '@polkadot/api-contract'
import { AbiJSON, Wasm } from '../../util/index.js'
import { AccountId, EventRecord } from '@polkadot/types/interfaces'
import { ContractDeployer } from '@prosopo/contract'
import { ProviderEnvironment } from '@prosopo/env'
import { defaultConfig, getPairType, getSs58Format } from '@prosopo/cli'
import { getPair } from '@prosopo/env'
import { loadEnv } from '@prosopo/cli'
import { randomAsHex } from '@polkadot/util-crypto'
import path from 'path'

async function deploy(wasm: Uint8Array, abi: Abi) {
    const pairType = getPairType()
    const ss58Format = getSs58Format()
    const pair = await getPair('//Alice', pairType, ss58Format)
    const env = new ProviderEnvironment(pair, defaultConfig())
    await env.isReady()
    // initialSupply, faucetAmount, prosopoAccount, humanThreshold, recencyThreshold
    const params = ['1000000000000000', 1000, process.env.PROTOCOL_CONTRACT_ADDRESS, 50, 1000000]
    const deployer = new ContractDeployer(env.getApi(), abi, wasm, env.pair, params, 0, 0, randomAsHex())
    return await deployer.deploy()
}
export async function run(): Promise<AccountId> {
    const wasm = await Wasm(path.resolve(process.env.DAPP_WASM_PATH || '.'))
    const abi = await AbiJSON(path.resolve(process.env.DAPP_ABI_PATH || '.'))
    const deployResult = await deploy(wasm, abi)

    const instantiateEvent: EventRecord | undefined = deployResult.events.find(
        (event) => event.event.section === 'contracts' && event.event.method === 'Instantiated'
    )
    console.log('instantiateEvent', instantiateEvent?.toHuman())
    return (instantiateEvent?.event.data as any)['contract'].toString()
}
// run the script if the main process is running this file
if (typeof require !== 'undefined' && require.main === module) {
    loadEnv(path.resolve('../..'))
    run()
        .then((deployResult) => {
            console.log('Deployed with address', deployResult)
            process.exit(0)
        })
        .catch((e) => {
            console.error(e)
            process.exit(1)
        })
}

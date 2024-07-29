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
import { ProviderEnvironment } from '@prosopo/env'
import { Tasks } from '@prosopo/provider'
import { defaultConfig } from '@prosopo/cli'
import { generateMnemonic, getPairAsync } from '@prosopo/contract'
import dotenv from 'dotenv'

dotenv.config()

async function main() {
    const config = defaultConfig()
    const network = config.networks[config.defaultNetwork]
    const pair = await getPairAsync(network, '//Alice')
    const env = new ProviderEnvironment(defaultConfig(), pair)
    await env.isReady()
    const tasks = new Tasks(env)
    const [mnemonic, address] = (await generateMnemonic(env.keyring)) || ['', '']
    const dappContractAccount = process.env.PROSOPO_SITE_KEY || ''
    // const provider = (await tasks.contract.query.getRandomActiveProvider(address, dappContractAccount)).value
    //     .unwrap()
    //     .unwrap()
    console.log('Tasks no longer makes contract queries. Please update to add in RPC calls.')
    process.exit()
}

main().catch((error) => {
    console.error(error)
    process.exit()
})

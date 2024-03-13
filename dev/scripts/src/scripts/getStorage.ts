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
import { at } from '@prosopo/util'
import { defaultConfig, loadEnv } from '@prosopo/cli'
import { get } from '@prosopo/util'
import { getPairAsync } from '@prosopo/contract'

loadEnv()

async function main(storageKey: string) {
    const config = defaultConfig()
    const network = config.networks[config.defaultNetwork]
    const pair = await getPairAsync(network, '//Alice')
    const env = new ProviderEnvironment(config, pair)
    await env.isReady()
    const tasks = new Tasks(env)
    const contract = tasks.contract
    const fn: any = get(contract, storageKey)
    const dappAccounts = await fn()
    console.log(dappAccounts.toHuman())
    process.exit()
}

main(at(process.argv.slice(2), 0).trim()).catch((error) => {
    console.error(error)
    process.exit()
})

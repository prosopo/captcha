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
import { getPair } from '@prosopo/common'
import { generateMnemonic } from '@prosopo/contract'
import { getPairType, getSs58Format } from '@prosopo/env'
import { Environment, Tasks } from '@prosopo/provider'
import dotenv from 'dotenv'

dotenv.config()

async function main() {
    const pair = await getPair(getPairType(), getSs58Format(), '//Alice')
    const env = new Environment(pair)
    await env.isReady()
    const tasks = new Tasks(env)
    const [mnemonic, address] = (await generateMnemonic(env.keyring)) || ['', '']
    const dappContractAccount = process.env.DAPP_CONTRACT_ADDRESS || ''
    const provider = await tasks.contractApi.getRandomProvider(address, dappContractAccount)
    console.log(provider)
    process.exit()
}

main().catch((error) => {
    console.error(error)
    process.exit()
})

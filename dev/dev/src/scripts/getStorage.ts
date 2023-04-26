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
import { Environment, Tasks } from '@prosopo/provider'
import { getPair, getPairType, getSs58Format } from '@prosopo/common'

require('dotenv').config()

async function main() {
    const pair = await getPair(getPairType(), getSs58Format(), '//Alice')
    const env = new Environment(pair)

    await env.isReady()
    const tasks = new Tasks(env)

    // await tasks.getProviderAccounts()
    // await tasks.getDappAccounts()
    process.exit()
}

main().catch((error) => {
    console.error(error)
    process.exit()
})

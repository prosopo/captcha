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
// import { prosopoMiddleware } from '../api';
// import { LocalAssetsResolver } from '../assets';
import { getPair } from '@prosopo/common'
import { getPairType, getSecret, getSs58Format, loadEnv } from '@prosopo/env'
import { Environment } from '../env'
import { processArgs } from './argv'

loadEnv()

async function main() {
    const secret = getSecret()
    const ss58Format = getSs58Format()
    const pairType = getPairType()

    const pair = await getPair(pairType, ss58Format, secret)

    console.log(`Pair address: ${pair.address}`)

    const env = new Environment(pair)

    await env.isReady()

    await processArgs(process.argv.slice(2), env)

    process.exit()
}

main().catch((error) => {
    console.error(error)
})

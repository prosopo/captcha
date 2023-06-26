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
import { Environment } from '@prosopo/env'
import { getConfig, getPairType, getSecret, getSs58Format } from './process.env'
import { getPair } from '@prosopo/common'
import { loadEnv } from './env'
import { processArgs } from './argv'
async function main() {
    loadEnv()
    const secret = getSecret()
    const ss58Format = getSs58Format()
    const pairType = getPairType()
    const config = getConfig()
    const pair = await getPair(pairType, ss58Format, secret)

    console.log(`Pair address: ${pair.address}`)

    console.log(`Contract address: ${process.env.PROTOCOL_CONTRACT_ADDRESS}`)

    const env = new Environment(pair, config)

    await env.isReady()

    await processArgs(process.argv.slice(2), env)

    process.exit()
}

// if main node process
if (typeof require !== 'undefined' && require.main === module) {
    main().catch((error) => {
        console.error(error)
    })
}

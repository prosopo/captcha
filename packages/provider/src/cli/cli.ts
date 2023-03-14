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
import { Environment, loadEnv } from '../env'
import { processArgs } from './argv'
import { ProsopoEnvError } from '@prosopo/common'
import { KeypairType } from '@polkadot/util-crypto/types'
import { KeyringPair, KeyringPair$Json } from '@polkadot/keyring/types'
import { getPair, getPairType, getSs58Format } from './util'

loadEnv()

async function main() {
    if (!process.env.PROVIDER_MNEMONIC && !process.env.PROVIDER_SEED && !process.env.PROVIDER_JSON) {
        throw new ProsopoEnvError('GENERAL.NO_MNEMONIC_OR_SEED')
    }
    let pair: KeyringPair

    const ss58Format = getSs58Format()

    if (process.env.PROVIDER_JSON) {
        const json = JSON.parse(process.env.PROVIDER_JSON) as KeyringPair$Json
        const {
            encoding: { content },
        } = json

        pair = await getPair(content[1] as KeypairType, ss58Format, undefined, undefined, json)
    } else {
        const pairType = getPairType()
        pair = await getPair(pairType, ss58Format, process.env.PROVIDER_MNEMONIC, process.env.PROVIDER_SEED)
    }

    console.log(`Pair address: ${pair.address}`)

    const env = new Environment(pair)

    await env.isReady()

    await processArgs(process.argv.slice(2), env)

    process.exit()
}

main().catch((error) => {
    console.error(error)
})

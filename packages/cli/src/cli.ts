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
import { LogLevel, getLogger } from '@prosopo/common'
import { ProsopoConfigOutput } from '@prosopo/types'
import { ProviderEnvironment, getPair } from '@prosopo/env'
import { getConfig, getSecret } from './process.env.js'
import { loadEnv } from './env.js'
import { processArgs } from './argv.js'
import { start } from './start.js'
import esMain from 'es-main'
import process from 'process'
const log = getLogger(LogLevel.enum.info, 'cli')
async function main() {
    loadEnv()

    const secret = getSecret()
    const config: ProsopoConfigOutput = getConfig()
    const pair = await getPair(config.account.address, secret, config.networks[config.defaultNetwork])

    log.info(`Pair address: ${pair.address}`)

    log.info(`Contract address: ${process.env.PROTOCOL_CONTRACT_ADDRESS}`)

    const processedArgs = await processArgs(process.argv, pair, config)
    if (processedArgs.api) {
        const env = new ProviderEnvironment(pair, config)
        await env.isReady()
        log.info('Starting API')
        await start(env)
    } else {
        process.exit(0)
    }
}

//if main process
if (esMain(import.meta)) {
    main()
        .then(() => {
            log.info('Running main process...')
        })
        .catch((error) => {
            log.error(error)
        })
}

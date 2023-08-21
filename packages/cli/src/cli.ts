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
import { LogLevel, getLogger, getPair } from '@prosopo/common'
import { ProviderEnvironment } from '@prosopo/env'
import { getConfig, getPairType, getSecret, getSs58Format } from './process.env'
import { loadEnv } from './env'
import { processArgs } from './argv'
import { start } from './start'
import { time } from 'console'
import { TIMEOUT } from 'dns'
const log = getLogger(LogLevel.Info, 'cli')
async function main() {
    log.setLogLevel(LogLevel.Verbose)
    loadEnv()

    const secret = getSecret()
    const ss58Format = getSs58Format()
    const pairType = getPairType()
    const config = getConfig()
    const pair = await getPair(pairType, ss58Format, secret)

    log.info(`Pair address: ${pair.address}`)

    log.info(`Contract address: ${process.env.PROTOCOL_CONTRACT_ADDRESS}`)

    const env = new ProviderEnvironment(pair, config)

    await env.isReady()

    const processedArgs = await processArgs(process.argv.slice(2), env)
    if (processedArgs.api) {
        log.info('Starting API')
        await start(env)
    } else {
        await setTimeout(() => {
            process.exit(0)
        }, 10000)
    }
}

// if main node process
if (typeof require !== 'undefined' && require.main === module) {
    main()
        .then(() => {
            log.info('Running main process...')
        })
        .catch((error) => {
            log.error(error)
        })
}

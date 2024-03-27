import type { KeyringPair } from '@polkadot/keyring/types'
import { LogLevel, type Logger, ProsopoEnvError, getLogger } from '@prosopo/common'
import { ProviderEnvironment } from '@prosopo/env'
import { Tasks } from '@prosopo/provider'
import type { ProsopoConfigOutput } from '@prosopo/types'
import type { ArgumentsCamelCase, Argv } from 'yargs'
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
import * as z from 'zod'
import { writeJSONFile } from '../files.js'

export default (pair: KeyringPair, config: ProsopoConfigOutput, cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || getLogger(LogLevel.enum.info, 'cli.provider_dataset')
    return {
        command: 'provider_dataset',
        describe: 'Exports a dataset from the provider database',
        builder: (yargs: Argv) =>
            yargs
                .option('dataset-id', {
                    type: 'string' as const,
                    demand: false,
                    desc: 'The dataset ID to export',
                } as const)
                .option('file', {
                    type: 'string' as const,
                    demand: true,
                    desc: 'The file path to export the dataset to',
                } as const),
        handler: async (argv: ArgumentsCamelCase) => {
            try {
                const env = new ProviderEnvironment(config, pair)
                await env.isReady()
                const tasks = new Tasks(env)
                let datasetId = z.string().optional().parse(argv.datasetId)
                if (!env.config.account.address) {
                    throw new ProsopoEnvError('GENERAL.ACCOUNT_NOT_FOUND')
                }
                if (datasetId === undefined) {
                    const providerAddress = env.config.account.address
                    const provider = (await tasks.contract.query.getProvider(providerAddress)).value.unwrap().unwrap()
                    logger.info(`Getting dataset ID from provider ${providerAddress}`)
                    datasetId = provider.datasetId.toString()
                }
                // get the dataset from the provider database
                const result = await tasks.getProviderDataset(datasetId)
                // export the result to file
                await writeJSONFile(z.string().parse(argv.file), result)
            } catch (err) {
                logger.error(err)
            }
        },
    }
}

import type { KeyringPair } from '@polkadot/keyring/types'
import { LogLevel, type Logger, ProsopoEnvError, getLogger } from '@prosopo/common'
import { ProviderEnvironment } from '@prosopo/env'
import { BatchCommitmentsTask } from '@prosopo/provider'
import type { ProsopoConfigOutput } from '@prosopo/types'
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
import type { ArgumentsCamelCase, Argv } from 'yargs'
import { validateScheduleExpression } from './validators.js'

export default (pair: KeyringPair, config: ProsopoConfigOutput, cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || getLogger(LogLevel.enum.info, 'cli.batch_commit')
    return {
        command: 'batch_commit',
        describe: 'Batch commit user solutions to contract' as const,
        builder: (yargs: Argv) => {
            return yargs.option('schedule', {
                type: 'string' as const,
                demand: false,
                desc: 'A Recurring schedule expression',
            } as const)
        },
        handler: async (argv: ArgumentsCamelCase) => {
            const env = new ProviderEnvironment(config, pair)
            await env.isReady()
            if (argv.schedule) {
                throw new ProsopoEnvError('GENERAL.NOT_IMPLEMENTED')
            }
            if (env.db) {
                const batchCommitter = new BatchCommitmentsTask(
                    env.config.batchCommit,
                    env.getContractInterface(),
                    env.db,
                    0n,
                    env.logger
                )
                const result = await batchCommitter.run()
                logger.info(`Batch commit complete: ${result}`)
            } else {
                logger.error('No database configured')
            }
        },
        middlewares: [validateScheduleExpression],
    }
}

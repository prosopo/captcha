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
import { ArgumentsCamelCase, Argv } from 'yargs'
import { CalculateSolutionsTask } from '@prosopo/provider'
import { KeyringPair } from '@polkadot/keyring/types'
import { LogLevel, Logger, ProsopoEnvError, getLogger } from '@prosopo/common'
import { ProsopoConfigOutput } from '@prosopo/types'
import { ProviderEnvironment } from '@prosopo/env'
import { validateScheduleExpression } from './validators.js'

export default (pair: KeyringPair, config: ProsopoConfigOutput, cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || getLogger(LogLevel.enum.info, 'cli.calculate_captcha_solutions')

    return {
        command: 'calculate_captcha_solutions',
        describe: 'Calculate captcha solutions',
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
            } else {
                const calculateSolutionsTask = new CalculateSolutionsTask(env)
                const result = await calculateSolutionsTask.run()
                logger.info(`Updated ${result} captcha solutions`)
            }
        },
        middlewares: [validateScheduleExpression],
    }
}

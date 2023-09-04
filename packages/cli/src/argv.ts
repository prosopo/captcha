// Copyright 2021-2023 Prosopo (UK) Ltd.
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
import { ProviderEnvironment } from '@prosopo/types-env'
import { Tasks } from '@prosopo/provider'
import {
    commandBatchCommit,
    commandCalculateCaptchaSolutions,
    commandDappAccounts,
    commandDappDetails,
    commandDappRegister,
    commandDappUpdate,
    commandProviderAccounts,
    commandProviderDataset,
    commandProviderDeregister,
    commandProviderDetails,
    commandProviderRegister,
    commandProviderSetDataset,
    commandProviderUpdate,
} from './commands/index.js'
import { getLogger } from '@prosopo/common'
import { hideBin } from 'yargs/helpers'
import yargs from 'yargs'

export function processArgs(args: string[], env: ProviderEnvironment) {
    const tasks = new Tasks(env)
    const logger = getLogger(env.config.logLevel, 'CLI')

    return yargs(hideBin(args))
        .usage('Usage: $0 [global options] <command> [options]')
        .option('api', { demand: false, default: false, type: 'boolean' } as const)
        .command(commandProviderRegister(env, tasks, { logger }))
        .command(commandProviderUpdate(env, tasks, { logger }))
        .command(commandProviderDeregister(env, tasks, { logger }))
        .command(commandProviderSetDataset(env, tasks, { logger }))
        .command(commandDappRegister(env, tasks, { logger }))
        .command(commandDappUpdate(env, tasks, { logger }))
        .command(commandProviderAccounts(env, tasks, { logger }))
        .command(commandDappAccounts(env, tasks, { logger }))
        .command(commandProviderDetails(env, tasks, { logger }))
        .command(commandProviderDataset(env, tasks, { logger }))
        .command(commandDappDetails(env, tasks, { logger }))
        .command(commandCalculateCaptchaSolutions(env, { logger }))
        .command(commandBatchCommit(env, { logger })).argv
}

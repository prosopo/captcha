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
import { KeyringPair } from '@polkadot/keyring/types'
import { LogLevelSchema, getLogger } from '@prosopo/common'
import { ProsopoConfig } from '@prosopo/types'
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
    commandVersion,
} from './commands/index.js'
import { hideBin } from 'yargs/helpers'
import yargs from 'yargs'

export function processArgs(args, pair: KeyringPair, config: ProsopoConfig) {
    const logger = getLogger(LogLevelSchema.Values.Info, 'CLI')
    return yargs(hideBin(args))
        .usage('Usage: $0 [global options] <command> [options]')
        .option('api', { demand: false, default: false, type: 'boolean' } as const)
        .command(commandProviderRegister(pair, config, { logger }))
        .command(commandProviderUpdate(pair, config, { logger }))
        .command(commandProviderDeregister(pair, config, { logger }))
        .command(commandProviderSetDataset(pair, config, { logger }))
        .command(commandDappRegister(pair, config, { logger }))
        .command(commandDappUpdate(pair, config, { logger }))
        .command(commandProviderAccounts(pair, config, { logger }))
        .command(commandDappAccounts(pair, config, { logger }))
        .command(commandProviderDetails(pair, config, { logger }))
        .command(commandProviderDataset(pair, config, { logger }))
        .command(commandDappDetails(pair, config, { logger }))
        .command(commandCalculateCaptchaSolutions(pair, config, { logger }))
        .command(commandBatchCommit(pair, config, { logger }))
        .command(commandVersion(pair, config, { logger }))
        .parse()
}

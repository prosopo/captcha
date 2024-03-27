import type { KeyringPair } from '@polkadot/keyring/types'
import { DappPayee } from '@prosopo/captcha-contract/types-returns'
import { LogLevel, type Logger, getLogger } from '@prosopo/common'
import { wrapQuery } from '@prosopo/contract'
import { ProviderEnvironment } from '@prosopo/env'
import { Tasks } from '@prosopo/provider'
import type { ProsopoConfigOutput } from '@prosopo/types'
import { get } from '@prosopo/util'
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
import { validateContract, validatePayee } from './validators.js'

export default (pair: KeyringPair, config: ProsopoConfigOutput, cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || getLogger(LogLevel.enum.info, 'cli.dapp_update')

    return {
        command: 'dapp_update',
        describe: 'Register a Dapp',
        builder: (yargs: Argv) =>
            yargs
                .option('contract', {
                    type: 'string' as const,
                    demand: true,
                    desc: 'The AccountId of the Dapp',
                } as const)
                .option('payee', {
                    type: 'string' as const,
                    demand: true,
                    desc: 'The person who receives the fee (`Provider` or `Dapp`)',
                } as const),
        handler: async (argv: ArgumentsCamelCase) => {
            try {
                const env = new ProviderEnvironment(config, pair)
                await env.isReady()
                const tasks = new Tasks(env)
                const stakeThreshold = (await tasks.contract.query.getDappStakeThreshold({})).value.unwrap()
                const dappRegisterArgs: Parameters<typeof tasks.contract.query.dappUpdate> = [
                    z.string().parse(argv.contract),
                    get(DappPayee, z.string().parse(argv.payee)),
                    z.string().parse(argv.owner),
                    {
                        value: stakeThreshold.toNumber(),
                    },
                ]
                await wrapQuery(tasks.contract.query.dappUpdate, tasks.contract.query)(...dappRegisterArgs)
                const result = await tasks.contract.tx.dappUpdate(...dappRegisterArgs)

                logger.info(JSON.stringify(result, null, 2))
            } catch (err) {
                logger.error(err)
            }
        },
        middlewares: [validateContract, validatePayee],
    }
}

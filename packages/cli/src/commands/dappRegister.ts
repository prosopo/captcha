import type { KeyringPair } from '@polkadot/keyring/types'
import { DappPayee } from '@prosopo/captcha-contract/types-returns'
import { LogLevel, type Logger, getLogger } from '@prosopo/common'
import { wrapQuery } from '@prosopo/contract'
import { ProviderEnvironment } from '@prosopo/env'
import { Tasks } from '@prosopo/provider'
import type { ProsopoConfigOutput } from '@prosopo/types'
import { get } from '@prosopo/util'
import type { ArgumentsCamelCase, Argv } from 'yargs'
import * as z from 'zod'
import { validateContract, validatePayee } from './validators.js'

export default (
    pair: KeyringPair,
    config: ProsopoConfigOutput,
    cmdArgs?: { logger?: Logger }
) => {
    const logger =
        cmdArgs?.logger || getLogger(LogLevel.enum.info, 'cli.dapp_register')

    return {
        command: 'dapp_register',
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
                const dappRegisterArgs: Parameters<
                    typeof tasks.contract.query.dappRegister
                > = [
                    z.string().parse(argv.contract),
                    get(DappPayee, z.string().parse(argv.payee)),
                    {
                        value: 0,
                    },
                ]
                await wrapQuery(
                    tasks.contract.query.dappRegister,
                    tasks.contract.query
                )(...dappRegisterArgs)
                const result = await tasks.contract.tx.dappRegister(
                    ...dappRegisterArgs
                )

                logger.info(JSON.stringify(result, null, 2))
            } catch (err) {
                logger.error(err)
            }
        },
        middlewares: [validateContract, validatePayee],
    }
}

import type { KeyringPair } from '@polkadot/keyring/types'
import { stringToU8a } from '@polkadot/util/string'
import { Payee } from '@prosopo/captcha-contract/types-returns'
import { LogLevel, type Logger, getLogger } from '@prosopo/common'
import { wrapQuery } from '@prosopo/contract'
import { ProviderEnvironment } from '@prosopo/env'
import { Tasks } from '@prosopo/provider'
import type { ProsopoConfigOutput } from '@prosopo/types'
import type { ArgumentsCamelCase, Argv } from 'yargs'
import type { CommandModule } from 'yargs'
import * as z from 'zod'
import { validateFee, validatePayee } from './validators.js'

const providerRegisterArgsParser = z.object({
    url: z.string(),
    fee: z.number(),
    payee: z.nativeEnum(Payee),
})
export default (
    pair: KeyringPair,
    config: ProsopoConfigOutput,
    cmdArgs?: { logger?: Logger }
) => {
    const logger =
        cmdArgs?.logger ||
        getLogger(LogLevel.enum.info, 'cli.provider_register')
    return {
        command: 'provider_register',
        describe: 'Register a Provider',
        builder: (yargs: Argv) =>
            yargs
                .option('url', {
                    type: 'string' as const,
                    demand: true,
                    desc: 'The provider service origin (URI)',
                } as const)
                .option('fee', {
                    type: 'number',
                    demand: true,
                    desc: 'The fee to pay per solved captcha',
                } as const)
                .option('payee', {
                    type: 'string' as const,
                    demand: true,
                    desc: 'The person who receives the fee (`Provider` or `Dapp`)',
                } as const),
        handler: async (argv: ArgumentsCamelCase) => {
            try {
                const parsedArgs = providerRegisterArgsParser.parse(argv)
                const env = new ProviderEnvironment(config, pair)
                await env.isReady()
                const tasks = new Tasks(env)
                const providerRegisterArgs: Parameters<
                    typeof tasks.contract.query.providerRegister
                > = [
                    Array.from(stringToU8a(parsedArgs.url)),
                    parsedArgs.fee,
                    parsedArgs.payee,
                    {
                        value: 0,
                    },
                ]
                await wrapQuery(
                    tasks.contract.query.providerRegister,
                    tasks.contract.query
                )(...providerRegisterArgs)
                const result = await tasks.contract.tx.providerRegister(
                    ...providerRegisterArgs
                )

                logger.info(JSON.stringify(result, null, 2))
            } catch (err) {
                logger.error(err)
            }
        },
        middlewares: [validatePayee, validateFee],
    } as CommandModule
}

import { Logger } from '@prosopo/common'
import { ProviderEnvironment } from '@prosopo/types-env'
import { Tasks } from '@prosopo/provider'
import { stringToU8a } from '@polkadot/util'
import { validatePayee } from './validators.js'
import { wrapQuery } from '@prosopo/contract'
import { ArgumentsCamelCase, Argv } from 'yargs'

export default (env: ProviderEnvironment, tasks: Tasks, cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || env.logger

    return {
        command: 'provider_register',
        decription: 'Register a Provider',
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
            const providerRegisterArgs: Parameters<typeof tasks.contract.query.providerRegister> = [
                Array.from(stringToU8a(argv.url)),
                argv.fee,
                argv.payee,
                {
                    value: 0,
                },
            ]
            await wrapQuery(tasks.contract.query.providerRegister, tasks.contract.query)(...providerRegisterArgs)
            const result = await tasks.contract.tx.providerRegister(...providerRegisterArgs)

            logger.info(JSON.stringify(result, null, 2))
        },
        middlewares: [validatePayee],
    }
}

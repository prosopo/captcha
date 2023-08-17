import { Logger } from '@prosopo/common'
import { ProviderEnvironment } from '@prosopo/types-env'
import { Tasks } from '@prosopo/provider'
import { validateContract, validatePayee } from './validators'
import { wrapQuery } from '@prosopo/contract'

export default (env: ProviderEnvironment, tasks: Tasks, cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || env.logger

    return {
        command: 'dapp_register',
        description: 'Register a Dapp',
        builder: (yargs) =>
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
        handler: async (argv) => {
            const dappRegisterArgs: Parameters<typeof tasks.contract.query.dappRegister> = [
                argv.contract,
                argv.payee,
                {
                    value: 0,
                },
            ]
            await wrapQuery(tasks.contract.query.dappRegister, tasks.contract.query)(...dappRegisterArgs)
            const result = await tasks.contract.tx.dappRegister(...dappRegisterArgs)

            logger.info(JSON.stringify(result, null, 2))
        },
        middlewares: [validateContract, validatePayee],
    }
}

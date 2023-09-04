import { Logger } from '@prosopo/common'
import { ProviderEnvironment } from '@prosopo/types-env'
import { Tasks } from '@prosopo/provider'
import { validateContract, validatePayee } from './validators.js'
import { wrapQuery } from '@prosopo/contract'
import { ArgumentsCamelCase, Argv } from 'yargs'

export default (env: ProviderEnvironment, tasks: Tasks, cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || env.logger

    return {
        command: 'dapp_update',
        description: 'Register a Dapp',
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
            const stakeThreshold = (await tasks.contract.query.getDappStakeThreshold({})).value.unwrap()
            const dappRegisterArgs: Parameters<typeof tasks.contract.query.dappUpdate> = [
                argv.contract,
                argv.payee,
                argv.owner,
                {
                    value: stakeThreshold.toNumber(),
                },
            ]
            await wrapQuery(tasks.contract.query.dappUpdate, tasks.contract.query)(...dappRegisterArgs)
            const result = await tasks.contract.tx.dappUpdate(...dappRegisterArgs)

            logger.info(JSON.stringify(result, null, 2))
        },
        middlewares: [validateContract, validatePayee],
    }
}

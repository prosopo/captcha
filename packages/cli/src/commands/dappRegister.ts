import { KeyringPair } from '@polkadot/keyring/types'
import { LogLevelSchema, Logger, getLogger } from '@prosopo/common'
import { ProsopoConfig } from '@prosopo/types'
import { ProviderEnvironment } from '@prosopo/env'
import { Tasks } from '@prosopo/provider'
import { validateContract, validatePayee } from './validators.js'
import { wrapQuery } from '@prosopo/contract'

export default (pair: KeyringPair, config: ProsopoConfig, cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || getLogger(LogLevelSchema.Values.Info, 'cli.dapp_register')

    return {
        command: 'dapp_register',
        describe: 'Register a Dapp',
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
            try {
                const env = new ProviderEnvironment(pair, config)
                await env.isReady()
                const tasks = new Tasks(env)
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
            } catch (err) {
                logger.error(err)
            }
        },
        middlewares: [validateContract, validatePayee],
    }
}

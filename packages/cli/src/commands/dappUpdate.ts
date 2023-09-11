import { KeyringPair } from '@polkadot/keyring/types'
import { LogLevelSchema, Logger, getLogger } from '@prosopo/common'
import { ProsopoConfig } from '@prosopo/types'
import { ProviderEnvironment } from '@prosopo/env'
import { Tasks } from '@prosopo/provider'
import { validateContract, validatePayee } from './validators.js'
import { wrapQuery } from '@prosopo/contract'

export default (pair: KeyringPair, config: ProsopoConfig, cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || getLogger(LogLevelSchema.Values.Info, 'cli.dapp_update')

    return {
        command: 'dapp_update',
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
            } catch (err) {
                logger.error(err)
            }
        },
        middlewares: [validateContract, validatePayee],
    }
}

import { ArgumentsCamelCase, Argv } from 'yargs'
import { KeyringPair } from '@polkadot/keyring/types'
import { LogLevel, Logger, getLogger } from '@prosopo/common'
import { ProsopoConfigOutput } from '@prosopo/types'
import { ProviderEnvironment } from '@prosopo/env'
import { Tasks } from '@prosopo/provider'

export default (pair: KeyringPair, config: ProsopoConfigOutput, cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || getLogger(LogLevel.enum.info, 'cli.dapp_accounts')

    return {
        command: 'dapp_accounts',
        describe: 'List all dapp accounts',
        builder: (yargs: Argv) => yargs,
        handler: async (argv: ArgumentsCamelCase) => {
            try {
                const env = new ProviderEnvironment(config, pair)

                await env.isReady()
                const tasks = new Tasks(env)
                const result = await (tasks.contract.contract as any)['dappAccounts']()

                logger.info(JSON.stringify(result, null, 2))
            } catch (err) {
                logger.error(err)
            }
        },
        middlewares: [],
    }
}

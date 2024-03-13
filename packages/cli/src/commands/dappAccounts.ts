import type { KeyringPair } from '@polkadot/keyring/types'
import { LogLevel, type Logger, getLogger } from '@prosopo/common'
import { ProviderEnvironment } from '@prosopo/env'
import { Tasks } from '@prosopo/provider'
import type { ProsopoConfigOutput } from '@prosopo/types'
import type { ArgumentsCamelCase, Argv } from 'yargs'

export default (
    pair: KeyringPair,
    config: ProsopoConfigOutput,
    cmdArgs?: { logger?: Logger }
) => {
    const logger =
        cmdArgs?.logger || getLogger(LogLevel.enum.info, 'cli.dapp_accounts')

    return {
        command: 'dapp_accounts',
        describe: 'List all dapp accounts',
        builder: (yargs: Argv) => yargs,
        handler: async (argv: ArgumentsCamelCase) => {
            try {
                const env = new ProviderEnvironment(config, pair)

                await env.isReady()
                const tasks = new Tasks(env)
                const result = await (
                    tasks.contract.contract as any
                ).dappAccounts()

                logger.info(JSON.stringify(result, null, 2))
            } catch (err) {
                logger.error(err)
            }
        },
        middlewares: [],
    }
}

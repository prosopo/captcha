import { CommandModule } from 'yargs'
import { KeyringPair } from '@polkadot/keyring/types'
import { LogLevelSchema, Logger, getLogger } from '@prosopo/common'
import { ProsopoConfig } from '@prosopo/types'
import { ProviderEnvironment } from '@prosopo/env'
import { Tasks } from '@prosopo/provider'
export default (pair: KeyringPair, config: ProsopoConfig, cmdArgs?: { logger?: Logger }): CommandModule => {
    const logger = cmdArgs?.logger || getLogger(LogLevelSchema.Values.Info, 'cli.provider_accounts')

    return {
        command: 'provider_accounts',
        describe: 'List all provider accounts',
        builder: (yargs) => yargs,
        handler: async () => {
            try {
                const env = new ProviderEnvironment(pair, config)
                await env.isReady()
                const tasks = new Tasks(env)
                const result = await tasks.contract.contract['providerAccounts']()
                logger.info(JSON.stringify(result, null, 2))
            } catch (err) {
                logger.error(err)
            }
        },
    }
}

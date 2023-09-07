import { KeyringPair } from '@polkadot/keyring/types'
import { LogLevelSchema, Logger, getLogger } from '@prosopo/common'
import { ProsopoConfig } from '@prosopo/types'
import { ProviderEnvironment } from '@prosopo/env'
import { Tasks } from '@prosopo/provider'
export default (pair: KeyringPair, config: ProsopoConfig, cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || getLogger(LogLevelSchema.Values.Info, 'cli.dapp_accounts')

    return {
        command: 'dapp_accounts',
        describe: 'List all dapp accounts',
        builder: (yargs) => yargs,
        handler: async () => {
            try {
                const env = new ProviderEnvironment(pair, config)

                await env.isReady()
                const tasks = new Tasks(env)
                const result = await tasks.contract.contract['dappAccounts']()

                logger.info(JSON.stringify(result, null, 2))
            } catch (err) {
                logger.error(err)
            }
        },
        middlewares: [],
    }
}

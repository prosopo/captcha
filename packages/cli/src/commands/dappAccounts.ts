import { Logger } from '@prosopo/common'
import { ProviderEnvironment } from '@prosopo/types-env'
import { Tasks } from '@prosopo/provider'
export default (env: ProviderEnvironment, tasks: Tasks, cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || env.logger

    return {
        command: 'dapp_accounts',
        description: 'List all dapp accounts',
        builder: (yargs) => yargs,
        handler: async () => {
            try {
                const result = await tasks.contract.contract['dappAccounts']()

                logger.info(JSON.stringify(result, null, 2))
            } catch (err) {
                logger.error(err)
            }
        },
        middlewares: [],
    }
}

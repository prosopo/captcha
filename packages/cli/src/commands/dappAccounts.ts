import { Argv } from 'yargs'
import { Logger } from '@prosopo/common'
import { ProviderEnvironment } from '@prosopo/types-env'
import { Tasks } from '@prosopo/provider'
import { get } from '@prosopo/util'

export default (env: ProviderEnvironment, tasks: Tasks, cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || env.logger

    return {
        command: 'dapp_accounts',
        description: 'List all dapp accounts',
        builder: (yargs: Argv) => yargs,
        handler: async () => {
            try {
                const func = get<() => unknown>(tasks.contract.contract, 'dappAccounts')
                const result = await func()

                logger.info(JSON.stringify(result, null, 2))
            } catch (err) {
                logger.error(err)
            }
        },
        middlewares: [],
    }
}

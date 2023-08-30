import { Logger } from '@prosopo/common'
import { ProviderEnvironment } from '@prosopo/types-env'
import { Tasks } from '@prosopo/provider'
import { validateAddress } from './validators'
export default (env: ProviderEnvironment, tasks: Tasks, cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || env.logger

    return {
        command: 'provider_deregister',
        description: 'Deregister a Provider',
        builder: (yargs) =>
            yargs.option('address', {
                type: 'string' as const,
                demand: true,
                desc: 'The AccountId of the Provider',
            } as const),
        handler: async (argv) => {
            try {
                await tasks.contract.tx.providerDeregister(argv.address)

                logger.info('Provider registered')
            } catch (err) {
                logger.error(err)
            }
        },
        middlewares: [validateAddress],
    }
}

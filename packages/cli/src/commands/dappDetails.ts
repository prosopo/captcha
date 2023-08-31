import { Logger } from '@prosopo/common'
import { ProviderEnvironment } from '@prosopo/types-env'
import { Tasks } from '@prosopo/provider'
import { validateAddress } from './validators.js'
export default (env: ProviderEnvironment, tasks: Tasks, cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || env.logger

    return {
        command: 'dapp_details',
        description: 'List details of a single Dapp',
        builder: (yargs) =>
            yargs.option('address', {
                type: 'string' as const,
                demand: true,
                desc: 'The AccountId of the Dapp',
            } as const),
        handler: async (argv) => {
            try {
                const result = (await tasks.contract.query.getDapp(validateAddress(argv.address).address)).value
                    .unwrap()
                    .unwrap()

                logger.info(JSON.stringify(result, null, 2))
            } catch (err) {
                logger.error(err)
            }
        },
        middlewares: [validateAddress],
    }
}

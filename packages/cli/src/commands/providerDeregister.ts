import type { KeyringPair } from '@polkadot/keyring/types'
import { LogLevel, type Logger, getLogger } from '@prosopo/common'
import { ProsopoEnvError } from '@prosopo/common'
import { ProviderEnvironment } from '@prosopo/env'
import { Tasks } from '@prosopo/provider'
import type { ProsopoConfigOutput } from '@prosopo/types'
import type { ArgumentsCamelCase, Argv } from 'yargs'
import { validateAddress } from './validators.js'

export default (
    pair: KeyringPair,
    config: ProsopoConfigOutput,
    cmdArgs?: { logger?: Logger }
) => {
    const logger =
        cmdArgs?.logger ||
        getLogger(LogLevel.enum.info, 'cli.provider_deregister')

    return {
        command: 'provider_deregister',
        describe: 'Deregister a Provider',
        builder: (yargs: Argv) =>
            yargs.option('address', {
                type: 'string' as const,
                demand: true,
                desc: 'The AccountId of the Provider',
            } as const),
        handler: async (argv: ArgumentsCamelCase) => {
            try {
                const env = new ProviderEnvironment(config, pair)
                await env.isReady()
                const tasks = new Tasks(env)

                // TODO provider deregister does not accept params... it should?
                // await tasks.contract.tx.providerDeregister(argv.address)

                // logger.info('Provider registered')

                throw new ProsopoEnvError('GENERAL.NOT_IMPLEMENTED')
            } catch (err) {
                logger.error(err)
            }
        },
        middlewares: [validateAddress],
    }
}

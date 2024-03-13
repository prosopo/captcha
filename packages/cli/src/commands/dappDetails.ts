import type { KeyringPair } from '@polkadot/keyring/types'
import { LogLevel, type Logger, getLogger } from '@prosopo/common'
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
        cmdArgs?.logger || getLogger(LogLevel.enum.info, 'cli.dapp_details')

    return {
        command: 'dapp_details',
        describe: 'List details of a single Dapp',
        builder: (yargs: Argv) =>
            yargs.option('address', {
                type: 'string' as const,
                demand: true,
                desc: 'The AccountId of the Dapp',
            } as const),
        handler: async (argv: ArgumentsCamelCase) => {
            try {
                const env = new ProviderEnvironment(config, pair)
                await env.isReady()
                const tasks = new Tasks(env)
                const result = (
                    await tasks.contract.query.getDapp(
                        validateAddress(argv).address
                    )
                ).value
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

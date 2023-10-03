import { ArgumentsCamelCase, Argv } from 'yargs'
import { KeyringPair } from '@polkadot/keyring/types'
import { LogLevel, Logger, getLogger } from '@prosopo/common'
import { ProsopoConfigOutput } from '@prosopo/types'
import { ProviderEnvironment } from '@prosopo/env'
import { Tasks } from '@prosopo/provider'
import { validateAddress } from './validators.js'
import { z } from 'zod'

export default (pair: KeyringPair, config: ProsopoConfigOutput, cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || getLogger(LogLevel.enum.info, 'cli.provider_details')
    return {
        command: 'provider_details',
        describe: 'List details of a single Provider',
        builder: (yargs: Argv) =>
            yargs.option('address', {
                type: 'string' as const,
                demand: true,
                desc: 'The AccountId of the Provider',
            } as const),
        handler: async (argv: ArgumentsCamelCase) => {
            try {
                const env = new ProviderEnvironment(pair, config)
                await env.isReady()
                const tasks = new Tasks(env)
                const result = (await tasks.contract.query.getProvider(z.string().parse(argv.address), {})).value
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

import { ArgumentsCamelCase, Argv } from 'yargs'
import { KeyringPair } from '@polkadot/keyring/types'
import { LogLevel, Logger, getLogger } from '@prosopo/common'
import { ProsopoConfigOutput } from '@prosopo/types'
import { ProviderEnvironment } from '@prosopo/env'
import { Tasks } from '@prosopo/provider'
import { loadJSONFile } from '../files.js'
import { z } from 'zod'

export default (pair: KeyringPair, config: ProsopoConfigOutput, cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || getLogger(LogLevel.enum.info, 'cli.provider_set_data_set')

    return {
        command: 'provider_set_data_set',
        describe: 'Add a dataset as a Provider',
        builder: (yargs: Argv) =>
            yargs.option('file', {
                type: 'string' as const,
                demand: true,
                desc: 'The file path of a JSON dataset file',
            } as const),
        handler: async (argv: ArgumentsCamelCase) => {
            try {
                const env = new ProviderEnvironment(config, pair)
                await env.isReady()
                const tasks = new Tasks(env)
                const file = z.string().parse(argv.file)
                const jsonFile = loadJSONFile(file) as JSON
                logger.info(`Loaded JSON from ${file}`)
                const result = await tasks.providerSetDatasetFromFile(jsonFile)
                logger.info(JSON.stringify(result, null, 2))
            } catch (err) {
                logger.error(err)
            }
        },
        middlewares: [],
    }
}

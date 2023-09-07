import { KeyringPair } from '@polkadot/keyring/types'
import { LogLevelSchema, Logger, getLogger } from '@prosopo/common'
import { ProsopoConfig } from '@prosopo/types'
import { ProviderEnvironment } from '@prosopo/env'
import { Tasks } from '@prosopo/provider'
import { loadJSONFile } from '../files.js'

export default (pair: KeyringPair, config: ProsopoConfig, cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || getLogger(LogLevelSchema.Values.Info, 'cli.provider_set_data_set')

    return {
        command: 'provider_set_data_set',
        describe: 'Add a dataset as a Provider',
        builder: (yargs) =>
            yargs.option('file', {
                type: 'string' as const,
                demand: true,
                desc: 'The file path of a JSON dataset file',
            } as const),
        handler: async (argv) => {
            try {
                const env = new ProviderEnvironment(pair, config)
                await env.isReady()
                const tasks = new Tasks(env)
                const jsonFile = loadJSONFile(argv.file, logger) as JSON
                logger.info(`Loaded JSON from ${argv.file}`)
                const result = await tasks.providerSetDatasetFromFile(jsonFile)
                logger.info(JSON.stringify(result, null, 2))
            } catch (err) {
                logger.error(err)
            }
        },
        middlewares: [],
    }
}

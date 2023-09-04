import { Logger } from '@prosopo/common'
import { ProviderEnvironment } from '@prosopo/types-env'
import { Tasks } from '@prosopo/provider'
import { loadJSONFile } from '../files.js'
import { ArgumentsCamelCase, Argv } from 'yargs'

export default (env: ProviderEnvironment, tasks: Tasks, cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || env.logger

    return {
        command: 'provider_set_data_set',
        description: 'Add a dataset as a Provider',
        builder: (yargs: Argv) =>
            yargs.option('file', {
                type: 'string' as const,
                demand: true,
                desc: 'The file path of a JSON dataset file',
            } as const),
        handler: async (argv: ArgumentsCamelCase) => {
            try {
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

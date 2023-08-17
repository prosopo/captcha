import { Logger } from '@prosopo/common'
import { ProviderEnvironment } from '@prosopo/types-env'
import { Tasks } from '@prosopo/provider'
import { writeJSONFile } from '../files.js'
export default (env: ProviderEnvironment, tasks: Tasks, cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || env.logger

    return {
        command: 'provider_dataset',
        description: 'Exports a dataset from the provider database',
        builder: (yargs) =>
            yargs
                .option('dataset-id', {
                    type: 'string' as const,
                    demand: false,
                    desc: 'The dataset ID to export',
                } as const)
                .option('file', {
                    type: 'string' as const,
                    demand: true,
                    desc: 'The file path to export the dataset to',
                } as const),
        handler: async (argv) => {
            try {
                let datasetId = argv.datasetId
                if (datasetId === undefined) {
                    const providerAddress = env.config.account.address
                    const provider = (await tasks.contract.query.getProvider(providerAddress)).value.unwrap().unwrap()
                    logger.info(`Getting dataset ID from provider ${providerAddress}`)
                    datasetId = provider.datasetId.toString()
                }
                // get the dataset from the provider database
                const result = await tasks.getProviderDataset(datasetId)
                // export the result to file
                await writeJSONFile(argv.file, result)
            } catch (err) {
                logger.error(err)
            }
        },
    }
}

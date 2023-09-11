import { KeyringPair } from '@polkadot/keyring/types'
import { LogLevelSchema, Logger, getLogger } from '@prosopo/common'
import { ProsopoConfig } from '@prosopo/types'
import { ProviderEnvironment } from '@prosopo/env'
import { Tasks } from '@prosopo/provider'
import { writeJSONFile } from '../files.js'
export default (pair: KeyringPair, config: ProsopoConfig, cmdArgs?: { logger?: Logger }) => {
    const logger = cmdArgs?.logger || getLogger(LogLevelSchema.Values.Info, 'cli.provider_dataset')
    return {
        command: 'provider_dataset',
        describe: 'Exports a dataset from the provider database',
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
                const env = new ProviderEnvironment(pair, config)
                await env.isReady()
                const tasks = new Tasks(env)
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

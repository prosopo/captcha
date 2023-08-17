import { ArgumentsCamelCase, Argv } from 'yargs'
import { Logger } from '@prosopo/common'
import { argsSchema } from './args.js'
import flatten from './flatten.js'

export default (cmdArgs?: { logger?: Logger }) => {
    return {
        command: 'flatten',
        describe:
            'Restructure a directory containing directories for each image classification into a single directory with a file containing the labels',
        builder: (yargs: Argv) => {
            return yargs
                .option('data', {
                    type: 'string',
                    alias: 'in',
                    demand: true,
                    description: 'Path to the data directory containing subdirectories for each image classification',
                })
                .option('out', {
                    type: 'string',
                    demand: true,
                    description: 'Where to put the output file containing the labels and single directory of images',
                })
                .option('overwrite', {
                    type: 'boolean',
                    description: 'Overwrite the output file if it already exists',
                })
        },
        handler: async (argv: ArgumentsCamelCase) => {
            await flatten(argsSchema.parse(argv), cmdArgs?.logger)
        },
    }
}

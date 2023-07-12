import { ArgumentsCamelCase, Argv } from 'yargs'
import generateDistinct from './distinct/cli.js'
import generateUnion from './union/cli.js'

export default {
    command: 'generate',
    describe: 'Generate captchas',
    builder: (yargs: Argv) => {
        return yargs
            .command(generateDistinct)
            .command(generateUnion)
            .demandCommand()
            .option('overwrite', {
                type: 'boolean',
                default: false,
                description: 'Overwrite the output file if it already exists',
            })
            .option('output', {
                type: 'string',
                demand: true,
                description: 'Path to the output file',
                default: 'captchas.json',
            })
            .option('labelled', {
                type: 'string',
                demand: true,
                description: 'Path to the file containing map of images urls to labels',
            })
            .option('unlabelled', {
                type: 'string',
                demand: true,
                description: 'Path to the file containing list of images url which are unlabelled',
            })
            .option('seed', {
                type: 'number',
                default: 0,
                description: 'Seed for the random number generator',
            })
            .option('size', {
                type: 'number',
                default: 0,
                description: 'Number of images in each captcha',
            })
            .options('labels', {
                type: 'string',
                description:
                    'Path to the labels file. This is a file containing a list of labels which unlabelled data will be assigned to.',
            })
            .options('host-prefix', {
                type: 'string',
                description: 'Prefix to add to the start of each image url',
            })
            .option('allow-duplicates', {
                type: 'boolean',
                default: false,
                description: 'Allow duplicates in the data (labelled and unlabelled)',
            })
            .option('allow-duplicates-labelled', {
                type: 'boolean',
                default: false,
                description: 'Allow duplicates in the labelled data',
            })
            .option('allow-duplicates-unlabelled', {
                type: 'boolean',
                default: false,
                description: 'Allow duplicates in the unlabelled data',
            })
    },
    handler: async (argv: ArgumentsCamelCase) => {
        throw new Error('Please specify a command')
    },
}

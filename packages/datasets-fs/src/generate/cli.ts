import { ArgumentsCamelCase, Argv } from 'yargs'
import { Logger } from '@prosopo/common'
import generateDistinct from './distinct/cli.js'
import generateUnion from './union/cli.js'

export default (cmdArgs?: { logger?: Logger }) => {
    return {
        command: 'generate',
        describe: 'Generate captchas',
        builder: (yargs: Argv) => {
            return yargs
                .command(generateDistinct(cmdArgs))
                .command(generateUnion(cmdArgs))
                .demandCommand()
                .option('overwrite', {
                    type: 'boolean',
                    description: 'Overwrite the output file if it already exists',
                })
                .option('out', {
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
                    description: 'Seed for the random number generator',
                })
                .option('size', {
                    type: 'number',
                    description: 'Number of images in each captcha',
                })
                .options('labels', {
                    type: 'string',
                    description:
                        'Path to the labels file. This is a file containing a list of labels which unlabelled data will be assigned to.',
                })
                .option('allow-duplicates', {
                    type: 'boolean',
                    description: 'Allow duplicates in the data (labelled and unlabelled)',
                })
                .option('allow-duplicates-labelled', {
                    type: 'boolean',
                    description: 'Allow duplicates in the labelled data',
                })
                .option('allow-duplicates-unlabelled', {
                    type: 'boolean',
                    description: 'Allow duplicates in the unlabelled data',
                })
        },
        handler: async (argv: ArgumentsCamelCase) => {
            throw new Error('Please specify a command')
        },
    }
}

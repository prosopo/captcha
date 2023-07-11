import generateDistinct from './distinct/cli.js'
import generateUnion from './union/cli.js'

export default {
    command: 'generate',
    describe: 'Generate captchas',
    builder: (yargs: any) => {
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
            .option('min-correct', {
                type: 'number',
                default: 0,
                description: 'Minimum number of target images in each captcha',
            })
            .option('max-correct', {
                type: 'number',
                default: 0,
                description: 'Maximum number of target images in each captcha',
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
    },
    handler: async (argv: any) => {
        throw new Error('Please specify a command')
    },
}

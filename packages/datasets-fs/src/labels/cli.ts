import { ArgumentsCamelCase, Argv } from 'yargs'
import { argsSchema } from './args.js'
import labels from './labels.js'

export default {
    command: 'labels',
    describe: 'get all labels from some data',
    builder: (yargs: Argv) => {
        return yargs.option('data', {
            type: 'string',
            demand: true,
            description: 'JSON file containing data',
        })
    },
    handler: async (argv: ArgumentsCamelCase) => {
        await labels(argsSchema.parse(argv))
    },
}

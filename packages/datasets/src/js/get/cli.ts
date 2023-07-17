import { ArgumentsCamelCase, Argv } from 'yargs'
import { argsSchema } from './args.js'
import scale from './get.js'

export default {
    command: 'get',
    describe: 'Test a GET request at image URLs',
    builder: (yargs: Argv) => {
        return yargs.option('data', {
            type: 'string',
            demand: true,
            description: 'JSON file containing urls under a "data" key',
        })
    },
    handler: async (argv: ArgumentsCamelCase) => {
        await scale(argsSchema.parse(argv))
    },
}

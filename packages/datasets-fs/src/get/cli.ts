import { ArgumentsCamelCase, Argv } from 'yargs'
import { Logger } from '@prosopo/common'
import { argsSchema } from './js.js'
import get from './js.js'

export default (cmdArgs?: { logger?: Logger }) => {
    return {
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
            await get(argsSchema.parse(argv), cmdArgs?.logger)
        },
    }
}

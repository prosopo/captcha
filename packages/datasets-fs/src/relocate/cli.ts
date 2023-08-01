import { ArgumentsCamelCase, Argv } from 'yargs'
import { Logger } from '@prosopo/common'
import { argsSchema } from './args.js'
import relocate from './relocate.js'

export default (cmdArgs?: { logger?: Logger }) => {
    return {
        command: 'relocate',
        describe:
            'Relocate a dataset by replacing the old urls with new ones. E.g. "example.com/1.jpg" to "newwebsite.com/1.jpg"',
        builder: (yargs: Argv) => {
            return yargs
                .option('from', {
                    type: 'string',
                    demand: true,
                    description: 'The old url to replace',
                })
                .option('to', {
                    type: 'string',
                    demand: true,
                    description: 'The new url to replace the old one with',
                })
                .option('data', {
                    type: 'string',
                    description: 'Path to the images JSON containing the urls of images to replace',
                })
        },
        handler: async (argv: ArgumentsCamelCase) => {
            await relocate(argsSchema.parse(argv), cmdArgs?.logger)
        },
    }
}

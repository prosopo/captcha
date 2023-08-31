import { ArgumentsCamelCase, Argv } from 'yargs'
import { Logger } from '@prosopo/common'
import { argsSchema } from './args.js'
import generate from './generate.js'

export default (cmdArgs?: { logger?: Logger }) => {
    return {
        command: 'distinct',
        describe:
            'Generate distinct captchas producing captcha challenges comprising 2 rounds, one labelled and one unlabelled',
        builder: (yargs: Argv) => {
            return yargs
                .option('solved', {
                    type: 'number',
                    description: 'Number of captchas to generate that are solved',
                })
                .option('unsolved', {
                    type: 'number',
                    description: 'Number of captchas to generate that are unsolved',
                })
                .option('min-correct', {
                    type: 'number',
                    description: 'Minimum number of target images in each captcha',
                })
                .option('max-correct', {
                    type: 'number',
                    description: 'Maximum number of target images in each captcha',
                })
        },
        handler: async (argv: ArgumentsCamelCase) => {
            await generate(argsSchema.parse(argv), cmdArgs?.logger)
        },
    }
}

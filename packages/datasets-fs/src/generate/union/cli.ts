import { ArgumentsCamelCase, Argv } from 'yargs'
import { Logger } from '@prosopo/common'
import { argsSchema } from './args.js'
import generate from './generate.js'

export default (cmdArgs?: { logger?: Logger }) => {
    return {
        command: 'union',
        describe:
            'Generate distinct captchas producing captcha challenges comprising one or more rounds, mixing labelled and unlabelled data into a single round',
        builder: (yargs: Argv) => {
            return yargs
                .option('count', {
                    type: 'number',
                    description: 'Number of captchas to generate',
                })
                .option('min-correct', {
                    type: 'number',
                    description: 'Minimum number of target images in each captcha',
                })
                .option('min-incorrect', {
                    type: 'number',
                    description: 'Minimum number of incorrect images in each captcha',
                })
                .option('min-labelled', {
                    type: 'number',
                    description: 'Minimum number of labelled images in each captcha',
                })
                .option('max-labelled', {
                    type: 'number',
                    description: 'Maximum number of labelled images in each captcha',
                })
        },
        handler: async (argv: ArgumentsCamelCase) => {
            await generate(argsSchema.parse(argv), cmdArgs?.logger)
        },
    }
}

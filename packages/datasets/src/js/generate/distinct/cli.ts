import { argsSchema } from './args'
import generate from './generate'
import yargs from 'yargs'

export default {
    command: 'distinct',
    describe:
        'Generate distinct captchas producing captcha challenges comprising 2 rounds, one labelled and one unlabelled',
    builder: (yargs: yargs.Argv) => {
        return yargs
            .option('solved', {
                type: 'number',
                default: 0,
                description: 'Number of captchas to generate that are solved',
            })
            .option('unsolved', {
                type: 'number',
                default: 0,
                description: 'Number of captchas to generate that are unsolved',
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
    },
    handler: async (argv: yargs.Argv) => {
        await generate(argsSchema.parse(argv))
    },
}

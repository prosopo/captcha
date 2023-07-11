import generate from './generate'

export default {
    command: 'distinct',
    describe:
        'Generate distinct captchas producing captcha challenges comprising 2 rounds, one labelled and one unlabelled',
    builder: (yargs: any) => {
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
    },
    handler: async (argv: any) => {
        await generate(argv)
    },
}

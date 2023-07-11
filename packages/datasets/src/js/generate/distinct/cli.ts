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
            .option('allow-duplicates', {
                type: 'boolean',
                default: false,
                description: 'Allow duplicates in the data (labelled and unlabelled)',
            })
            .option('allow-duplicates-labelled', {
                type: 'boolean',
                default: false,
                description: 'Allow duplicates in the labelled data',
            })
            .option('allow-duplicates-unlabelled', {
                type: 'boolean',
                default: false,
                description: 'Allow duplicates in the unlabelled data',
            })
    },
    handler: async (argv: any) => {
        await generate(argv)
    },
}

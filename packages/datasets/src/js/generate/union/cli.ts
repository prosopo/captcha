import generate from "./generate"

export default {
    command: "union",
    describe: "Generate distinct captchas producing captcha challenges comprising one or more rounds, mixing labelled and unlabelled data into a single round",
    builder: (yargs: any) => {
        return yargs
            .option("count", {
                type: "number",
                default: 0,
                description: "Number of captchas to generate",
            })
    },
    handler: async (argv: any) => {
        await generate(argv)
    },
}

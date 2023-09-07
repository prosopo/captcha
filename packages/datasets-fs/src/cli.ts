import { LogLevel, LogLevelSchema, getLogger } from '@prosopo/common'
import { hideBin } from 'yargs/helpers'
import esMain from 'es-main'
import flatten from './flatten/cli.js'
import generate from './generate/cli.js'
import get from './get/cli.js'
import labels from './labels/cli.js'
import process from 'process'
import relocate from './relocate/cli.js'
import scale from './scale/cli.js'
import yargs from 'yargs'
const dirname = process.cwd()
const logger = getLogger(LogLevelSchema.enum.Info, `${dirname}`)

const main = async () => {
    await yargs(hideBin(process.argv))
        .help()
        .option('log-level', {
            type: 'string',
            choices: Object.values(LogLevelSchema.enum),
            default: LogLevelSchema.enum.Info,
            description: 'The log level',
        })
        .middleware((argv) => {
            logger.setLogLevel(argv.logLevel as LogLevel)
        })
        .command(generate({ logger }))
        .command(flatten({ logger }))
        .command(scale({ logger }))
        .command(relocate({ logger }))
        .command(get({ logger }))
        .command(labels({ logger }))
        .strictCommands()
        .showHelpOnFail(false, 'Specify --help for available options')
        .fail(false)
        .parse()
}

//if main process
if (esMain(import.meta)) {
    main()
        .then(() => {
            logger.debug('done')
            process.exit(0)
        })
        .catch((err) => {
            logger.error('error:', err)
            process.exit(1)
        })
}

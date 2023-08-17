import { LogLevel, LogLevelSchema, getLogger } from '@prosopo/common'
import { fileURLToPath } from 'url'
import { hideBin } from 'yargs/helpers'
import flatten from './flatten/cli.js'
import generate from './generate/cli.js'
import get from './get/cli.js'
import labels from './labels/cli.js'
import process from 'process'
import relocate from './relocate/cli.js'
import scale from './scale/cli.js'
import yargs from 'yargs'
const logger = getLogger(LogLevelSchema.enum.Info, `${__dirname}/${__filename}`)

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
if (process.argv[1] === fileURLToPath(import.meta.url)) {
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

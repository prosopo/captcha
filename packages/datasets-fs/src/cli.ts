import { LogLevel, getLogger } from '@prosopo/common'
import { hideBin } from 'yargs/helpers'
import flatten from './flatten/cli'
import generate from './generate/cli'
import get from './get/cli'
import labels from './labels/cli'
import relocate from './relocate/cli'
import scale from './scale/cli'
import yargs from 'yargs'

const logger = getLogger(LogLevel.Info, `${__dirname}/${__filename}`)

const main = async () => {
    await yargs(hideBin(process.argv))
        .help()
        .option('log-level', {
            type: 'string',
            choices: Object.values(LogLevel),
            default: LogLevel.Info,
            description: 'The log level',
        })
        .middleware((argv) => {
            logger.setLogLevel(argv.logLevel as unknown as LogLevel)
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
if (typeof require !== 'undefined' && require.main === module) {
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

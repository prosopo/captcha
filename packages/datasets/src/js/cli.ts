// Take a set of data and generate a bunch of captchas

import { hideBin } from 'yargs/helpers'
import { lodash } from './util'
import consola, { LogLevels } from 'consola'
import flatten from './flatten/cli'
import generate from './generate/cli'
import relocate from './relocate/cli'
import scale from './scale/cli'
import yargs from 'yargs'

const _ = lodash()

const main = async () => {
    await yargs(hideBin(process.argv))
        .help()
        .option('logLevel', {
            type: 'string',
            description: 'Verbosity of logging',
        })
        .middleware((argv) => {
            consola.level = LogLevels[_.capitalize(argv.logLevel || 'log')] || LogLevels.log
        })
        .command(generate)
        .command(flatten)
        .command(scale)
        .command(relocate)
        .strictCommands()
        .showHelpOnFail(false, 'Specify --help for available options')
        .fail(false)
        .parse()
}

//if main process
if (typeof require !== 'undefined' && require.main === module) {
    main()
        .then(() => {
            console.log('done')
            process.exit(0)
        })
        .catch((err) => {
            console.error('error:', err)
            process.exit(1)
        })
}

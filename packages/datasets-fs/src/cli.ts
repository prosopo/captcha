// Take a set of data and generate a bunch of captchas

import { hideBin } from 'yargs/helpers'
import { lodash } from '@prosopo/util'
import consola, { LogTypes } from 'consola'
import flatten from './flatten/cli'
import generate from './generate/cli'
import get from './get/cli'
import labels from './labels/cli'
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
            consola.level = LogTypes[_.lowerCase(argv.logLevel || 'info')].level
        })
        .command(generate)
        .command(flatten)
        .command(scale)
        .command(relocate)
        .command(get)
        .command(labels)
        .strictCommands()
        .showHelpOnFail(false, 'Specify --help for available options')
        .fail(false)
        .parse()
}

//if main process
if (typeof require !== 'undefined' && require.main === module) {
    main()
        .then(() => {
            consola.log('done')
            process.exit(0)
        })
        .catch((err) => {
            consola.error('error:', err)
            process.exit(1)
        })
}

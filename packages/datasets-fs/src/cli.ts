// Take a set of data and generate a bunch of captchas

import { LogLevel, getLogger } from '@prosopo/common'
import { hideBin } from 'yargs/helpers'
import { lodash } from '@prosopo/util'
import flatten from './flatten/cli'
import generate from './generate/cli'
import get from './get/cli'
import labels from './labels/cli'
import relocate from './relocate/cli'
import scale from './scale/cli'
import yargs from 'yargs'

const _ = lodash()
const logger = getLogger(LogLevel.Info, `${__dirname}/${__filename}`)

const main = async () => {
    await yargs(hideBin(process.argv))
        .help()
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
            logger.log('done')
            process.exit(0)
        })
        .catch((err) => {
            logger.error('error:', err)
            process.exit(1)
        })
}

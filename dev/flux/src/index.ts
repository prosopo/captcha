import { LogLevel, getLogger } from '@prosopo/common'
import { commandAuth, commandDeploy, commandGetDapps } from './commands/index.js'
import { hideBin } from 'yargs/helpers'
import yargs from 'yargs'

const logger = getLogger(LogLevel.enum.info, 'CLI')

export default async function processArgs(args: string[]) {
    return yargs(hideBin(args))
        .usage('Usage: $0 [global options] <command> [options]')
        .command(commandAuth({ logger }))
        .command(commandDeploy({ logger }))
        .command(commandGetDapps({ logger }))
        .parse()
}

processArgs(process.argv)
    .then((result) => {
        logger.info(result)
    })
    .catch((error) => {
        logger.error(error)
    })

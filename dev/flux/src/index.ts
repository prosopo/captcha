import { LogLevel, getLogger } from '@prosopo/common'
import { commandAuth, commandDeploy, commandGetDapp, commandGetDapps, commandTerminal } from './commands/index.js'
import { hideBin } from 'yargs/helpers'
import yargs from 'yargs'

const logger = getLogger(LogLevel.enum.info, 'CLI')

export default async function processArgs(args: string[]) {
    return yargs(hideBin(args))
        .usage('Usage: $0 [global options] <command> [options]')
        .command(commandAuth({ logger }))
        .command(commandDeploy({ logger }))
        .command(commandGetDapp({ logger }))
        .command(commandGetDapps({ logger }))
        .command(commandTerminal({ logger }))
        .parse()
}

processArgs(process.argv)
    .then((result) => {
        logger.info(result)
    })
    .catch((error) => {
        logger.error(error)
    })

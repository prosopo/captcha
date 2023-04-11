import yargs from 'yargs'
import { deployProtocol } from '../deploy/index'
import { updateEnvFiles } from '../util/updateEnv'
import consola, { LogLevel } from 'consola'
export async function processArgs(args) {
    const parsed = await yargs.option('logLevel', {
        describe: 'set log level',
        choices: Object.keys(LogLevel),
    }).argv

    const logger = consola.create({ level: LogLevel[parsed.logLevel || 'Info'] })

    return yargs.usage('Usage: $0 [global options] <command> [options]').command(
        'deploy_protocol',
        'Register a Provider',
        (yargs) =>
            yargs.option('update_env', {
                type: 'boolean',
                demand: false,
                desc: 'Update env files with the new contract address',
                default: false,
            }),
        async (argv) => {
            const protocolContractAddress = await deployProtocol()
            logger.info('contract address', protocolContractAddress)
            if (argv.update_env) {
                await updateEnvFiles(
                    [
                        'PROTOCOL_CONTRACT_ADDRESS',
                        'REACT_APP_PROSOPO_CONTRACT_ADDRESS',
                        'NEXT_PUBLIC_PROSOPO_CONTRACT_ADDRESS',
                    ],
                    protocolContractAddress.toString(),
                    logger
                )
            }
        },
        []
    ).argv
}
processArgs(process.argv.slice(2))
    .then(() => {
        process.exit(0)
    })
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })

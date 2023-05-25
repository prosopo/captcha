import { loadEnv } from '@prosopo/cli'
import consola, { LogLevel } from 'consola'
import path from 'path'
import yargs from 'yargs'
import { deployDapp, deployProtocol } from '../contract/deploy/index'
import { setup } from '../setup/index'
import { updateEnvFiles } from '../util/updateEnv'
import { runTests } from '../test/index'
import fs from 'fs'
import { importContract } from '../contract'
const rootDir = path.resolve('.')

loadEnv(rootDir)

export async function processArgs(args) {
    const parsed = await yargs.option('logLevel', {
        describe: 'set log level',
        choices: Object.keys(LogLevel),
    }).argv

    const logger = consola.create({ level: LogLevel[parsed.logLevel || 'Info'] })

    yargs
        .usage('Usage: $0 [global options] <command> [options]')
        .command(
            'deploy_protocol',
            'Deploy the prosopo protocol contract',
            (yargs) =>
                yargs.option('update_env', {
                    type: 'boolean',
                    demand: false,
                    desc: 'Update env files with the new contract address',
                    default: false,
                }),
            async (argv) => {
                if (!process.env.PROTOCOL_WASM_PATH || !process.env.PROTOCOL_ABI_PATH) {
                    throw new Error('Missing protocol wasm or json path')
                }
                const protocolContractAddress = await deployProtocol(
                    process.env.PROTOCOL_WASM_PATH,
                    process.env.PROTOCOL_ABI_PATH
                )
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
        )
        .command(
            'deploy_dapp',
            'Deploy the prosopo dapp example contract',
            (yargs) =>
                yargs.option('update_env', {
                    type: 'boolean',
                    demand: false,
                    desc: 'Update env files with the new contract address',
                    default: false,
                }),
            async (argv) => {
                const dappContractAddress = await deployDapp()
                logger.info('contract address', dappContractAddress)
                if (argv.update_env) {
                    await updateEnvFiles(
                        [
                            'DAPP_CONTRACT_ADDRESS',
                            'REACT_APP_DAPP_CONTRACT_ADDRESS',
                            'NEXT_PUBLIC_DAPP_CONTRACT_ADDRESS',
                            'PROSOPO_SITE_KEY',
                        ],
                        dappContractAddress.toString(),
                        logger
                    )
                }
            },
            []
        )
        .command({
            command: 'setup',
            describe:
                'Setup the development environment by registering a provider, staking, loading a data set and then registering a dapp and staking.',
            handler: async () => {
                console.log('Running setup scripts')
                await setup()
            },
        })
        .command({
            command: 'test',
            describe: 'Run all of the tests in the workspace',
            handler: async () => {
                console.log('Running tests')
                await runTests()
            },
        })
        .command({
            command: 'import_contract',
            describe: 'Import a contract into the contract package.',
            builder: (yargs) =>
                yargs
                    .option('in', {
                        type: 'string',
                        demand: true,
                        desc: "The path to the contract's abi",
                    })
                    .option('out', {
                        type: 'string',
                        demand: true,
                        desc: 'The path to the output directory',
                    }),
            handler: async (argv) => {
                const abiPath = path.resolve(argv.in)
                if (!fs.existsSync(abiPath)) {
                    throw new Error(
                        `abiPath ${abiPath} does not exist. The command is running relative to the dev package.`
                    )
                }
                const outPath = path.resolve(argv.out)
                await importContract(abiPath, outPath)
            },
        })

    await yargs.parse()
}
processArgs(process.argv.slice(2))
    .then(() => {
        process.exit(0)
    })
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })

import { LogLevel, logger } from '@prosopo/common'
import { deployDapp, deployProtocol } from '../contract/deploy/index'
import { getLogLevel } from '@prosopo/cli'
import { importContract } from '../contract'
import { loadEnv } from '@prosopo/cli'
import { runTests } from '../test/index'
import { setup } from '../setup/index'
import { updateEnvFiles } from '../util/updateEnv'
import fs from 'fs'
import path from 'path'
import yargs from 'yargs'
const rootDir = path.resolve('.')

loadEnv(rootDir)

export async function processArgs(args) {
    const parsed = await yargs.option('logLevel', {
        describe: 'set log level',
        choices: Object.keys(LogLevel),
    }).argv

    const log = logger(getLogLevel(parsed.logLevel), 'CLI')

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
                if (!process.env.CAPTCHA_WASM_PATH || !process.env.CAPTCHA_ABI_PATH) {
                    throw new Error('Missing protocol wasm or json path')
                }
                const protocolContractAddress = await deployProtocol(
                    process.env.CAPTCHA_WASM_PATH,
                    process.env.CAPTCHA_ABI_PATH
                )
                log.info('contract address', protocolContractAddress)
                if (argv.update_env) {
                    await updateEnvFiles(
                        [
                            'PROTOCOL_CONTRACT_ADDRESS',
                            'REACT_APP_PROSOPO_CONTRACT_ADDRESS',
                            'NEXT_PUBLIC_PROSOPO_CONTRACT_ADDRESS',
                        ],
                        protocolContractAddress.toString(),
                        log
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
                log.info('contract address', dappContractAddress)
                if (argv.update_env) {
                    await updateEnvFiles(
                        [
                            'DAPP_CONTRACT_ADDRESS',
                            'REACT_APP_DAPP_CONTRACT_ADDRESS',
                            'NEXT_PUBLIC_DAPP_CONTRACT_ADDRESS',
                            'PROSOPO_SITE_KEY',
                        ],
                        dappContractAddress.toString(),
                        log
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
                log.info('Running setup scripts')
                await setup()
            },
        })
        .command({
            command: 'test',
            describe: 'Run all of the tests in the workspace',
            handler: async () => {
                log.info('Running tests')
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
                const cwd = path.resolve('.')
                if (!fs.existsSync(abiPath)) {
                    throw new Error(`abiPath ${abiPath} does not exist. The command is running relative to ${cwd}`)
                }
                const outPath = path.resolve(argv.out)
                // pass in relative path as typechain will resolve it relative to the cwd
                await importContract(argv.in, argv.out)
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

import { LogLevel, logger } from '@prosopo/common'
import { deployDapp, deployProtocol } from '../contract/deploy/index'
import { exec } from '../util'
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
                        ['DAPP_SITE_KEY', 'REACT_APP_DAPP_SITE_KEY', 'NEXT_PUBLIC_DAPP_SITE_KEY', 'PROSOPO_SITE_KEY'],
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
                process.exit(0)
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
        .command({
            command: 'import_all_contracts',
            describe: 'Update all contracts into the contract package.',
            builder: (yargs) => yargs,
            handler: async (argv) => {
                const contracts = ['captcha', 'proxy']
                for (const contract of contracts) {
                    const inDir = `../protocol/target/ink/${contract}`
                    const outDir = `../packages/contract/src/typechain/${contract}`
                    await exec(`mkdir -p ${outDir}`)
                    await exec(`mkdir -p ${inDir}`)
                    // console.log(`${outDir}`)
                    // console.log(`${inDir}`)
                    await exec(`node dist/cli/index.js import_contract --in=${inDir} --out=${outDir}`)
                    // console.log(`${path.resolve('../packages/contract/src/typechain/captcha/types-arguments')}`)
                    // console.log(`${path.resolve('../packages/types/src/contract/typechain/captcha/types-arguments')}`)
                    await exec(`mkdir -p ../packages/types/src/contract/typechain/captcha`)
                    await exec(
                        `cp -rv ../packages/contract/src/typechain/captcha/types-arguments ../packages/types/src/contract/typechain/captcha`
                    )
                    await exec(
                        `cp -rv ../packages/contract/src/typechain/captcha/types-returns ../packages/types/src/contract/typechain/captcha`
                    )
                }
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

// Copyright 2021-2023 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { LogLevel, getLogger } from '@prosopo/common'
import { deployDapp, deployProtocol } from '../contract/deploy/index.js'
import { exec } from '../util/index.js'
import { getContractNames, getPaths } from '@prosopo/config'
import { getLogLevel } from '@prosopo/common'
import { hideBin } from 'yargs/helpers'
import { importContract } from '../contract/index.js'
import { loadEnv } from '@prosopo/cli'
import { setup } from '../setup/index.js'
import { updateEnvFiles } from '../util/index.js'
import path from 'path'
import yargs from 'yargs'

const paths = getPaths()
const rootDir = path.resolve('.')

loadEnv(rootDir)

export async function processArgs(args: string[]) {
    const parsed = await yargs(hideBin(args)).option('logLevel', {
        describe: 'set log level',
        choices: Object.keys(LogLevel.enum),
    }).argv

    const log = getLogger(getLogLevel(parsed.logLevel), 'CLI')

    await yargs(hideBin(args))
        .usage('Usage: $0 [global options] <command> [options]')
        .command(
            'deploy_protocol',
            'Deploy the prosopo protocol contract',
            (yargs) =>
                yargs
                    .option('update_env', {
                        type: 'boolean',
                        demand: false,
                        desc: 'Update env files with the new contract address',
                        default: false,
                    })
                    .option('deployer', {
                        type: 'string',
                        demand: false,
                        desc: `The account prefix that will deploy the contract. Specifying PROVIDER will cause the 
                        script to look for PROVIDER_JSON in the env file. Specifying DEPLOYER will cause the script to 
                        look for DEPLOYER_JSON in the env file. Defaults to undefined.`,
                        default: undefined,
                    }),
            async (argv) => {
                if (!process.env.CAPTCHA_WASM_PATH || !process.env.CAPTCHA_ABI_PATH) {
                    throw new Error('Missing protocol wasm or json path')
                }
                const protocolContractAddress = await deployProtocol(
                    process.env.CAPTCHA_WASM_PATH,
                    process.env.CAPTCHA_ABI_PATH,
                    argv.deployer
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
            builder: (yargs) =>
                yargs.option('force', {
                    type: 'boolean',
                    demand: false,
                    desc: 'Force provider re-registration and dataset setup',
                }),

            handler: async (argv) => {
                log.info('Running setup scripts')
                await setup(argv.force)
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
                await importContract(argv.in, argv.out)
            },
        })
        .command({
            command: 'import_all_contracts',
            describe: 'Update all contracts into the contract package.',
            builder: (yargs) => yargs,
            handler: async (argv) => {
                const contracts = getContractNames()
                for (const contract of contracts) {
                    const inDir = `${paths.protocolDist}/${contract}`
                    await exec(`node dist/cli/index.js import_contract --in=${inDir} --out=${paths.contractPackagesDir}/${contract}/src`)
                }
            },
        }).argv
}
processArgs(process.argv)
    .then(() => {
        process.exit(0)
    })
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })

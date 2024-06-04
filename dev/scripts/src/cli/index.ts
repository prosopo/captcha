// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import { NetworkConfigSchema, NetworkNamesSchema, networks as getNetworks } from '@prosopo/types'
import { decodeOutput } from '@prosopo/procaptcha-common'
import { deployDapp, deployProtocol } from '../contract/deploy/index.js'
import { exec } from '../util/index.js'
import { run as fundDapps } from '../contract/fundDapps.js'
import { get } from '@prosopo/util'
import { getContractNames, getContractsDir, getProtocolDistDir, getScriptsPkgDir } from '@prosopo/config'
import { getEnv, loadEnv } from '@prosopo/cli'
import { getLogLevel } from '@prosopo/common'
import { hideBin } from 'yargs/helpers'
import { importContract } from '../contract/index.js'
import { isHex } from '@polkadot/util'
import { setup } from '../setup/index.js'
import { run as transferContract } from '../contract/transferContract.js'
import { updateEnvFiles } from '../util/index.js'
import path from 'path'
import setVersion from '../scripts/setVersion.js'
import yargs from 'yargs'
import z from 'zod'
const rootDir = path.resolve('.')

loadEnv(rootDir)

const TransferNetworkSchema = z.object({
    network: z.string(),
    address: z.string(),
})

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
                        demandOption: false,
                        desc: 'Update env files with the new contract address',
                        default: false,
                    })
                    .option('deployer', {
                        type: 'string',
                        demandOption: false,
                        desc: `The account prefix that will deploy the contract. Specifying PROVIDER will cause the 
                        script to look for PROVIDER_JSON in the env file. Specifying DEPLOYER will cause the script to 
                        look for DEPLOYER_JSON in the env file. Defaults to undefined.`,
                        default: undefined,
                    })
                    .option('cwd', {
                        type: 'string',
                        demandOption: false,
                        desc: `The working directory from which env files will be updated`,
                        default: undefined,
                    }),
            async (argv) => {
                const protocolContractAddress = await deployProtocol(
                    process.env.PROSOPO_CAPTCHA_WASM_PATH,
                    process.env.PROSOPO_CAPTCHA_ABI_PATH,
                    argv.deployer
                )

                log.info('contract address', protocolContractAddress)
                if (argv.update_env) {
                    await updateEnvFiles(
                        ['PROSOPO_CONTRACT_ADDRESS', 'NEXT_PUBLIC_PROSOPO_CONTRACT_ADDRESS'],
                        protocolContractAddress.toString(),
                        log,
                        argv.cwd
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
                    demandOption: false,
                    desc: 'Update env files with the new contract address',
                    default: false,
                }),
            async (argv) => {
                const dappContractAddress = await deployDapp()
                log.info('contract address', dappContractAddress)
                if (argv.update_env) {
                    await updateEnvFiles(
                        ['PROSOPO_SITE_KEY', 'NEXT_PUBLIC_PROSOPO_SITE_KEY'],
                        dappContractAddress.toString(),
                        log
                    )
                }
            },
            []
        )
        .command(
            'create_env_files',
            'Copies the env.xyz files to .env.xyz',
            (yargs) => yargs,
            async () => {
                const env = getEnv()
                const scripts = getScriptsPkgDir()
                await exec(`cp -v ${scripts}/env.${env} ${scripts}/.env.${env}`)
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
                    demandOption: false,
                    desc: 'Force provider re-registration and dataset setup',
                }),

            handler: async (argv) => {
                log.info('Running setup scripts')
                await setup(!!argv.force)
            },
        })
        .command({
            command: 'import_contract',
            describe: 'Import a contract into the contract package.',
            builder: (yargs) =>
                yargs
                    .option('in', {
                        type: 'string',
                        demandOption: true,
                        desc: "The path to the contract's abi",
                    })
                    .option('out', {
                        type: 'string',
                        demandOption: true,
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
            handler: async () => {
                const contracts = getContractNames()
                for (const contract of contracts) {
                    const inDir = `${getProtocolDistDir()}/${contract}`
                    await exec(
                        `node dist/cli/index.js import_contract --in=${inDir} --out=${getContractsDir()}/${contract}/src`
                    )
                }
            },
        })
        .command({
            command: 'fund_dapps',
            describe: 'Fund the dapps if they are unfunded',
            builder: (yargs) => yargs,
            handler: async () => {
                const atlasUri = process.env._DEV_ONLY_ATLAS_URI
                fundDapps(atlasUri)
                    .then((result) => {
                        log.info(result)
                        process.exit(0)
                    })
                    .catch((e) => {
                        console.error(e)
                        process.exit(1)
                    })
            },
        })
        .command({
            command: 'transfer_contract',
            describe: 'Transfer dapps and providers from one contract to another',
            builder: (yargs) =>
                yargs
                    .option('transfer-from', {
                        type: 'string',
                        demandOption: true,
                        desc: 'The name of the network and the contract address to transfer from `{ network, address }`',
                    })
                    .option('transfer-to', {
                        type: 'string',
                        demandOption: false,
                        desc: 'The name of the network and the contract address to transfer to `{ network, address }`',
                    })
                    .option('transfer-providers', {
                        type: 'boolean',
                        demandOption: true,
                        desc: 'Whether to transfer providers or not',
                        default: false,
                    })
                    .option('transfer-dapps', {
                        type: 'boolean',
                        demandOption: true,
                        desc: 'Whether to transfer dapps or not',
                        default: false,
                    }),
            handler: async (argv) => {
                log.debug(argv)
                const atlasUri = process.env._DEV_ONLY_ATLAS_URI
                const transferFrom = TransferNetworkSchema.parse(JSON.parse(argv.transferFrom))
                const networks = getNetworks()
                const transferFromNetworkName = NetworkNamesSchema.parse(transferFrom.network)
                const transferFromNetwork = NetworkConfigSchema.parse(get(networks, transferFrom.network))
                transferFromNetwork.contract.address = transferFrom.address
                let transferToNetwork = undefined
                let transferToNetworkName = undefined
                // Defaults to transferring to the network defined by env
                if (argv.transferTo !== undefined) {
                    const transferTo = TransferNetworkSchema.parse(JSON.parse(argv.transferFrom))
                    transferToNetwork = NetworkConfigSchema.parse(get(networks, transferTo.network))
                    transferToNetwork.contract.address = transferFrom.address
                    transferToNetworkName = NetworkNamesSchema.parse(transferToNetworkName)
                }
                const transferConfig = { dapps: argv.transferDapps, providers: argv.transferProviders }
                await transferContract(
                    transferFromNetworkName,
                    transferFromNetwork,
                    transferConfig,
                    transferToNetworkName,
                    transferToNetwork,
                    atlasUri
                )
            },
        })
        .command({
            command: 'version',
            describe: 'Set the version of packages',
            builder: (yargs) => yargs.option('v', { type: 'string', demandOption: true }),
            handler: async (argv) => {
                await setVersion(String(argv.v))
            },
        })
        .command({
            command: 'token <tokenHex>',
            describe: 'Decode a Procaptcha token to the JSON output format',
            builder: (yargs) =>
                yargs.positional('tokenHex', {
                    describe: 'a Procaptcha token to decode',
                    type: 'string',
                    demandOption: true,
                }),
            handler: async (argv) => {
                if (!isHex(argv.tokenHex)) {
                    log.error('Token must be a hex string')
                    process.exit(1)
                }
                log.info(decodeOutput(argv.tokenHex))
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

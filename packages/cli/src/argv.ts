// Copyright 2021-2022 Prosopo (UK) Ltd.
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

import { BatchCommitments } from '@prosopo/provider'
import { CalculateSolutionsTask } from '@prosopo/provider'
import { Compact, u128 } from '@polkadot/types'
import { PayeeSchema } from '@prosopo/types'
import { ProsopoEnvError, logger as getLogger } from '@prosopo/common'
import { ProviderEnvironment } from '@prosopo/types-env'
import { Tasks } from '@prosopo/provider'
import { cwd } from 'process'
import { encodeStringAddress } from '@prosopo/provider'
import { hexToU8a } from '@polkadot/util'
import { loadJSONFile } from './files'
import { stringToHexPadded, wrapQuery } from '@prosopo/contract'
import parser from 'cron-parser'
import pm2 from 'pm2'
const yargs = require('yargs')

const validateAddress = (argv) => {
    const address = encodeStringAddress(argv.address as string)

    return { address }
}

const validateContract = (argv) => {
    const address = encodeStringAddress(argv.contract as string)

    return { address }
}

const validatePayee = (argv) => {
    try {
        if (!argv.payee) return
        const payeeArg: string = argv.payee[0].toUpperCase() + argv.payee.slice(1).toLowerCase() || ''
        const payee = PayeeSchema.parse(payeeArg)

        return { payee }
    } catch (error) {
        throw new ProsopoEnvError(error, 'CLI.PARAMETER_ERROR', {}, [argv.payee])
    }
}

const validateValue = (argv) => {
    if (typeof argv.value !== 'number') {
        throw new ProsopoEnvError('CLI.PARAMETER_ERROR', validateValue.name, {}, argv.value)
    }
    const value: Compact<u128> = argv.value as Compact<u128>
    return { value }
}

const validateScheduleExpression = (argv) => {
    if (typeof argv.schedule === 'string') {
        const result = parser.parseString(argv.schedule as string)

        if (argv.schedule in result.errors) {
            throw new ProsopoEnvError('CLI.PARAMETER_ERROR', validateScheduleExpression.name, {}, [argv.schedule])
        }

        return { schedule: argv.schedule as string }
    } else {
        return { schedule: null }
    }
}

export function processArgs(args, env: ProviderEnvironment) {
    const tasks = new Tasks(env)
    const logger = getLogger(env.config.logLevel, 'CLI')
    return yargs
        .usage('Usage: $0 [global options] <command> [options]')
        .option('api', { demand: false, default: false, type: 'boolean' })
        .command(
            'provider_register',
            'Register a Provider',
            (yargs) =>
                yargs
                    .option('url', {
                        type: 'string',
                        demand: true,
                        desc: 'The provider service origin (URI)',
                    })
                    .option('fee', {
                        type: 'number',
                        demand: true,
                        desc: 'The fee to pay per solved captcha',
                    })
                    .option('payee', {
                        type: 'string',
                        demand: true,
                        desc: 'The person who receives the fee (`Provider` or `Dapp`)',
                    }),
            async (argv) => {
                const providerRegisterArgs: Parameters<typeof tasks.contract.query.providerRegister> = [
                    Array.from(hexToU8a(stringToHexPadded(argv.url))),
                    argv.fee,
                    argv.payee,
                    {
                        value: 0,
                    },
                ]
                await wrapQuery(tasks.contract.query.providerRegister, tasks.contract.query)(...providerRegisterArgs)
                const result = await tasks.contract.tx.providerRegister(...providerRegisterArgs)

                logger.info(JSON.stringify(result, null, 2))
            },
            [validatePayee]
        )
        .command(
            'provider_update',
            'Update a Provider',
            (yargs) =>
                yargs
                    .option('url', {
                        type: 'string',
                        demand: false,
                        desc: 'The provider service origin (URI)',
                    })
                    .option('fee', {
                        type: 'number',
                        demand: false,
                        desc: 'The fee to pay per solved captcha',
                    })
                    .option('payee', {
                        type: 'string',
                        demand: false,
                        desc: 'The person who receives the fee (`Provider` or `Dapp`)',
                    })
                    .option('value', {
                        type: 'number',
                        demand: false,
                        desc: 'The value to stake in the contract',
                    }),
            async (argv) => {
                const provider = (await tasks.contract.query.getProvider(argv.address, {})).value.unwrap().unwrap()
                if (provider && (argv.url || argv.fee || argv.payee || argv.value)) {
                    const result = await tasks.contract.tx.providerUpdate(
                        argv.url || provider.url,
                        argv.fee || provider.fee,
                        argv.payee || provider.payee,
                        argv.value || 0
                    )

                    logger.info(JSON.stringify(result, null, 2))
                }
            },
            [validateAddress, validatePayee]
        )
        .command(
            'provider_deregister',
            'Deregister a Provider',
            (yargs) =>
                yargs.option('address', {
                    type: 'string',
                    demand: true,
                    desc: 'The AccountId of the Provider',
                }),
            async (argv) => {
                try {
                    await tasks.contract.tx.providerDeregister(argv.address)

                    logger.info('Provider registered')
                } catch (err) {
                    logger.error(err)
                }
            },
            [validateAddress]
        )
        .command(
            'provider_set_data_set',
            'Add a dataset as a Provider',
            (yargs) =>
                yargs.option('file', {
                    type: 'string',
                    demand: true,
                    desc: 'The file path of a JSON dataset file',
                }),
            async (argv) => {
                try {
                    const jsonFile = loadJSONFile(argv.file, logger) as JSON
                    const result = await tasks.providerSetDatasetFromFile(jsonFile)

                    logger.info(JSON.stringify(result, null, 2))
                } catch (err) {
                    logger.error(err)
                }
            },
            []
        )
        .command(
            'dapp_register',
            'Register a Dapp',
            (yargs) =>
                yargs
                    .option('contract', {
                        type: 'string',
                        demand: true,
                        desc: 'The AccountId of the Dapp',
                    })
                    .option('payee', {
                        type: 'string',
                        demand: true,
                        desc: 'The person who receives the fee (`Provider` or `Dapp`)',
                    }),
            async (argv) => {
                const dappRegisterArgs: Parameters<typeof tasks.contract.query.dappRegister> = [
                    argv.contract,
                    argv.payee,
                    {
                        value: 0,
                    },
                ]
                await wrapQuery(tasks.contract.query.dappRegister, tasks.contract.query)(...dappRegisterArgs)
                const result = await tasks.contract.tx.dappRegister(...dappRegisterArgs)

                logger.info(JSON.stringify(result, null, 2))
            },
            [validateContract, validatePayee]
        )
        .command(
            'dapp_update',
            'Register a Dapp',
            (yargs) =>
                yargs
                    .option('contract', {
                        type: 'string',
                        demand: true,
                        desc: 'The AccountId of the Dapp',
                    })
                    .option('payee', {
                        type: 'string',
                        demand: true,
                        desc: 'The person who receives the fee (`Provider` or `Dapp`)',
                    }),
            async (argv) => {
                const stakeThreshold = (await tasks.contract.query.getDappStakeThreshold({})).value.unwrap()
                const dappRegisterArgs: Parameters<typeof tasks.contract.query.dappUpdate> = [
                    argv.contract,
                    argv.payee,
                    argv.owner,
                    {
                        value: stakeThreshold.toNumber(),
                    },
                ]
                await wrapQuery(tasks.contract.query.dappUpdate, tasks.contract.query)(...dappRegisterArgs)
                const result = await tasks.contract.tx.dappUpdate(...dappRegisterArgs)

                logger.info(JSON.stringify(result, null, 2))
            },
            [validateContract, validatePayee]
        )
        .command(
            'provider_accounts',
            'List all provider accounts',
            (yargs) => yargs,
            async () => {
                try {
                    const result = await tasks.contract.contract['providerAccounts']()

                    logger.info(JSON.stringify(result, null, 2))
                } catch (err) {
                    logger.error(err)
                }
            },
            []
        )
        .command(
            'dapp_accounts',
            'List all dapp accounts',
            (yargs) => yargs,
            async () => {
                try {
                    const result = await tasks.contract.contract['dappAccounts']()

                    logger.info(JSON.stringify(result, null, 2))
                } catch (err) {
                    logger.error(err)
                }
            },
            []
        )
        .command(
            'provider_details',
            'List details of a single Provider',
            (yargs) =>
                yargs.option('address', {
                    type: 'string',
                    demand: true,
                    desc: 'The AccountId of the Provider',
                }),
            async (argv) => {
                try {
                    const result = (await tasks.contract.query.getProvider(argv.address, {})).value.unwrap().unwrap()

                    logger.info(JSON.stringify(result, null, 2))
                } catch (err) {
                    logger.error(err)
                }
            },
            [validateAddress]
        )
        .command(
            'dapp_details',
            'List details of a single Dapp',
            (yargs) =>
                yargs.option('address', {
                    type: 'string',
                    demand: true,
                    desc: 'The AccountId of the Dapp',
                }),
            async (argv) => {
                try {
                    const result = (await tasks.contract.query.getDapp(argv.address)).value.unwrap().unwrap()

                    logger.info(JSON.stringify(result, null, 2))
                } catch (err) {
                    logger.error(err)
                }
            },
            [validateAddress]
        )
        .command(
            'calculate_captcha_solutions',
            'Calculate captcha solutions',
            (yargs) =>
                yargs.option('schedule', {
                    type: 'string',
                    demand: false,
                    desc: 'A Recurring schedule expression',
                }),
            async (argv) => {
                if (argv.schedule) {
                    pm2.connect((err) => {
                        if (err) {
                            console.error(err)
                            process.exit(2)
                        }

                        pm2.start(
                            {
                                script: `ts-node scheduler.js ${JSON.stringify(argv.schedule)}`,
                                name: 'scheduler',
                                cwd: cwd() + '/dist/src',
                            },
                            (err, apps) => {
                                if (err) {
                                    console.error(err)

                                    return pm2.disconnect()
                                }

                                logger.info(apps)
                                process.exit()
                            }
                        )
                    })
                } else {
                    const calculateSolutionsTask = new CalculateSolutionsTask(env)
                    const result = await calculateSolutionsTask.calculateCaptchaSolutions()
                    logger.info(`Updated ${result} captcha solutions`)
                }
            },
            [validateScheduleExpression]
        )
        .command(
            'batch_commit',
            'Batch commit user solutions to contract',
            (yargs) =>
                yargs.option('schedule', {
                    type: 'string',
                    demand: false,
                    desc: 'A Recurring schedule expression',
                }),
            async (argv) => {
                if (argv.schedule) {
                    pm2.connect((err) => {
                        if (err) {
                            console.error(err)
                            process.exit(2)
                        }

                        pm2.start(
                            {
                                script: `ts-node scheduler.js ${JSON.stringify(argv.schedule)}`,
                                name: 'scheduler',
                                cwd: cwd() + '/dist/src',
                            },
                            (err, apps) => {
                                if (err) {
                                    console.error(err)

                                    return pm2.disconnect()
                                }

                                logger.info(apps)
                                process.exit()
                            }
                        )
                    })
                } else {
                    if (env.db) {
                        const batchCommitter = new BatchCommitments(
                            env.config.batchCommit,
                            env.contractInterface,
                            env.db,
                            2,
                            0n,
                            env.logger
                        )
                        const result = await batchCommitter.runBatch()
                        logger.info(`Batch commit complete: ${result}`)
                    } else {
                        logger.error('No database configured')
                    }
                }
            },
            [validateScheduleExpression]
        ).argv
}

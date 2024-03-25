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
import { Abi } from '@polkadot/api-contract/Abi'
import { AccountKey, IDatabaseAccounts, exportDatabaseAccounts } from './DatabaseAccounts.js'
import { DappAbiJSON, DappWasm } from './dapp-example-contract/loadFiles.js'
import { KeyringPair } from '@polkadot/keyring/types'
import { LogLevel, Logger, ProsopoDBError, getLogLevel } from '@prosopo/common'
import { ProsopoConfigOutput } from '@prosopo/types'
import { ProviderEnvironment } from '@prosopo/env'
import { defaultConfig, loadEnv } from '@prosopo/cli'
import { get, isMain } from '@prosopo/util'
import { getLogger } from '@prosopo/common'
import { getPairAsync } from '@prosopo/contract'
import DatabasePopulator, { IDatabasePopulatorMethodNames } from './DatabasePopulator.js'

loadEnv('../../dev/scripts')

const logger = getLogger(process.env.PROSOPO_LOG_LEVEL || LogLevel.Values.info, 'populateDatabase.ts')
const msToSecString = (ms: number) => `${Math.round(ms / 100) / 10}s`

export type UserCount = {
    [key in AccountKey]: number
}

export type UserFund = {
    [key in AccountKey]: boolean
}

export const userFundMapDefault: UserFund = {
    [AccountKey.providers]: true,
    [AccountKey.providersWithStake]: true,
    [AccountKey.providersWithStakeAndDataset]: true,
    [AccountKey.dapps]: true,
    [AccountKey.dappsWithStake]: true,
    [AccountKey.dappUsers]: true,
}

const userPopulatorMethodMap: {
    [key in AccountKey]: IDatabasePopulatorMethodNames
} = {
    [AccountKey.providers]: IDatabasePopulatorMethodNames.registerProvider,
    [AccountKey.providersWithStake]: IDatabasePopulatorMethodNames.registerProviderWithStake,
    [AccountKey.providersWithStakeAndDataset]: IDatabasePopulatorMethodNames.registerProviderWithStakeAndDataset,
    [AccountKey.dapps]: IDatabasePopulatorMethodNames.registerDapp,
    [AccountKey.dappsWithStake]: IDatabasePopulatorMethodNames.registerDappWithStake,
    [AccountKey.dappUsers]: IDatabasePopulatorMethodNames.registerDappUser,
}

const DEFAULT_USER_COUNT: UserCount = {
    [AccountKey.providers]: 20,
    [AccountKey.providersWithStake]: 20,
    [AccountKey.providersWithStakeAndDataset]: 20,
    [AccountKey.dapps]: 20,
    [AccountKey.dappsWithStake]: 20,
    [AccountKey.dappUsers]: 0,
}

async function populateStep(
    databasePopulator: DatabasePopulator,
    key: IDatabasePopulatorMethodNames,
    fund: boolean,
    text: string,
    userCount: number,
    logger: Logger
) {
    const startDate = Date.now()
    logger.debug(text)

    const dummyArray = new Array(userCount).fill(userCount)
    const accountPromises = dummyArray.map(() => () => databasePopulator[key](fund))
    await Promise.all(accountPromises.map((promise) => promise()))
    const time = Date.now() - startDate
    logger.debug(` [ ${msToSecString(time)} ]\n`)
}

export async function populateDatabase(
    env: ProviderEnvironment,
    userCounts: UserCount,
    fundMap: UserFund,
    exportData: boolean,
    dappAbi: Abi,
    dappWasm: Uint8Array,
    logLevel?: LogLevel
): Promise<IDatabaseAccounts> {
    env.logger.debug('Starting database populator...')
    const databasePopulator = new DatabasePopulator(env, dappAbi, dappWasm, logLevel)
    await databasePopulator.isReady()

    const userPromises = Object.entries(userCounts).map(async ([userType, userCount]) => {
        if (userCount > 0) {
            env.logger.debug(`Fund ${userType}`, get(fundMap, userType))
            await populateStep(
                databasePopulator,
                get(userPopulatorMethodMap, userType),
                get(fundMap, userType),
                `Running ${userType}...`,
                userCount,
                env.logger
            )
        }
    })
    try {
        await Promise.all(userPromises)
    } catch (error) {
        throw new ProsopoDBError('DATABASE.DATABASE_IMPORT_FAILED', {
            context: { error, failedFuncName: populateDatabase.name },
        })
    }

    if (exportData) {
        env.logger.info('Exporting accounts...')
        await exportDatabaseAccounts(databasePopulator)
    }
    return databasePopulator
}

export default async function run(pair: KeyringPair, config: ProsopoConfigOutput, logLevel?: LogLevel) {
    const dappAbiMetadata = await DappAbiJSON()
    const dappWasm = await DappWasm()

    await populateDatabase(
        new ProviderEnvironment(config, pair),
        DEFAULT_USER_COUNT,
        userFundMapDefault,
        true,
        dappAbiMetadata,
        dappWasm,
        logLevel
    )
}

//if main process
if (isMain(import.meta.url, 'provider')) {
    const startDate = Date.now()
    const config = defaultConfig()
    const secret = '//Alice'
    const pair = await getPairAsync(config.networks[config.defaultNetwork], secret)
    const logLevel = getLogLevel()
    run(pair, config, logLevel)
        .then(() => console.log(`Database population successful after ${msToSecString(Date.now() - startDate)}`))
        .finally(() => process.exit())
        .catch((error) => {
            logger.error(error)
        })
}

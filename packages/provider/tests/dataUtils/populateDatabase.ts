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
import { promiseQueue } from '../../src/util'
import { AccountKey, IDatabaseAccounts, exportDatabaseAccounts } from './DatabaseAccounts'
import DatabasePopulator, { IDatabasePopulatorMethodNames } from './DatabasePopulator'
import { Environment, loadEnv } from '../../src/env'
import { ProsopoEnvironment } from '../../src/types'
import consola from 'consola'
import { ProsopoEnvError } from '@prosopo/common'

loadEnv()

const msToSecString = (ms: number) => `${Math.round(ms / 100) / 10}s`

export type UserCount = {
    [key in AccountKey]: number
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
    text: string,
    userCount: number,
    logger: typeof consola
) {
    const startDate = Date.now()
    logger.debug(text)

    const dummyArray = new Array(userCount).fill(userCount)
    const promise = await promiseQueue(dummyArray.map(() => () => databasePopulator[key]()))
    const time = Date.now() - startDate

    logger.debug(` [ ${msToSecString(time)} ]\n`)

    ///console.log('promiseQueue:', promise)
    promise
        .filter(({ error }) => error)
        .forEach(({ error }) => {
            if (error) {
                throw new ProsopoEnvError(error)
            }
        })
}

export async function populateDatabase(
    env: ProsopoEnvironment,
    userCounts: UserCount,
    exportData: boolean
): Promise<IDatabaseAccounts> {
    env.logger.info('Starting database populator...')
    const databasePopulator = new DatabasePopulator(env)
    await databasePopulator.isReady()
    const userPromises = Object.entries(userCounts).map(async ([userType, userCount]) => {
        if (userCount > 0) {
            await populateStep(
                databasePopulator,
                userPopulatorMethodMap[userType],
                `Running ${userType}...`,
                userCount,
                env.logger
            )
        }
    })
    try {
        const promiseResult = await Promise.all(userPromises)
    } catch (e) {
        throw new Error(e)
    }

    if (exportData) {
        env.logger.info('Exporting accounts...')
        await exportDatabaseAccounts(databasePopulator)
    }
    return databasePopulator
}

if (require.main === module) {
    const startDate = Date.now()
    if (!process.env.PROVIDER_MNEMONIC) {
        throw new Error('Please set PROVIDER_MNEMONIC in your environment')
    }
    populateDatabase(new Environment(process.env.PROVIDER_MNEMONIC || ''), DEFAULT_USER_COUNT, true)
        .then(() => console.log(`Database population successful after ${msToSecString(Date.now() - startDate)}`))
        .finally(() => process.exit())
}

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
import { Dapp, DappPayee, GovernanceStatus, Payee, Provider } from '@prosopo/captcha-contract'
import { EmailModelSchema, Emails } from './fundDapps.js'
import { LogLevel, getLogger } from '@prosopo/common'
import { NetworkConfig } from '@prosopo/types'
import { ProviderEnvironment } from '@prosopo/env'
import { ReturnNumber } from '@prosopo/typechain-types'
import { Tasks } from '@prosopo/provider'
import { TransactionQueue, submitTx } from '@prosopo/tx'
import { defaultConfig } from '@prosopo/cli'
import { getPairAsync, wrapQuery } from '@prosopo/contract'
import mongoose, { Model } from 'mongoose'

const log = getLogger(LogLevel.enum.info, 'scripts.transferContract')

let EmailsModel: typeof Model<Emails>
try {
    EmailsModel = mongoose.model('emails')
} catch (error) {
    EmailsModel = mongoose.model('emails', EmailModelSchema)
}

const getAllMongoDapps = async (atlasUri: string) => {
    await mongoose
        .connect(atlasUri, { dbName: 'prosopo' })
        .then(() => console.log('Connected to MongoDB Atlas'))
        .catch((err) => console.error('Error connecting to MongoDB:', err))

    return await EmailsModel.find({}).exec()
}

// Doesn't work
// const getAllContractDapps = async () => {
// const config = defaultConfig()
// const network = config.networks[config.defaultNetwork]
// const secret = config.account.secret
// const pair = await getPairAsync(network, secret)
// const env = new ProviderEnvironment(config, pair)
// await env.isReady()
// const tasks = new Tasks(env)

// const dapps = await (tasks.contract.contract as any)['dappContracts']()

// return dapps
// }

// Function to register all dapps in contract
const registerDapps = async (addresses: string[], transferTo?: NetworkConfig, accountPrefix?: string) => {
    const config = defaultConfig(undefined, undefined, undefined, undefined, accountPrefix)
    const network = transferTo || config.networks[config.defaultNetwork]
    const secret = config.account.secret

    const pair = await getPairAsync(network, secret)

    const env = new ProviderEnvironment(config, pair)
    await env.isReady()
    const queue = new TransactionQueue(env.getApi(), pair, config.logLevel)
    const tasks = new Tasks(env)
    const dappStakeDefaultPromise: Promise<ReturnNumber> = wrapQuery(
        env.getContractInterface().query.getDappStakeThreshold,
        env.getContractInterface().query
    )()
    const dappStakeDefault = (await dappStakeDefaultPromise).rawNumber

    for (const addressToRegister of addresses) {
        try {
            // errors if the dapp does not exist
            await wrapQuery(tasks.contract.query.getDapp, tasks.contract.query)(addressToRegister)
        } catch (e) {
            log.info('   - dappRegister', addressToRegister)
            await submitTx(queue, tasks.contract, 'dappRegister', [addressToRegister, DappPayee.dapp], dappStakeDefault)
        }
    }
}

// Function to get all provider details
const getAllProviders = async () => {
    const config = defaultConfig()
    const network = config.networks[config.defaultNetwork]
    const secret = config.account.secret
    const pair = await getPairAsync(network, secret)
    const env = new ProviderEnvironment(config, pair)
    await env.isReady()
    const providers: Promise<Provider[]> = wrapQuery(
        env.getContractInterface().query.listProvidersByStatus,
        env.getContractInterface().query
    )([GovernanceStatus.active])
    return providers
}

// Function to register all providers in contract
const registerProviders = async (addresses: string[], transferTo?: NetworkConfig, accountPrefix?: string) => {
    const config = defaultConfig(undefined, undefined, undefined, undefined, accountPrefix)
    const network = transferTo || config.networks[config.defaultNetwork]
    const secret = config.account.secret

    const pair = await getPairAsync(network, secret)

    const env = new ProviderEnvironment(config, pair)
    await env.isReady()
    const queue = new TransactionQueue(env.getApi(), pair, config.logLevel)
    const tasks = new Tasks(env)
    const providerStakeDefaultPromise: Promise<ReturnNumber> = wrapQuery(
        env.getContractInterface().query.getProviderStakeThreshold,
        env.getContractInterface().query
    )()
    const providerStakeDefault = (await providerStakeDefaultPromise).rawNumber

    for (const addressToRegister of addresses) {
        await submitTx(queue, tasks.contract, 'providerRegister', [addressToRegister, Payee.dapp], providerStakeDefault)
    }
}

export const run = async (
    transferFrom: NetworkConfig,
    transferConfig: {
        dapps: boolean
        providers: boolean
    },
    transferTo?: NetworkConfig,
    atlasUri?: string
) => {
    if (!atlasUri) {
        throw new Error('Atlas URI not found in env')
    }
    if (transferConfig.dapps) {
        const dapps = await getAllMongoDapps(atlasUri)

        log.info(dapps)

        await registerDapps(
            dapps.map((dapp: any) => dapp.account),
            transferTo,
            'DEPLOYER'
        )
    }
    if (transferConfig.providers) {
        const providers = await getAllProviders()

        log.info(providers)

        return

        // await registerProviders(
        //     providers.map((dapp: any) => dapp.account),
        //     transferTo,
        //     'DEPLOYER'
        // )
    }
}

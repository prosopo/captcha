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
import { BN_ZERO } from '@polkadot/util/bn'
import { DappPayee, GovernanceStatus, Payee, Provider } from '@prosopo/captcha-contract'
import { EmailModelSchema, Emails } from './fundDapps.js'
import { LogLevel, getLogger } from '@prosopo/common'
import { NetworkConfig, NetworkNames, PolkadotSecretJSONSpec } from '@prosopo/types'
import { ProviderEnvironment } from '@prosopo/env'
import { ReturnNumber } from '@prosopo/typechain-types'
import { Tasks } from '@prosopo/provider'
import { TransactionQueue, getBalance, oneUnit, send, submitTx } from '@prosopo/tx'
import { defaultConfig } from '@prosopo/cli'
import { encodeAddress } from '@polkadot/keyring'
import { getPairAsync, wrapQuery } from '@prosopo/contract'
import mongoose, { Model } from 'mongoose'
import z from 'zod'

const log = getLogger(LogLevel.enum.info, 'Scripts.transferContract')

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
const getAllProviders = async (networkName?: NetworkNames, networkConfig?: NetworkConfig) => {
    const config = defaultConfig(networkName && networkConfig ? { [networkName]: networkConfig } : undefined)
    config.defaultNetwork = networkName || config.defaultNetwork
    // we don't need to use a local database for this script
    delete config.database
    const network = config.networks[config.defaultNetwork]
    const secret = config.account.secret
    const pair = await getPairAsync(network, secret)
    const env = new ProviderEnvironment(config, pair)
    await env.isReady()
    const providerAccounts: string[] = await wrapQuery(
        env.getContractInterface().query.getAllProviderAccounts,
        env.getContractInterface().query
    )()
    const providers: { [key: string]: Provider } = {}
    for (const account of providerAccounts) {
        const provider: Provider = await wrapQuery(
            env.getContractInterface().query.getProvider,
            env.getContractInterface().query
        )(account)
        if (provider.status === GovernanceStatus.active) {
            // ensure we use the same format for address across networks
            providers[encodeAddress(account, 42).toString()] = provider
        }
    }
    return providers
}

// Function to register all providers in contract
const registerProviders = async (
    providers: { [key: string]: ProviderWithSecret },
    transferTo?: NetworkConfig,
    accountPrefix?: string
) => {
    const config = defaultConfig(undefined, undefined, undefined, undefined, accountPrefix)
    // we don't need to use a local database for this script
    delete config.database
    const network = transferTo || config.networks[config.defaultNetwork]
    const secret = config.account.secret
    const pair = await getPairAsync(network, secret)
    const env = new ProviderEnvironment(config, pair)
    await env.isReady()
    const unit = oneUnit(env.getApi())
    const providerStakeDefaultPromise: Promise<ReturnNumber> = wrapQuery(
        env.getContractInterface().query.getProviderStakeThreshold,
        env.getContractInterface().query
    )()
    const providerStakeDefault = (await providerStakeDefaultPromise).rawNumber

    // pair will be changing in loop below so take note of this now
    const adminPair = env.getPair()

    for (const [address, provider] of Object.entries(providers)) {
        const providerBalance = await getBalance(env.getApi(), address)
        // Give the provider 1 UNIT + the stake default
        const balanceToHave = providerStakeDefault.add(unit)
        log.info('Balance to have', balanceToHave.toString())
        log.info('Provider balance', providerBalance.toString())
        log.info('Env pair', env.getPair().address)
        log.info('Provider stake default', providerStakeDefault.toString())
        if (providerBalance.lt(balanceToHave)) {
            const balanceToSend = balanceToHave.sub(providerBalance)
            // Send the provider some funds so that they can register, stake, and remain above the existential deposit
            await send(env.getApi(), address, balanceToSend, adminPair)
        }
        const pair = await getPairAsync(network, provider.secret, address)
        log.info('Registering provider', pair.address)
        pair.unlock(provider.password)
        await env.changeSigner(pair)
        const queue = new TransactionQueue(env.getApi(), pair, config.logLevel)
        await submitTx(
            queue,
            env.getContractInterface(),
            'providerRegister',
            [provider.url, 0, Payee.dapp],
            providerStakeDefault
        )
        log.info('Setting dataset for provider', pair.address)
        await submitTx(
            queue,
            env.getContractInterface(),
            'providerSetDataset',
            [provider.datasetId, provider.datasetIdContent],
            BN_ZERO
        )
    }
}

const PronodeSecretsSpec = z.array(z.object({ password: z.string(), secret: PolkadotSecretJSONSpec }))

interface ProviderWithSecret extends Provider {
    secret: z.infer<typeof PolkadotSecretJSONSpec>
    password: string
}

const mapProvidersToProviderSecrets = (
    providers: { [key: string]: Provider },
    providerSecrets: z.infer<typeof PronodeSecretsSpec>
): { [key: string]: ProviderWithSecret } => {
    // check if an `address` matching the key from `providers` exists in `providerSecrets`
    // if it does, return the corresponding secret
    // if it does not, don't add the `ProviderSecret` to the object
    const providerAddresses = Object.keys(providers)
    const providersWithSecrets: { [key: string]: ProviderWithSecret } = {}
    providerSecrets.map((providerSecret) => {
        if (providerAddresses.includes(providerSecret.secret.address)) {
            providersWithSecrets[providerSecret.secret.address] = {
                ...providers[providerSecret.secret.address],
                secret: providerSecret.secret,
                password: providerSecret.password,
            } as ProviderWithSecret
        }
    })
    return providersWithSecrets
}

export const run = async (
    transferFromNetworkName: NetworkNames,
    transferFrom: NetworkConfig,
    transferConfig: {
        dapps: boolean
        providers: boolean
    },
    transferToNetworkName?: NetworkNames,
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
        log.info(transferFrom)

        const providers = await getAllProviders(transferFromNetworkName, transferFrom)
        const newProviders = await getAllProviders(transferToNetworkName, transferTo)

        log.info('Existing providers on new network', newProviders)

        // Filter out providers that already exist in the new network
        for (const [address, provider] of Object.entries(providers)) {
            if (newProviders[address]) {
                delete providers[address]
            }
        }

        log.info('Registering the following providers', providers)

        const providerSecrets = PronodeSecretsSpec.parse(JSON.parse(process.env.PROSOPO_PRONODE_SECRETS || '[]'))
        const providersWithSecrets = mapProvidersToProviderSecrets(providers, providerSecrets)

        await registerProviders(providersWithSecrets, transferTo, 'DEPLOYER')
    }
}

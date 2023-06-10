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
import { Environment } from '@prosopo/env'
import { IProviderAccount } from '@prosopo/types'
import { KeyringPair } from '@polkadot/keyring/types'
import { ProsopoContractError, stringToHexPadded } from '@prosopo/contract'
import { ProsopoEnvError } from '@prosopo/common'
import { ProsopoEnvironment } from '@prosopo/types-env'
import { Tasks } from '@prosopo/provider'
import { getSendAmount, getStakeAmount, sendFunds } from './funds'
import { hexToU8a } from '@polkadot/util'
import { loadJSONFile } from '@prosopo/cli'

export async function registerProvider(env: Environment, account: IProviderAccount) {
    try {
        const providerDetails = (await env.contractInterface.query.getProviderDetails(account.address)).value
            .unwrap()
            .unwrap()
        console.log(providerDetails.status)
        if (providerDetails.status.toString() === 'Active') {
            env.logger.info('Provider exists and is active, skipping registration.')
            return
        }
    } catch {
        env.logger.info('Provider does not exist, registering...')
    }
    if (account.secret) {
        const providerKeyringPair: KeyringPair = env.keyring.addFromMnemonic(account.secret)

        account.address = providerKeyringPair.address

        const stakeAmount = await env.contractInterface['providerStakeThreshold']()

        // use the minimum stake amount from the contract to create a reasonable stake amount
        account.stake = getStakeAmount(env, stakeAmount)
        const sendAmount = getSendAmount(env, account.stake)

        // send enough funds to cover the stake amount and more
        await sendFunds(env, account.address, 'Provider', sendAmount)

        await setupProvider(env, account)
    } else {
        throw new ProsopoEnvError('GENERAL.NO_MNEMONIC_OR_SEED')
    }
}

export async function setupProvider(env: ProsopoEnvironment, provider: IProviderAccount): Promise<void> {
    if (!provider.pair) {
        throw new ProsopoEnvError('DEVELOPER.MISSING_PROVIDER_PAIR', undefined, undefined, { provider })
    }
    await env.changeSigner(provider.pair)
    const logger = env.logger
    const tasks = new Tasks(env)
    logger.info('   - providerRegister')
    const providerRegisterArgs: Parameters<typeof tasks.contract.query.providerRegister> = [
        Array.from(hexToU8a(stringToHexPadded(provider.url))),
        provider.fee,
        provider.payee,
        {
            value: provider.stake,
        },
    ]
    let providerExists = false
    try {
        const queryResult = await tasks.contract.query.providerRegister(...providerRegisterArgs)
        const error = queryResult.value.err || queryResult.value.ok?.err
        if (error && error == 'ProviderExists') {
            providerExists = true
        } else if (error) {
            throw new ProsopoContractError(error)
        }
    } catch (err) {
        logger.debug('Unexpected error')
        throw new ProsopoContractError(err)
    }
    if (!providerExists) {
        await tasks.contract.tx.providerRegister(...providerRegisterArgs)
    }

    const registeredProvider = await env.contractInterface.query.getProviderDetails(provider.address)
    const registeredProviderError = registeredProvider.value.err || registeredProvider.value.ok?.err
    if (registeredProviderError) {
        throw new ProsopoContractError(registeredProviderError)
    }
    logger.info('   - providerStake')
    const queryResultStake = await tasks.contract.query.providerUpdate(...providerRegisterArgs)
    const errorStake = queryResultStake.value.err || queryResultStake.value.ok?.err
    if (errorStake) {
        throw new ProsopoContractError(errorStake)
    }
    await tasks.contract.tx.providerUpdate(...providerRegisterArgs)
    logger.info('   - providerSetDataset')
    const datasetJSON = loadJSONFile(provider.datasetFile)
    await tasks.providerSetDatasetFromFile(datasetJSON)
}

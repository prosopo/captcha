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
import { IProviderAccount } from '@prosopo/types'
import { KeyringPair } from '@polkadot/keyring/types'
import { ProsopoEnvError } from '@prosopo/common'
import { ProviderEnvironment } from '@prosopo/types-env'
import { ReturnNumber } from '@727-ventures/typechain-types'
import { Tasks } from '@prosopo/provider'
import { getSendAmount, getStakeAmount, sendFunds } from './funds'
import { hexToU8a } from '@polkadot/util'
import { loadJSONFile } from '@prosopo/cli'
import { stringToHexPadded, wrapQuery } from '@prosopo/contract'

export async function registerProvider(env: ProviderEnvironment, account: IProviderAccount) {
    try {
        const provider = (await env.contractInterface.query.getProvider(account.address)).value.unwrap().unwrap()
        if (provider.status.toString() === 'Active') {
            env.logger.info('Provider exists and is active, skipping registration.')
            return
        }
    } catch {
        env.logger.info('Provider does not exist, registering...')
    }
    if (account.secret) {
        const providerKeyringPair: KeyringPair = env.keyring.addFromMnemonic(account.secret)

        account.address = providerKeyringPair.address

        const result: ReturnNumber = await wrapQuery(
            env.contractInterface.query.getProviderStakeThreshold,
            env.contractInterface.query
        )()
        const stakeAmount = result.rawNumber

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

export async function setupProvider(env: ProviderEnvironment, provider: IProviderAccount): Promise<void> {
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
            value: 0,
        },
    ]
    let providerExists = false
    try {
        await wrapQuery(tasks.contract.query.providerRegister, tasks.contract.query)(...providerRegisterArgs)
    } catch (e) {
        if (e === 'ProviderExists') {
            logger.info('Provider already exists')
            providerExists = true
        } else {
            throw e
        }
    }

    if (!providerExists) {
        await tasks.contract.tx.providerRegister(...providerRegisterArgs)
    }
    const registeredProvider = await wrapQuery(tasks.contract.query.getProvider, tasks.contract.query)(provider.address)
    logger.info(registeredProvider)
    logger.info('   - providerStake')
    const providerUpdateArgs: Parameters<typeof tasks.contract.query.providerUpdate> = [
        Array.from(hexToU8a(stringToHexPadded(provider.url))),
        provider.fee,
        provider.payee,
        {
            value: provider.stake,
        },
    ]

    const queryProviderUpdate = await wrapQuery(
        tasks.contract.query.providerUpdate,
        tasks.contract.query
    )(...providerUpdateArgs)

    await tasks.contract.tx.providerUpdate(...providerUpdateArgs)

    logger.info('   - providerSetDataset')
    const datasetJSON = loadJSONFile(provider.datasetFile)
    await tasks.providerSetDatasetFromFile(datasetJSON)
}

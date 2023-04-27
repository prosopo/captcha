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
import { KeyringPair } from '@polkadot/keyring/types'
import { createType } from '@polkadot/types'
import { ProsopoEnvError } from '@prosopo/common'
import { stringToHexPadded } from '@prosopo/contract'
import { Environment, Tasks } from '@prosopo/provider'
import { IProviderAccount, ProsopoEnvironment } from '@prosopo/types'
import { getSendAmount, getStakeAmount, sendFunds } from './funds'

export async function registerProvider(env: Environment, account: IProviderAccount) {
    try {
        const providerDetails = await env.contractInterface.getProviderDetails(account.address)
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

        const stakeAmount = await env.contractInterface.getProviderStakeDefault()

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
    const payeeKey = 'ProsopoPayee'
    logger.info('   - providerRegister')
    try {
        await tasks.contractApi.providerRegister(
            stringToHexPadded(provider.serviceOrigin),
            provider.fee,
            createType(env.contractInterface.abi.registry, payeeKey, provider.payee)
        )
    } catch (e) {
        logger.warn(e)
    }
    logger.info('   - providerStake')
    await tasks.contractApi.providerUpdate(
        stringToHexPadded(provider.serviceOrigin),
        provider.fee,
        createType(env.contractInterface.abi.registry, payeeKey, provider.payee),
        provider.stake
    )
    logger.info('   - providerAddDataset')
    const datasetResult = await tasks.providerAddDatasetFromFile(provider.datasetFile)
    // datasetResult.contractEvents!.map((event) => logger.debug(JSON.stringify(event, null, 4)))
    // const events = getEventsFromMethodName(datasetResult, 'ProviderAddDataset')
    // return events[0].event.args[1] as Hash
}

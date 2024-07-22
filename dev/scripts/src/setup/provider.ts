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
import { IProviderAccount } from '@prosopo/types'
import { ProsopoEnvError } from '@prosopo/common'
import { ProviderEnvironment } from '@prosopo/types-env'
import { Tasks } from '@prosopo/provider'
import { datasetWithSolutionHashes } from '@prosopo/datasets'
import { stringToU8a } from '@polkadot/util'
import { wrapQuery } from '@prosopo/contract'

export async function setupProvider(env: ProviderEnvironment, provider: IProviderAccount): Promise<void> {
    if (!provider.pair) {
        throw new ProsopoEnvError('DEVELOPER.MISSING_PROVIDER_PAIR', { context: { provider } })
    }
    await env.changeSigner(provider.pair)
    const logger = env.logger
    const tasks = new Tasks(env)
    logger.info('   - providerRegister')
    const providerRegisterArgs: Parameters<typeof tasks.contract.query.providerRegister> = [
        Array.from(stringToU8a(provider.url)),
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

    logger.info('   - providerSetDataset')
    await tasks.providerSetDataset(datasetWithSolutionHashes)
}

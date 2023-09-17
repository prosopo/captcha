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
import { IDappAccount } from '@prosopo/types'
import { Dapp, DappPayee } from '@prosopo/captcha-contract'
import { ProviderEnvironment } from '@prosopo/types-env'
import { Tasks } from '@prosopo/provider'
import { wrapQuery } from '@prosopo/contract'

export async function setupDapp(env: ProviderEnvironment, dapp: IDappAccount): Promise<void> {
    const logger = env.logger
    if (dapp.pair) {
        await env.changeSigner(dapp.pair)
        const tasks = new Tasks(env)

        try {
            const dappResult: Dapp = await wrapQuery(
                tasks.contract.query.getDapp,
                tasks.contract.query
            )(dapp.contractAccount)
            logger.info('   - dapp is already registered')
            logger.info('Dapp', dappResult)
        } catch (e) {
            logger.info('   - dappRegister')
            await tasks.contract.tx.dappRegister(dapp.contractAccount, DappPayee.dapp)
            logger.info('   - dappFund')
            await tasks.contract.tx.dappFund(dapp.contractAccount, { value: dapp.fundAmount })
        }
    }
}

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
import { BN } from '@polkadot/util'
import { Dapp, DappPayee } from '@prosopo/captcha-contract'
import { IDappAccount } from '@prosopo/types'
import { ProviderEnvironment } from '@prosopo/types-env'
import { Tasks } from '@prosopo/provider'
import { oneUnit, wrapQuery } from '@prosopo/contract'
import { sendFunds } from './funds.js'

export async function setupDapp(env: ProviderEnvironment, dapp: IDappAccount, address?: string): Promise<void> {
    const logger = env.logger

    if (dapp.pair) {
        const addressToRegister = address || dapp.pair.address
        await env.changeSigner(dapp.pair)
        const tasks = new Tasks(env)
        await dappSendFunds(env, dapp)
        try {
            const dappResult: Dapp = await wrapQuery(
                tasks.contract.query.getDapp,
                tasks.contract.query
            )(addressToRegister)
            logger.info('   - dapp is already registered')
            logger.info('Dapp', dappResult)
        } catch (e) {
            logger.info('   - dappRegister')
            await wrapQuery(tasks.contract.query.dappRegister, tasks.contract.query)(addressToRegister, DappPayee.dapp)
            await tasks.contract.tx.dappRegister(addressToRegister, DappPayee.dapp)
            logger.info('   - dappFund')
            await wrapQuery(tasks.contract.query.dappFund, tasks.contract.query)(addressToRegister, {
                value: dapp.fundAmount,
            })
            await tasks.contract.tx.dappFund(addressToRegister, { value: dapp.fundAmount })
        }
    }
}

async function dappSendFunds(env: ProviderEnvironment, dapp: IDappAccount) {
    if (dapp.pair && !dapp.pair.isLocked) {
        const sendAmount = oneUnit(env.getApi())
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const {
            data: { free: previousFree },
        } = await env.getContractInterface().api.query.system.account(dapp.pair.address)
        if (previousFree.lt(new BN(sendAmount.toString()))) {
            // send enough funds to cover the tx fees
            await sendFunds(env, dapp.pair.address, 'Dapp', sendAmount)
        }
    }
}

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
import { BN } from '@polkadot/util/bn'
import { IDappAccount, IProviderAccount } from '@prosopo/types'
import { Payee } from '@prosopo/captcha-contract/types-returns'
import { ProsopoError } from '@prosopo/common'
import { ProviderEnvironment } from '@prosopo/types-env'
import { Tasks } from '../index.js'
import { TestAccount } from '@prosopo/env'
import { getPairAsync } from '@prosopo/contract'

export const accountMnemonic = (account: TestAccount) => account.mnemonic
export const accountAddress = (account: TestAccount) => account.address
export const accountContract = function (account: TestAccount): string {
    if (account.contractAddress) {
        return account.contractAddress
    }
    throw new ProsopoError(`Account ${account} does not have a contract`, {
        context: { failedFuncName: accountContract.name },
    })
}
export type Account = [mnemonic: string, address: string, contractAddress?: string]

export const PROVIDER: IProviderAccount = {
    url: 'http://localhost:9229',
    fee: 10,
    payee: Payee.dapp,
    stake: new BN(1000000000000000),
    datasetFile: './data/captchas.json',
    captchaDatasetId: '',
    secret: '',
    address: '',
}

export const DAPP: IDappAccount = {
    secret: '//Ferdie',
    fundAmount: new BN(1000000000000000),
}

export async function getSignedTasks(env: ProviderEnvironment, account: TestAccount): Promise<Tasks> {
    const pair = await getPairAsync(env.config.networks[env.config.defaultNetwork], accountMnemonic(account), '')
    await env.changeSigner(pair)
    return new Tasks(env)
}

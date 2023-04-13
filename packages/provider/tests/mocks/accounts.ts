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
import { IDappAccount, IProviderAccount } from '@prosopo/types'
import { BN } from '@polkadot/util'
import { Tasks } from '../../src/index'
import { ProsopoEnvironment } from '@prosopo/types'
import { getPair, getSs58Format } from '@prosopo/common'
import { KeypairType } from '@polkadot/util-crypto/types'

export const accountMnemonic = (account: Account) => account[0]
export const accountAddress = (account: Account) => account[1]
export const accountContract = function (account: Account): string {
    if (account[2]) {
        return account[2]
    }
    throw new Error(`Account ${account[1]} does not have a contract`)
}
export type Account = [mnemonic: string, address: string, contractAddress?: string]

export const PROVIDER: IProviderAccount = {
    serviceOrigin: 'http://localhost:8282',
    fee: 10,
    payee: 'Provider',
    stake: new BN(1000000000000000),
    datasetFile: './data/captchas.json',
    captchaDatasetId: '',
    secret: '',
    address: '',
}

export const DAPP: IDappAccount = {
    serviceOrigin: 'http://localhost:9393',
    secret: '//Ferdie',
    contractAccount: process.env.DAPP_CONTRACT_ADDRESS || '', // Must be deployed
    fundAmount: new BN(1000000000000000),
}

export async function getSignedTasks(env: ProsopoEnvironment, account: Account): Promise<Tasks> {
    const ss58Format = getSs58Format()
    const pair = await getPair(
        (process.env.PAIR_TYPE as KeypairType) || ('sr25519' as KeypairType),
        ss58Format,
        accountMnemonic(account)
    )

    await env.changeSigner(pair)
    return new Tasks(env)
}

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
import { IDappAccount, IProviderAccount } from '../../src/types/accounts'
import { BN } from '@polkadot/util'
import { ProsopoEnvironment, Tasks } from '../../src/index'

export const accountMnemonic = (account: Account) => account[0]
export const accountAddress = (account: Account) => account[1]
export type Account = [mnemonic: string, address: string]

export const PROVIDER: IProviderAccount = {
    serviceOrigin: 'http://localhost:8282',
    fee: 10,
    payee: 'Provider',
    stake: new BN(1000000000000000),
    datasetFile: './data/captchas.json',
    captchaDatasetId: '',
    mnemonic: '',
    address: '',
}

export const DAPP: IDappAccount = {
    serviceOrigin: 'http://localhost:9393',
    mnemonic: '//Ferdie',
    contractAccount: process.env.DAPP_CONTRACT_ADDRESS || '', // Must be deployed
    optionalOwner: '5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL', // Ferdie's address
    fundAmount: new BN(1000000000000000),
}

export async function getSignedTasks(env: ProsopoEnvironment, account: Account): Promise<Tasks> {
    await env.changeSigner(accountMnemonic(account))
    return new Tasks(env)
}

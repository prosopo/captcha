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
import { Account, AccountKey, IDatabaseAccounts, accountMnemonic } from '../dataUtils/DatabaseAccounts'
import { populateDatabase } from '../dataUtils/populateDatabase'
import { ProsopoEnvError } from '@prosopo/common'
import { ESLint } from 'eslint'
import Environment = ESLint.Environment

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

export const DAPP_USER = {
    mnemonic: '//Charlie',
    address: '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y',
}

// Create a user of specified type using the databasePopulator
export async function getUser(env: ProsopoEnvironment, accountType: AccountKey): Promise<Account> {
    try {
        const accountConfig = Object.assign({}, ...Object.keys(AccountKey).map((item) => ({ [item]: 0 })))
        accountConfig[accountType] = 1
        const databaseAccounts: IDatabaseAccounts = await populateDatabase(env, accountConfig, false)
        const account = databaseAccounts[accountType].pop()
        if (account === undefined) {
            throw new ProsopoEnvError(new Error(`${accountType} not created by databasePopulator`))
        }
        return account
    } catch (e) {
        throw new ProsopoEnvError(e)
    }
}

export async function changeSigner(env: ProsopoEnvironment, account: Account): Promise<Tasks> {
    await env.changeSigner(accountMnemonic(account))
    return new Tasks(env)
}

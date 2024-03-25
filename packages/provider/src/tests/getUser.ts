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
// Create a user of specified type using the databasePopulator
import { Account } from './accounts.js'
import { AccountKey, IDatabaseAccounts } from './dataUtils/DatabaseAccounts.js'
import { DappAbiJSON, DappWasm } from './dataUtils/dapp-example-contract/loadFiles.js'
import { ProsopoEnvError } from '@prosopo/common'
import { ProviderEnvironment } from '@prosopo/env'
import { populateDatabase, userFundMapDefault } from './dataUtils/populateDatabase.js'

export async function getUser(env: ProviderEnvironment, accountType: AccountKey, fund = true): Promise<Account> {
    const accountConfig = Object.assign({}, ...Object.keys(AccountKey).map((item) => ({ [item]: 0 })))
    accountConfig[accountType] = 1
    const dappWasm = await DappWasm()
    const dappAbiJSON = await DappAbiJSON()
    const fundMap = { ...userFundMapDefault, [accountType]: fund }
    const databaseAccounts: IDatabaseAccounts = await populateDatabase(
        env,
        accountConfig,
        fundMap,
        false,
        dappAbiJSON,
        dappWasm
    )
    const account = databaseAccounts[accountType].pop()
    if (account === undefined) {
        throw new ProsopoEnvError(new Error(`${accountType} not created by databasePopulator`))
    }
    return account
}

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
import { readFile, writeFile } from 'fs'
import path from 'path'
import { IDatabasePopulatorMethods } from './DatabasePopulator'

export type Account = [mnemonic: string, address: string]

export enum AccountKey {
    providers = 'providers',
    providersWithStake = 'providersWithStake',
    providersWithStakeAndDataset = 'providersWithStakeAndDataset',
    dapps = 'dapps',
    dappsWithStake = 'dappsWithStake',
    dappUsers = 'dappUsers',
}

export const accountMnemonic = (account: Account) => account[0]
export const accountAddress = (account: Account) => account[1]

export interface IDatabaseAccounts {
    providers: Account[]

    providersWithStake: Account[]

    providersWithStakeAndDataset: Account[]

    dapps: Account[]

    dappsWithStake: Account[]

    dappUsers: Account[]
}

const keys = Object.keys(new IDatabasePopulatorMethods())

function getPath(type: 'import' | 'export') {
    return path.resolve(__dirname, `../../../../${type === 'import' ? '' : '.'}database_accounts.json`)
}

export async function exportDatabaseAccounts(database: IDatabaseAccounts) {
    return new Promise((resolve) => {
        const jsonData = keys.reduce((prev, curr) => {
            return {
                ...prev,
                [curr]: database[curr],
            }
        }, {})

        writeFile(getPath('export'), JSON.stringify(jsonData), function (err) {
            if (err) {
                console.log(err)
            } else {
                console.log(`Exported accounts to ${getPath('export')}`)
            }

            resolve(null)
        })
    })
}

class DatabaseAccounts implements IDatabaseAccounts {
    private _registeredProviders: Account[] = []
    private _registeredProvidersWithStake: Account[] = []
    private _registeredProvidersWithStakeAndDataset: Account[] = []
    private _registeredDapps: Account[] = []
    private _registeredDappsWithStake: Account[] = []
    private _registeredDappUsers: Account[] = []

    get providers(): Account[] {
        return this._registeredProviders
    }
    get providersWithStake(): Account[] {
        return this._registeredProvidersWithStake
    }
    get providersWithStakeAndDataset(): Account[] {
        return this._registeredProvidersWithStakeAndDataset
    }
    get dapps(): Account[] {
        return this._registeredDapps
    }
    get dappsWithStake(): Account[] {
        return this._registeredDappsWithStake
    }

    get dappUsers(): Account[] {
        return this._registeredDappUsers
    }

    public importDatabaseAccounts() {
        const self = this
        return new Promise((resolve) => {
            readFile(getPath('import'), { encoding: 'utf-8' }, function (err, stringData) {
                if (err) {
                    console.log(err)
                } else {
                    console.log(`Imported accounts from ${getPath('import')}`)
                    const data = JSON.parse(stringData)
                    keys.forEach((key) => {
                        self[`_registered${key.replace(/^./, key[0].toUpperCase())}`] = data[key]
                    })
                }

                resolve(null)
            })
        })
    }
}

export default DatabaseAccounts

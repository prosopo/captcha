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
import { IDatabasePopulatorMethods } from './DatabasePopulator.js'
import { TestAccount } from '@prosopo/env'
import { at, get } from '@prosopo/util'
import { readFile, writeFile } from 'fs'
import path from 'path'

export enum AccountKey {
    providers = 'providers',
    providersWithStake = 'providersWithStake',
    providersWithStakeAndDataset = 'providersWithStakeAndDataset',
    dapps = 'dapps',
    dappsWithStake = 'dappsWithStake',
    dappUsers = 'dappUsers',
}

export interface IDatabaseAccounts {
    providers: TestAccount[]

    providersWithStake: TestAccount[]

    providersWithStakeAndDataset: TestAccount[]

    dapps: TestAccount[]

    dappsWithStake: TestAccount[]

    dappUsers: TestAccount[]
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
                [curr]: get(database, curr),
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
    private _registeredProviders: TestAccount[] = []
    private _registeredProvidersWithStake: TestAccount[] = []
    private _registeredProvidersWithStakeAndDataset: TestAccount[] = []
    private _registeredDapps: TestAccount[] = []
    private _registeredDappsWithStake: TestAccount[] = []
    private _registeredDappUsers: TestAccount[] = []

    get providers(): TestAccount[] {
        return this._registeredProviders
    }
    get providersWithStake(): TestAccount[] {
        return this._registeredProvidersWithStake
    }
    get providersWithStakeAndDataset(): TestAccount[] {
        return this._registeredProvidersWithStakeAndDataset
    }
    get dapps(): TestAccount[] {
        return this._registeredDapps
    }
    get dappsWithStake(): TestAccount[] {
        return this._registeredDappsWithStake
    }

    get dappUsers(): TestAccount[] {
        return this._registeredDappUsers
    }

    public importDatabaseAccounts() {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self: {
            [key: string]: TestAccount[]
        } = this as any
        return new Promise((resolve) => {
            readFile(getPath('import'), { encoding: 'utf-8' }, function (err, stringData) {
                if (err) {
                    console.log(err)
                } else {
                    console.log(`Imported accounts from ${getPath('import')}`)
                    const data = JSON.parse(stringData)
                    keys.forEach((key) => {
                        self[`_registered${key.replace(/^./, at(key, 0).toUpperCase())}`] = get(data, key)
                    })
                }

                resolve(null)
            })
        })
    }
}

export default DatabaseAccounts

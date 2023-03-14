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
import { stringToHexPadded } from '@prosopo/contract'
import { ProsopoEnvError } from '@prosopo/common'
import path from 'path'

import { mnemonicGenerate, randomAsHex } from '@polkadot/util-crypto'

import { sendFunds as _sendFunds, getSendAmount, getStakeAmount } from '../../src/tasks/setup'
import { Tasks } from '../../src/tasks'
import { IDatabaseAccounts } from './DatabaseAccounts'
import { Environment } from '../../src/env'
import { TranslationKey } from '@prosopo/common'
import { createType } from '@polkadot/types'
import { BN } from '@polkadot/util'
import { AnyNumber } from '@polkadot/types-codec/types'
import { accountAddress, accountMnemonic } from '../mocks/accounts'
import { Account } from '../mocks/accounts'
import { getPair } from '../../src/index'
import { getPairType, getSs58Format } from '../../src/cli/util'

const serviceOriginBase = 'http://localhost:'

const PROVIDER_FEE = 10
const PROVIDER_PAYEE = 'Provider'

export enum IDatabasePopulatorMethodNames {
    registerProvider = 'registerProvider',
    registerProviderWithStake = 'registerProviderWithStake',
    registerProviderWithStakeAndDataset = 'registerProviderWithStakeAndDataset',
    registerDapp = 'registerDapp',
    registerDappWithStake = 'registerDappWithStake',
    registerDappUser = 'registerDappUser',
}

export class IDatabasePopulatorMethods {
    registerProvider: (serviceOrigin?: string, noPush?: boolean) => Promise<Account>
    registerProviderWithStake: () => Promise<Account>
    registerProviderWithStakeAndDataset: () => Promise<Account>
    registerDapp: (serviceOrigin?: string, noPush?: boolean) => Promise<Account>
    registerDappWithStake: () => Promise<Account>
    registerDappUser: () => Promise<Account>
}

class DatabasePopulator implements IDatabaseAccounts, IDatabasePopulatorMethods {
    private mockEnv: Environment

    private _registeredProviders: Account[] = []

    private _registeredProvidersWithStake: Account[] = []

    private _registeredProvidersWithStakeAndDataset: Account[] = []

    private _registeredDapps: Account[] = []

    private _registeredDappsWithStake: Account[] = []

    private _registeredDappUsers: Account[] = []

    private providerStakeDefault: number | BN = 0

    private stakeAmount: number | BN = 0
    private sendAmount: number | BN = 0

    private _isReady: Promise<void>

    constructor(env) {
        this.mockEnv = env
        this._isReady = this.mockEnv.isReady().then(() => {
            try {
                const tasks = new Tasks(this.mockEnv)

                return tasks.contractApi.getProviderStakeDefault().then((res) => {
                    this.providerStakeDefault = new BN(res)
                    this.stakeAmount = getStakeAmount(env, this.providerStakeDefault)
                    this.sendAmount = getSendAmount(env, this.stakeAmount)
                })
            } catch (e) {
                throw new Error(e)
            }
        })
    }

    get providers(): Account[] {
        return this._registeredProviders
    }

    set providers(accounts: Account[]) {
        this._registeredProviders = accounts
    }

    get providersWithStake(): Account[] {
        return this._registeredProvidersWithStake
    }

    set providersWithStake(accounts: Account[]) {
        this._registeredProvidersWithStake = accounts
    }

    get providersWithStakeAndDataset(): Account[] {
        return this._registeredProvidersWithStakeAndDataset
    }

    set providersWithStakeAndDataset(accounts: Account[]) {
        this._registeredProvidersWithStakeAndDataset = accounts
    }

    get dapps(): Account[] {
        return this._registeredDapps
    }

    set dapps(accounts: Account[]) {
        this._registeredDapps = accounts
    }

    get dappsWithStake(): Account[] {
        return this._registeredDappsWithStake
    }

    set dappsWithStake(accounts: Account[]) {
        this._registeredDappsWithStake = accounts
    }

    get dappUsers(): Account[] {
        return this._registeredDappUsers
    }

    set dappUsers(accounts: Account[]) {
        this._registeredDappUsers = accounts
    }

    public isReady() {
        return this._isReady
    }

    private createAccount(): Account {
        const account = this.createAccountAndAddToKeyring()

        if (!account) {
            throw new ProsopoEnvError('DEVELOPER.CREATE_ACCOUNT_FAILED')
        }

        return account
    }

    private createAccountAndAddToKeyring(): [string, string] {
        const mnemonic: string = mnemonicGenerate()
        const account = this.mockEnv.keyring.addFromMnemonic(mnemonic)
        const { address } = account
        return [mnemonic, address]
    }

    private sendFunds(account: Account, payee: string, amount: AnyNumber)
    private sendFunds(address: string, payee: string, amount: AnyNumber)

    private sendFunds(account: Account | string, payee: string, amount: AnyNumber) {
        const address = typeof account === 'string' ? account : accountAddress(account)

        return _sendFunds(this.mockEnv, address, payee.toString(), amount)
    }

    private async changeSigner(account: Account)
    private async changeSigner(mnemonic: string)

    private async changeSigner(account: Account | string) {
        const mnemonic = typeof account === 'string' ? account : accountMnemonic(account)

        if (!this.mockEnv.contractInterface) {
            throw new ProsopoEnvError('DEVELOPER.NO_MOCK_ENV')
        }
        const ss58Format = getSs58Format()
        const pairType = getPairType()
        const pair = await getPair(pairType, ss58Format, mnemonic)

        return this.mockEnv.changeSigner(pair)
    }

    public async registerProvider(serviceOrigin?: string, noPush?: boolean): Promise<Account> {
        try {
            const _serviceOrigin = serviceOrigin || serviceOriginBase + randomAsHex().slice(0, 8)

            const account = this.createAccount()
            this.mockEnv.logger.debug(
                'Registering provider',
                accountAddress(account),
                '`',
                accountMnemonic(account),
                '`',
                'with service origin',
                _serviceOrigin
            )
            await this.sendFunds(accountAddress(account), 'Provider', this.sendAmount)
            await this.changeSigner(accountMnemonic(account))
            const tasks = new Tasks(this.mockEnv)
            const result = await tasks.contractApi.providerRegister(
                stringToHexPadded(_serviceOrigin),
                PROVIDER_FEE,
                createType(this.mockEnv.contractInterface.abi.registry, 'ProsopoPayee', PROVIDER_PAYEE),
                accountAddress(account)
            )
            this.mockEnv.logger.debug(
                'Event: ',
                result.contractEvents ? result.contractEvents[0].event.identifier : 'No events'
            )
            const provider = await tasks.contractApi.getProviderDetails(accountAddress(account))
            //console.log('Registered provider', provider)
            if (!noPush) {
                this._registeredProviders.push(account)
            }
            return account
        } catch (e) {
            throw this.createError(e, this.registerProvider.name)
        }
    }

    private async updateProvider(account: Account, serviceOrigin: string) {
        try {
            await this.changeSigner(account)

            const tasks = new Tasks(this.mockEnv)

            const result = await tasks.contractApi.providerUpdate(
                stringToHexPadded(serviceOrigin),
                PROVIDER_FEE,
                createType(this.mockEnv.contractInterface.abi.registry, 'ProsopoPayee', PROVIDER_PAYEE),
                accountAddress(account),
                this.stakeAmount
            )
            this.mockEnv.logger.debug(
                'Event: ',
                result.contractEvents ? result.contractEvents[0].event.identifier : 'No events'
            )

            //const provider = await tasks.contractApi.getProviderDetails(accountAddress(account))
            //console.log('provider', provider)
        } catch (e) {
            throw this.createError(e, this.updateProvider.name)
        }
    }

    public async registerProviderWithStake(): Promise<Account> {
        try {
            const serviceOrigin = serviceOriginBase + randomAsHex().slice(0, 8)

            const account = await this.registerProvider(serviceOrigin, true)

            await this.updateProvider(account, serviceOrigin)

            this._registeredProvidersWithStake.push(account)

            return account
        } catch (e) {
            throw this.createError(e, this.registerProviderWithStake.name)
        }
    }

    private async addDataset(account: Account) {
        try {
            await this.changeSigner(account)

            const tasks = new Tasks(this.mockEnv)

            const captchaFilePath = path.resolve(__dirname, '../../tests/mocks/data/captchas.json')

            const result = await tasks.providerAddDatasetFromFile(captchaFilePath)
            this.mockEnv.logger.debug(
                'Event: ',
                result.contractEvents ? result.contractEvents[0].event.identifier : 'No events'
            )
        } catch (e) {
            throw this.createError(e, this.addDataset.name)
        }
    }

    public async registerProviderWithStakeAndDataset(): Promise<Account> {
        try {
            const serviceOrigin = serviceOriginBase + randomAsHex().slice(0, 8)

            const account = await this.registerProvider(serviceOrigin, true)
            await this.updateProvider(account, serviceOrigin)

            await this.addDataset(account)

            this._registeredProvidersWithStakeAndDataset.push(account)

            return account
        } catch (e) {
            throw this.createError(e, this.registerProviderWithStakeAndDataset.name)
        }
    }

    public async registerDapp(serviceOrigin?: string, noPush?: boolean): Promise<Account> {
        try {
            const _serviceOrigin = serviceOrigin || serviceOriginBase + randomAsHex().slice(0, 8)

            const account = this.createAccount()
            await this.sendFunds(accountAddress(account), 'Dapp', this.sendAmount)

            await this.changeSigner(accountMnemonic(account))

            const tasks = new Tasks(this.mockEnv)
            const result = await tasks.contractApi.dappRegister(
                stringToHexPadded(_serviceOrigin),
                accountAddress(account),
                createType(this.mockEnv.contractInterface.abi.registry, 'AccountId', accountAddress(account)).toString()
            )
            this.mockEnv.logger.debug(
                'Event: ',
                result.contractEvents ? result.contractEvents[0].event.identifier : 'No events'
            )

            if (!noPush) {
                this._registeredDapps.push(account)
            }

            return account
        } catch (e) {
            throw this.createError(e, this.registerDapp.name)
        }
    }

    private async dappFund(account: Account) {
        await this.changeSigner(account)

        const tasks = new Tasks(this.mockEnv)

        const result = await tasks.contractApi.dappFund(accountAddress(account), this.stakeAmount)

        this.mockEnv.logger.debug(
            'Event: ',
            result.contractEvents ? result.contractEvents[0].event.identifier : 'No events'
        )
    }

    public async registerDappWithStake(): Promise<Account> {
        try {
            const serviceOrigin = serviceOriginBase + randomAsHex().slice(0, 8)
            const account = await this.registerDapp(serviceOrigin, true)
            await this.dappFund(account)

            this._registeredDappsWithStake.push(account)

            return account
        } catch (e) {
            throw new Error(e)
        }
    }

    public async registerDappUser(): Promise<Account> {
        const account = this.createAccount()

        await this.sendFunds(accountAddress(account), 'DappUser', this.sendAmount)

        this._registeredDappUsers.push(account)

        return account
    }

    createError(e, functionName: string): ProsopoEnvError {
        let errorKey = e
        if (e.error && e.error.message && e.error.message === 'Module') {
            errorKey = 'DEVELOPER.CREATE_ACCOUNT_FAILED_OUT_OF_FUNDS' as TranslationKey
        }
        return new ProsopoEnvError(errorKey, functionName, undefined, e)
    }
}

export default DatabasePopulator

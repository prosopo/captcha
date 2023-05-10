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

import { sendFunds as _sendFunds, getSendAmount, getStakeAmount } from './funds'
import { Tasks } from '../../src/tasks'
import { IDatabaseAccounts } from './DatabaseAccounts'
import { Environment } from '../../src/env'
<<<<<<< HEAD
import { TranslationKey, getPair, getPairType, getSs58Format } from '@prosopo/common'
=======
import { TranslationKey, getPair } from '@prosopo/common'
import { getPairType, getSs58Format } from '@prosopo/env'
>>>>>>> main
import { createType } from '@polkadot/types'
import { BN } from '@polkadot/util'
import { AnyNumber } from '@polkadot/types-codec/types'
import { accountAddress, accountContract, accountMnemonic } from '../mocks/accounts'
import { Account } from '../mocks/accounts'
import { ContractDeployer } from '@prosopo/contract'
import { Abi } from '@polkadot/api-contract'
import { EventRecord } from '@polkadot/types/interfaces'

const serviceOriginBase = 'http://localhost:'

const PROVIDER_FEE = 10
const PROVIDER_PAYEE = 'Dapp'

export enum IDatabasePopulatorMethodNames {
    registerProvider = 'registerProvider',
    registerProviderWithStake = 'registerProviderWithStake',
    registerProviderWithStakeAndDataset = 'registerProviderWithStakeAndDataset',
    registerDapp = 'registerDapp',
    registerDappWithStake = 'registerDappWithStake',
    registerDappUser = 'registerDappUser',
}

export class IDatabasePopulatorMethods {
    registerProvider: (fund: boolean, serviceOrigin?: string, noPush?: boolean) => Promise<Account>
    registerProviderWithStake: (fund: boolean) => Promise<Account>
    registerProviderWithStakeAndDataset: (fund: boolean) => Promise<Account>
    registerDapp: (fund: boolean, serviceOrigin?: string, noPush?: boolean) => Promise<Account>
    registerDappWithStake: (fund: boolean) => Promise<Account>
    registerDappUser: (fund: boolean) => Promise<Account>
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
    private dappAbiMetadata: Abi
    private dappWasm: Uint8Array

    private _isReady: Promise<void>

    constructor(env, dappAbiMetadata: Abi, dappWasm: Uint8Array) {
        this.mockEnv = env
        this.dappAbiMetadata = dappAbiMetadata
        this.dappWasm = dappWasm
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

    public async registerProvider(fund: boolean, serviceOrigin?: string, noPush?: boolean): Promise<Account> {
        try {
            const _serviceOrigin = serviceOrigin || serviceOriginBase + randomAsHex().slice(0, 8)

            const account = this.createAccount()
            this.mockEnv.logger.debug(
                'Registering provider',
                '`',
                accountAddress(account),
                '`',
                'with service origin',
                _serviceOrigin
            )
            if (fund) {
                await this.sendFunds(accountAddress(account), 'Provider', this.sendAmount)
            }
            await this.changeSigner(accountMnemonic(account))
            const tasks = new Tasks(this.mockEnv)

            // const providerMaxFee = await tasks.contractApi.getProviderMaxFee()
            //
            // console.log(providerMaxFee)
            // process.exit()

            const result = await tasks.contractApi.providerRegister(
                stringToHexPadded(_serviceOrigin),
                createType(this.mockEnv.contractInterface.abi.registry, 'Balance', PROVIDER_FEE),
                createType(this.mockEnv.contractInterface.abi.registry, 'ProsopoPayee', PROVIDER_PAYEE)
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
                createType(this.mockEnv.contractInterface.abi.registry, 'Balance', PROVIDER_FEE),
                createType(this.mockEnv.contractInterface.abi.registry, 'ProsopoPayee', PROVIDER_PAYEE),
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

    public async registerProviderWithStake(fund: boolean): Promise<Account> {
        try {
            const serviceOrigin = serviceOriginBase + randomAsHex().slice(0, 8)

            const account = await this.registerProvider(fund, serviceOrigin, true)

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

    public async registerProviderWithStakeAndDataset(fund: boolean): Promise<Account> {
        try {
            const serviceOrigin = serviceOriginBase + randomAsHex().slice(0, 8)

            const account = await this.registerProvider(fund, serviceOrigin, true)
            await this.updateProvider(account, serviceOrigin)

            await this.addDataset(account)

            this._registeredProvidersWithStakeAndDataset.push(account)

            return account
        } catch (e) {
            throw this.createError(e, this.registerProviderWithStakeAndDataset.name)
        }
    }

    public async registerDapp(fund: boolean, serviceOrigin?: string, noPush?: boolean): Promise<Account> {
        try {
            const account = this.createAccount()
            this.mockEnv.logger.debug('Sending funds to `', accountAddress(account), '`')
            if (fund) {
                await this.sendFunds(accountAddress(account), 'Dapp', this.sendAmount)
            }

            this.mockEnv.logger.debug('Changing signer to `', accountAddress(account), '`')
            await this.changeSigner(accountMnemonic(account))

            this.mockEnv.logger.debug('Pair address`', this.mockEnv.pair.address, '`')
            const tasks = new Tasks(this.mockEnv)
            const dappParams = ['1000000000000000000', 1000, this.mockEnv.contractInterface.address, 65, 1000000]

            const deployer = new ContractDeployer(
                this.mockEnv.api,
                this.dappAbiMetadata,
                this.dappWasm,
                this.mockEnv.pair,
                dappParams,
                0,
                0,
                randomAsHex(),
                this.mockEnv.config.logLevel
            )
            const deployResult = await deployer.deploy()

            const instantiateEvent: EventRecord | undefined = deployResult.events.find(
                (event) => event.event.section === 'contracts' && event.event.method === 'Instantiated'
            )
            const contractAddress = instantiateEvent?.event.data['contract'].toString()

            account.push(contractAddress)

            this.mockEnv.logger.debug('Dapp contract address', contractAddress)

            const result = await tasks.contractApi.dappRegister(contractAddress, 'Dapp')
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

        const result = await tasks.contractApi.dappFund(accountContract(account), this.stakeAmount)

        this.mockEnv.logger.debug(
            'Event: ',
            result.contractEvents ? result.contractEvents[0].event.identifier : 'No events'
        )
    }

    public async registerDappWithStake(fund: boolean): Promise<Account> {
        try {
            const serviceOrigin = serviceOriginBase + randomAsHex().slice(0, 8)
            const account = await this.registerDapp(fund, serviceOrigin, true)
            await this.dappFund(account)

            this._registeredDappsWithStake.push(account)

            return account
        } catch (e) {
            throw new Error(e)
        }
    }

    public async registerDappUser(fund: boolean): Promise<Account> {
        const account = this.createAccount()
        if (fund) {
            await this.sendFunds(accountAddress(account), 'DappUser', this.sendAmount)
        }

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

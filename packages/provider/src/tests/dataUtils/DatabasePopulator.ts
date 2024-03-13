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
import type { Abi } from '@polkadot/api-contract/Abi'
import type { AnyNumber } from '@polkadot/types-codec/types'
import { createType } from '@polkadot/types/create'
import type { EventRecord } from '@polkadot/types/interfaces'
import { mnemonicGenerate } from '@polkadot/util-crypto/mnemonic'
import { randomAsHex } from '@polkadot/util-crypto/random'
import { BN } from '@polkadot/util/bn'
import { stringToU8a } from '@polkadot/util/string'
import { DappPayee, Payee } from '@prosopo/captcha-contract/types-returns'
import { ProsopoContractError, ProsopoEnvError } from '@prosopo/common'
import { ContractDeployer, getPairAsync, wrapQuery } from '@prosopo/contract'
import { datasetWithSolutionHashes } from '@prosopo/datasets'
import type { ProviderEnvironment } from '@prosopo/env'
import type { ReturnNumber } from '@prosopo/typechain-types'
import type { DatasetWithIdsAndTree } from '@prosopo/types'
import { get } from '@prosopo/util'
import { Tasks } from '../../tasks/index.js'
import {
    type Account,
    accountAddress,
    accountContract,
    accountMnemonic,
} from '../accounts.js'
import type { IDatabaseAccounts } from './DatabaseAccounts.js'
import {
    sendFunds as _sendFunds,
    getSendAmount,
    getStakeAmount,
} from './funds.js'

const urlBase = 'http://localhost:'

const PROVIDER_FEE = 10
const PROVIDER_PAYEE = Payee.dapp

export enum IDatabasePopulatorMethodNames {
    registerProvider = 'registerProvider',
    registerProviderWithStake = 'registerProviderWithStake',
    registerProviderWithStakeAndDataset = 'registerProviderWithStakeAndDataset',
    registerDapp = 'registerDapp',
    registerDappWithStake = 'registerDappWithStake',
    registerDappUser = 'registerDappUser',
}

export class IDatabasePopulatorMethods {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    registerProvider: (
        fund: boolean,
        url?: string,
        noPush?: boolean
    ) => Promise<Account>
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    registerProviderWithStake: (fund: boolean) => Promise<Account>
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    registerProviderWithStakeAndDataset: (fund: boolean) => Promise<Account>
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    registerDapp: (
        fund: boolean,
        url?: string,
        noPush?: boolean
    ) => Promise<Account>
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    registerDappWithStake: (fund: boolean) => Promise<Account>
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    registerDappUser: (fund: boolean) => Promise<Account>
}

class DatabasePopulator
    implements IDatabaseAccounts, IDatabasePopulatorMethods
{
    private mockEnv: ProviderEnvironment

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

    constructor(
        env: ProviderEnvironment,
        dappAbiMetadata: Abi,
        dappWasm: Uint8Array
    ) {
        this.mockEnv = env
        this.dappAbiMetadata = dappAbiMetadata
        this.dappWasm = dappWasm
        this._isReady = this.mockEnv.isReady().then(() => {
            try {
                const tasks = new Tasks(this.mockEnv)
                const promiseStakeDefault: Promise<ReturnNumber> = wrapQuery(
                    tasks.contract.query.getProviderStakeThreshold,
                    tasks.contract.query
                )()
                return promiseStakeDefault.then((res) => {
                    this.providerStakeDefault = new BN(res.toNumber())
                    this.stakeAmount = getStakeAmount(
                        env,
                        this.providerStakeDefault
                    )
                    this.sendAmount = getSendAmount(env, this.stakeAmount)
                })
            } catch (e) {
                throw new Error(String(e))
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

    private sendFunds(
        account: Account,
        payee: string,
        amount: AnyNumber
    ): Promise<void>
    private sendFunds(
        address: string,
        payee: string,
        amount: AnyNumber
    ): Promise<void>
    private sendFunds(
        account: Account | string,
        payee: string,
        amount: AnyNumber
    ): Promise<void> {
        const address =
            typeof account === 'string' ? account : accountAddress(account)

        return _sendFunds(this.mockEnv, address, payee.toString(), amount)
    }

    private async changeSigner(account: Account): Promise<void>
    private async changeSigner(mnemonic: string): Promise<void>
    private async changeSigner(account: Account | string): Promise<void> {
        const mnemonic =
            typeof account === 'string' ? account : accountMnemonic(account)

        if (!this.mockEnv.contractInterface) {
            throw new ProsopoEnvError('DEVELOPER.NO_MOCK_ENV')
        }
        const network =
            this.mockEnv.config.networks[this.mockEnv.defaultNetwork]
        const pair = await getPairAsync(network, mnemonic, '')

        return this.mockEnv.changeSigner(pair)
    }

    public async registerProvider(
        fund: boolean,
        url?: string,
        noPush?: boolean
    ): Promise<Account> {
        try {
            const urlString = url || urlBase + randomAsHex().slice(0, 8)
            const _url = Array.from(stringToU8a(urlString))

            const account = this.createAccount()
            this.mockEnv.logger.debug(
                'Registering provider',
                '`',
                accountAddress(account),
                '`',
                'with service origin',
                urlString
            )
            if (fund) {
                await this.sendFunds(
                    accountAddress(account),
                    'Provider',
                    this.sendAmount
                )
            }
            await this.changeSigner(accountMnemonic(account))
            const tasks = new Tasks(this.mockEnv)

            await tasks.contract.tx.providerRegister(
                _url,
                PROVIDER_FEE,
                PROVIDER_PAYEE
            )

            const provider = (
                await tasks.contract.query.getProvider(accountAddress(account))
            ).value
                .unwrap()
                .unwrap()
            if (!noPush) {
                this._registeredProviders.push(account)
            }
            return account
        } catch (e) {
            throw this.createError(e as Error, this.registerProvider.name)
        }
    }

    private async updateProvider(account: Account, url: string) {
        try {
            await this.changeSigner(account)

            const tasks = new Tasks(this.mockEnv)

            await tasks.contract.tx.providerUpdate(
                Array.from(stringToU8a(url)),
                createType(
                    this.mockEnv.getContractInterface().abi.registry,
                    'Balance',
                    PROVIDER_FEE
                ),
                PROVIDER_PAYEE,
                { value: this.stakeAmount }
            )
        } catch (e) {
            throw this.createError(e as Error, this.updateProvider.name)
        }
    }

    public async registerProviderWithStake(fund: boolean): Promise<Account> {
        try {
            const url = urlBase + randomAsHex().slice(0, 8)

            const account = await this.registerProvider(fund, url, true)

            await this.updateProvider(account, url)

            this._registeredProvidersWithStake.push(account)

            return account
        } catch (e) {
            throw this.createError(
                e as Error,
                this.registerProviderWithStake.name
            )
        }
    }

    private async addDataset(account: Account, dataset: DatasetWithIdsAndTree) {
        try {
            await this.changeSigner(account)

            const tasks = new Tasks(this.mockEnv)

            await tasks.providerSetDataset(dataset)
        } catch (e) {
            throw this.createError(e as Error, this.addDataset.name)
        }
    }

    public async registerProviderWithStakeAndDataset(
        fund: boolean
    ): Promise<Account> {
        try {
            const url = urlBase + randomAsHex().slice(0, 8)

            const account = await this.registerProvider(fund, url, true)
            await this.updateProvider(account, url)
            await this.addDataset(account, datasetWithSolutionHashes)

            this._registeredProvidersWithStakeAndDataset.push(account)

            return account
        } catch (e) {
            throw this.createError(
                e as Error,
                this.registerProviderWithStakeAndDataset.name
            )
        }
    }

    public async registerDapp(
        fund: boolean,
        url?: string,
        noPush?: boolean
    ): Promise<Account> {
        try {
            const account = this.createAccount()
            this.mockEnv.logger.debug(
                'Sending funds to `',
                accountAddress(account),
                '`'
            )
            if (fund) {
                await this.sendFunds(
                    accountAddress(account),
                    'Dapp',
                    this.sendAmount
                )
            }

            this.mockEnv.logger.debug(
                'Changing signer to `',
                accountAddress(account),
                '`'
            )
            await this.changeSigner(accountMnemonic(account))

            this.mockEnv.logger.debug(
                'Pair address`',
                this.mockEnv.pair?.address,
                '`'
            )
            const tasks = new Tasks(this.mockEnv)
            const dappParams = [
                '1000000000000000000',
                1000,
                this.mockEnv.getContractInterface().address,
                65,
                1000000,
            ]

            if (!this.mockEnv.pair) {
                throw new ProsopoContractError('CONTRACT.SIGNER_UNDEFINED')
            }

            const deployer = new ContractDeployer(
                this.mockEnv.getApi(),
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

            const instantiateEvent: EventRecord | undefined =
                deployResult.events.find(
                    (event) =>
                        event.event.section === 'contracts' &&
                        event.event.method === 'Instantiated'
                )
            const contractAddress = String(
                get<unknown>(instantiateEvent?.event.data, 'contract')
            )

            account.push(contractAddress)

            this.mockEnv.logger.debug('Dapp contract address', contractAddress)

            const queryResult = await tasks.contract.query.dappRegister(
                contractAddress,
                DappPayee.dapp
            )

            const error = queryResult.value.err || queryResult.value.ok?.err

            if (error) {
                throw new ProsopoContractError(new Error(error))
            }

            await tasks.contract.tx.dappRegister(
                contractAddress,
                DappPayee.dapp
            )

            const dapp = await tasks.contract.query.getDapp(contractAddress)

            this.mockEnv.logger.debug(
                'Dapp registered',
                dapp.value.unwrap().unwrap()
            )

            if (!noPush) {
                this._registeredDapps.push(account)
            }

            return account
        } catch (e) {
            throw this.createError(e as Error, this.registerDapp.name)
        }
    }

    private async dappFund(account: Account) {
        await this.changeSigner(account)

        const tasks = new Tasks(this.mockEnv)

        await tasks.contract.tx.dappFund(accountContract(account), {
            value: this.stakeAmount,
        })
    }

    public async registerDappWithStake(fund: boolean): Promise<Account> {
        try {
            const url = urlBase + randomAsHex().slice(0, 8)
            const account = await this.registerDapp(fund, url, true)
            await this.dappFund(account)

            this._registeredDappsWithStake.push(account)

            return account
        } catch (e) {
            throw new Error(String(e))
        }
    }

    public async registerDappUser(fund: boolean): Promise<Account> {
        const account = this.createAccount()
        if (fund) {
            await this.sendFunds(
                accountAddress(account),
                'DappUser',
                this.sendAmount
            )
        }

        this._registeredDappUsers.push(account)

        return account
    }

    createError(err: Error, functionName: string): ProsopoEnvError {
        const e: {
            error?: Error
        } = {
            error: err,
        }
        return new ProsopoEnvError('DEVELOPER.CREATE_ACCOUNT_FAILED', {
            context: { functionName, e },
        })
    }
}

export default DatabasePopulator

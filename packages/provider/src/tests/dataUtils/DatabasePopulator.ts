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
import { Abi } from '@polkadot/api-contract/Abi'
import { AnyNumber } from '@polkadot/types-codec/types'
import { AppTestAccount, ProviderTestAccount } from '@prosopo/env'
import { BN } from '@polkadot/util/bn'
import { ContractDeployer, TransactionQueue, getPairAsync, wrapQuery } from '@prosopo/contract'
import { ContractSubmittableResult } from '@polkadot/api-contract/base/Contract'
import { DappPayee, Payee } from '@prosopo/captcha-contract/types-returns'
import { DatasetWithIdsAndTree } from '@prosopo/types'
import { EventRecord } from '@polkadot/types/interfaces'
import { IDatabaseAccounts } from './DatabaseAccounts.js'
import { KeyringPair } from '@polkadot/keyring/types'
import { LogLevel, Logger, ProsopoContractError, ProsopoEnvError, getLogLevel, getLogger } from '@prosopo/common'
import { ProviderEnvironment, TestAccount } from '@prosopo/env'
import { ReturnNumber } from '@prosopo/typechain-types'
import { Tasks } from '../../tasks/index.js'
import { sendFunds as _sendFunds, getSendAmount, getStakeAmount } from './funds.js'
import { accountAddress, accountContract, accountMnemonic } from '../accounts.js'
import { createType } from '@polkadot/types/create'
import { datasetWithSolutionHashes } from '@prosopo/datasets'
import { get } from '@prosopo/util'
import { mnemonicGenerate } from '@polkadot/util-crypto/mnemonic'
import { randomAsHex } from '@polkadot/util-crypto/random'
import { stringToU8a } from '@polkadot/util/string'

const urlBase = 'http://localhost'

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
    registerProvider: (fund: boolean, url?: string, noPush?: boolean) => Promise<TestAccount>
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    registerProviderWithStake: (fund: boolean) => Promise<TestAccount>
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    registerProviderWithStakeAndDataset: (fund: boolean) => Promise<TestAccount>
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    registerDapp: (fund: boolean, noPush?: boolean) => Promise<TestAccount>
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    registerDappWithStake: (fund: boolean) => Promise<TestAccount>
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    registerDappUser: (fund: boolean) => Promise<TestAccount>
}

class DatabasePopulator implements IDatabaseAccounts, IDatabasePopulatorMethods {
    private mockEnv: ProviderEnvironment

    private _transactionQueue: TransactionQueue | undefined

    private _registeredProviders: ProviderTestAccount[] = []

    private _registeredProvidersWithStake: ProviderTestAccount[] = []

    private _registeredProvidersWithStakeAndDataset: ProviderTestAccount[] = []

    private _registeredDapps: AppTestAccount[] = []

    private _registeredDappsWithStake: AppTestAccount[] = []

    private _registeredDappUsers: TestAccount[] = []

    private _registeredProviderUrls: Set<string> = new Set<string>()

    private providerStakeDefault: number | BN = 0

    private stakeAmount: number | BN = 0
    private sendAmount: number | BN = 0
    private dappAbiMetadata: Abi
    private dappWasm: Uint8Array
    private logger: Logger

    private _isReady: Promise<void>

    constructor(env: ProviderEnvironment, dappAbiMetadata: Abi, dappWasm: Uint8Array, logLevel?: LogLevel) {
        this.mockEnv = env
        this.dappAbiMetadata = dappAbiMetadata
        this.dappWasm = dappWasm
        this.logger = getLogger(getLogLevel(logLevel), 'DatabasePopulator')
        this._isReady = this.mockEnv.isReady().then(() => {
            try {
                this._transactionQueue = new TransactionQueue(
                    this.mockEnv.getApi(),
                    this.mockEnv.getPair(),
                    this.logger.getLogLevel()
                )
                const tasks = new Tasks(this.mockEnv)
                const promiseStakeDefault: Promise<ReturnNumber> = wrapQuery(
                    tasks.contract.query.getProviderStakeThreshold,
                    tasks.contract.query
                )()
                return promiseStakeDefault.then((res) => {
                    this.providerStakeDefault = new BN(res.toNumber())
                    this.stakeAmount = getStakeAmount(env, this.providerStakeDefault)
                    this.sendAmount = getSendAmount(env, this.stakeAmount)
                })
            } catch (e) {
                throw new Error(String(e))
            }
        })
    }

    get transactionQueue(): TransactionQueue {
        if (!this._transactionQueue) {
            throw new ProsopoEnvError('GENERAL.ENVIRONMENT_NOT_READY')
        }
        return this._transactionQueue
    }

    set transactionQueue(txQueue: TransactionQueue) {
        this._transactionQueue = txQueue
    }

    get providers(): ProviderTestAccount[] {
        return this._registeredProviders
    }

    set providers(providers: ProviderTestAccount[]) {
        this._registeredProviders = providers
    }

    get providersWithStake(): ProviderTestAccount[] {
        return this._registeredProvidersWithStake
    }

    set providersWithStake(accounts: ProviderTestAccount[]) {
        this._registeredProvidersWithStake = accounts
    }

    get providersWithStakeAndDataset(): ProviderTestAccount[] {
        return this._registeredProvidersWithStakeAndDataset
    }

    set providersWithStakeAndDataset(accounts: ProviderTestAccount[]) {
        this._registeredProvidersWithStakeAndDataset = accounts
    }

    get dapps(): AppTestAccount[] {
        return this._registeredDapps
    }

    set dapps(accounts: AppTestAccount[]) {
        this._registeredDapps = accounts
    }

    get dappsWithStake(): AppTestAccount[] {
        return this._registeredDappsWithStake
    }

    set dappsWithStake(accounts: AppTestAccount[]) {
        this._registeredDappsWithStake = accounts
    }

    get dappUsers(): TestAccount[] {
        return this._registeredDappUsers
    }

    set dappUsers(accounts: TestAccount[]) {
        this._registeredDappUsers = accounts
    }

    public isReady() {
        return this._isReady
    }

    private createAccount(): TestAccount {
        const account = this.createAccountAndAddToKeyring()

        if (!account) {
            throw new ProsopoEnvError('DEVELOPER.CREATE_ACCOUNT_FAILED')
        }

        return { address: account[1], mnemonic: account[0], contractAddress: undefined }
    }

    private createAccountAndAddToKeyring(): [string, string] {
        const mnemonic: string = mnemonicGenerate()
        const account = this.mockEnv.keyring.addFromMnemonic(mnemonic)
        const { address } = account
        return [mnemonic, address]
    }

    private sendFunds(account: TestAccount, payee: string, amount: AnyNumber): Promise<void>
    private sendFunds(address: string, payee: string, amount: AnyNumber): Promise<void>
    private sendFunds(account: TestAccount | string, payee: string, amount: AnyNumber): Promise<void> {
        const address = typeof account === 'string' ? account : accountAddress(account)

        return _sendFunds(this.mockEnv, address, payee.toString(), amount, this.transactionQueue)
    }

    private async changeSigner(account: TestAccount): Promise<void>
    private async changeSigner(mnemonic: string): Promise<void>
    private async changeSigner(account: TestAccount | string): Promise<void> {
        const mnemonic = typeof account === 'string' ? account : accountMnemonic(account)

        if (!this.mockEnv.contractInterface) {
            throw new ProsopoEnvError('DEVELOPER.NO_MOCK_ENV')
        }
        const network = this.mockEnv.config.networks[this.mockEnv.defaultNetwork]
        const pair = await getPairAsync(network, mnemonic, '')

        return this.mockEnv.changeSigner(pair)
    }

    public async registerProvider(fund: boolean, url?: string, noPush?: boolean): Promise<ProviderTestAccount> {
        try {
            const urlString = url || this.randomUrl()
            const _url = Array.from(stringToU8a(urlString))

            const account = this.createAccount()
            this.logger.debug(
                'Registering provider',
                '`',
                accountAddress(account),
                '`',
                'with url',
                urlString,
                'and mnemonic',
                '`',
                accountMnemonic(account),
                '`'
            )
            if (fund) {
                await this.sendFunds(accountAddress(account), 'Provider', this.sendAmount)
            }

            // Need to use the provider pair when registering the provider
            await this.changeSigner(accountMnemonic(account))
            const pair = await this.mockEnv.getSigner()

            const tasks = new Tasks(this.mockEnv)
            const args = [_url, PROVIDER_FEE, PROVIDER_PAYEE]
            const result = await this.submitTx(tasks, 'providerRegister', args, this.stakeAmount, pair)
            this.logger.info(
                'Provider registered with account',
                accountAddress(account),
                'url',
                urlString,
                result.toHuman()
            )
            const _provider = (await tasks.contract.query.getProvider(accountAddress(account))).value.unwrap().unwrap()
            const providerTestAccount = {
                ...account,
                contractValue: _provider,
            }
            if (!noPush) {
                this._registeredProviders.push(providerTestAccount)
            }
            return providerTestAccount
        } catch (e) {
            throw this.createError(e as Error, this.registerProvider.name)
        }
    }

    private async updateProvider(account: ProviderTestAccount) {
        try {
            await this.changeSigner(account)
            const pair = await this.mockEnv.getSigner()
            const tasks = new Tasks(this.mockEnv)
            const args = [
                account.contractValue.url,
                createType(this.mockEnv.getContractInterface().abi.registry, 'Balance', PROVIDER_FEE),
                PROVIDER_PAYEE,
            ]
            this.logger.info('Updating provider', account.address, account.contractValue)
            await this.submitTx(tasks, 'providerUpdate', args, 0, pair)
            this.logger.info('Provider updated', account.address)
            return (await tasks.contract.query.getProvider(accountAddress(account))).value.unwrap().unwrap()
        } catch (e) {
            throw this.createError(e as Error, this.updateProvider.name)
        }
    }

    public async registerProviderWithStake(fund: boolean): Promise<ProviderTestAccount> {
        try {
            const url = this.randomUrl()

            const account = await this.registerProvider(fund, url, true)

            const provider = await this.updateProvider(account)

            this._registeredProvidersWithStake.push({
                ...account,
                contractValue: provider,
            })

            return account
        } catch (e) {
            throw this.createError(e as Error, this.registerProviderWithStake.name)
        }
    }

    private async addDataset(account: TestAccount, dataset: DatasetWithIdsAndTree) {
        try {
            await this.changeSigner(account)

            const tasks = new Tasks(this.mockEnv)

            await tasks.providerSetDataset(dataset)
            return (await tasks.contract.query.getProvider(accountAddress(account))).value.unwrap().unwrap()
        } catch (e) {
            throw this.createError(e as Error, this.addDataset.name)
        }
    }

    public async registerProviderWithStakeAndDataset(fund: boolean): Promise<TestAccount> {
        try {
            const url = this.randomUrl()
            this.logger.debug('url when registering provider with stake and dataset', url)
            const account = await this.registerProvider(fund, url, true)
            this.logger.debug('url when registering provider with stake and dataset', url, account.address)
            await this.updateProvider(account)
            const provider = await this.addDataset(account, datasetWithSolutionHashes)

            this._registeredProvidersWithStakeAndDataset.push({
                ...account,
                contractValue: provider,
            })

            return account
        } catch (e) {
            throw this.createError(e as Error, this.registerProviderWithStakeAndDataset.name)
        }
    }

    public async registerDapp(fund: boolean, noPush?: boolean): Promise<TestAccount> {
        try {
            const account = this.createAccount()
            this.logger.debug('Sending funds to `', accountAddress(account), '`')
            if (fund) {
                await this.sendFunds(accountAddress(account), 'Dapp', this.sendAmount)
            }

            this.logger.debug('Changing signer to `', accountAddress(account), '`')
            await this.changeSigner(accountMnemonic(account))

            this.logger.debug('Pair address`', this.mockEnv.pair?.address, '`')
            const tasks = new Tasks(this.mockEnv)
            const dappParams = ['1000000000000000000', 1000, this.mockEnv.getContractInterface().address, 65, 1000000]

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
                this.mockEnv.config.logLevel,
                this.transactionQueue
            )
            const deployResult = await deployer.deploy()

            const instantiateEvent: EventRecord | undefined = deployResult.events.find(
                (event) => event.event.section === 'contracts' && event.event.method === 'Instantiated'
            )
            const contractAddress = String(get<unknown>(instantiateEvent?.event.data, 'contract'))

            account.contractAddress = contractAddress

            this.logger.debug('Dapp contract address', contractAddress)

            const queryResult = await tasks.contract.query.dappRegister(contractAddress, DappPayee.dapp)

            this.logger.debug('Dapp contract queryResult', JSON.stringify(queryResult, null, 4))

            const error = queryResult.value.err || queryResult.value.ok?.err

            if (error) {
                throw new ProsopoContractError(new Error(error))
            }
            this.logger.debug('Submitting TX to queue using account', tasks.contract.pair.address)
            const txResult = await this.submitTx(
                tasks,
                'dappRegister',
                [contractAddress, DappPayee.dapp],
                0,
                tasks.contract.pair
            )
            this.logger.info('App registered', contractAddress, txResult.toHuman())

            if (txResult.isError) {
                throw new ProsopoContractError(new Error(txResult.isError.toString()))
            }

            const dapp = await tasks.contract.query.getDapp(contractAddress)

            this.logger.info('App registered result', dapp.value.unwrap().unwrap())

            if (!noPush) {
                this._registeredDapps.push({
                    ...account,
                    contractValue: dapp.value.unwrap().unwrap(),
                    contractAddress,
                })
            }

            return account
        } catch (e) {
            throw this.createError(e as Error, this.registerDapp.name)
        }
    }

    private async dappFund(account: TestAccount) {
        await this.changeSigner(account)

        const tasks = new Tasks(this.mockEnv)
        this.logger.info('Funding app', accountContract(account), 'from account', tasks.contract.pair.address)
        await this.submitTx(tasks, 'dappFund', [accountContract(account)], this.stakeAmount, tasks.contract.pair)
        this.logger.info('App funded')
        return (await tasks.contract.query.getDapp(accountContract(account))).value.unwrap().unwrap()
    }

    public async registerDappWithStake(fund: boolean): Promise<TestAccount> {
        try {
            const url = this.randomUrl()
            const account = await this.registerDapp(fund, true)
            const dapp = await this.dappFund(account)

            this._registeredDappsWithStake.push({
                ...account,
                contractValue: dapp,
            })

            return account
        } catch (e) {
            throw new Error(String(e))
        }
    }

    public async registerDappUser(fund: boolean): Promise<TestAccount> {
        const account = this.createAccount()

        if (fund) {
            await this.sendFunds(accountAddress(account), 'DappUser', this.sendAmount)
        }

        this._registeredDappUsers.push({
            ...account,
        })

        return account
    }

    private randomUrl(): string {
        let url = `${urlBase}/${randomAsHex()}`
        while (this._registeredProviderUrls.has(url)) {
            url = urlBase + randomAsHex()
        }
        // Add the URL immediately to avoid duplicate url issues
        this._registeredProviderUrls.add(url)
        return url
    }

    private async submitTx(
        tasks: Tasks,
        method: string,
        args: any[],
        value: number | BN,
        pair?: KeyringPair
    ): Promise<ContractSubmittableResult> {
        return new Promise((resolve, reject) => {
            if (
                tasks.contract.nativeContract.tx &&
                method in tasks.contract.nativeContract.tx &&
                tasks.contract.nativeContract.tx[method] !== undefined
            ) {
                try {
                    tasks.contract.dryRunContractMethod(method, args, value).then((extrinsic) => {
                        this.transactionQueue.add(
                            extrinsic,
                            (result: ContractSubmittableResult) => {
                                resolve(result)
                            },
                            pair,
                            method
                        )
                    })
                } catch (err) {
                    reject(err)
                }
            } else {
                reject(new ProsopoContractError('CONTRACT.INVALID_METHOD'))
            }
        })
    }

    createError(err: Error, functionName: string): ProsopoEnvError {
        const e: {
            error?: Error
        } = {
            error: err,
        }
        return new ProsopoEnvError('DEVELOPER.CREATE_ACCOUNT_FAILED', {
            context: { functionName, e },
            logLevel: this.logger.getLogLevel(),
        })
    }
}

export default DatabasePopulator

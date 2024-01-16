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

import { ApiPromise } from '@polkadot/api/promise/Api'
import { AssetsResolver, ContractAbi, EnvironmentTypes, NetworkNames } from '@prosopo/types'
import { Database } from '@prosopo/types-database'
import { Databases } from '@prosopo/database'
import { Keyring } from '@polkadot/keyring'
import { KeyringPair } from '@polkadot/keyring/types'
import { LogLevel, Logger, ProsopoEnvError, getLogger } from '@prosopo/common'
import { ProsopoBasicConfigOutput } from '@prosopo/types'
import { ProsopoCaptchaContract } from '@prosopo/contract'
import { ProsopoEnvironment } from '@prosopo/types-env'
import { WsProvider } from '@polkadot/rpc-provider/ws'
import { ContractAbi as abiJson } from '@prosopo/captcha-contract/contract-info'
import { get } from '@prosopo/util'
import { isAddress } from '@polkadot/util-crypto/address'

export class Environment implements ProsopoEnvironment {
    config: ProsopoBasicConfigOutput
    db: Database | undefined
    contractInterface: ProsopoCaptchaContract | undefined
    contractAddress: string
    defaultEnvironment: EnvironmentTypes
    defaultNetwork: NetworkNames
    contractName: string
    abi: ContractAbi
    logger: Logger
    assetsResolver: AssetsResolver | undefined
    wsProvider: WsProvider
    keyring: Keyring
    pair: KeyringPair | undefined
    api: ApiPromise | undefined

    constructor(config: ProsopoBasicConfigOutput, pair?: KeyringPair) {
        this.config = config
        this.defaultEnvironment = this.config.defaultEnvironment
        this.defaultNetwork = this.config.defaultNetwork
        this.pair = pair
        this.logger = getLogger(this.config.logLevel, `ProsopoEnvironment`)
        if (
            this.config.defaultNetwork &&
            Object.prototype.hasOwnProperty.call(this.config.networks, this.config.defaultNetwork) &&
            this.config.networks &&
            this.config.networks[this.defaultNetwork]
        ) {
            const network = this.config.networks[this.defaultNetwork]
            this.logger.info(`Endpoint: ${network?.endpoint}`)
            this.wsProvider = new WsProvider(network?.endpoint)
            this.contractAddress = network?.contract.address
            this.contractName = network?.contract.name

            this.keyring = new Keyring({
                type: 'sr25519', // TODO get this from the chain
            })
            if (this.pair) this.keyring.addPair(this.pair)
            this.abi = JSON.parse(abiJson)
            this.importDatabase().catch((err) => {
                this.logger.error(err)
            })
        } else {
            throw new ProsopoEnvError('CONFIG.UNKNOWN_ENVIRONMENT', {
                context: { constructor: this.constructor.name, environment: this.config.defaultEnvironment },
            })
        }
    }

    async getSigner(): Promise<void> {
        if (this.pair) {
            await this.getApi().isReadyOrError
            try {
                this.pair = this.keyring.addPair(this.pair)
            } catch (error) {
                throw new ProsopoEnvError('CONTRACT.SIGNER_UNDEFINED', {
                    context: { failedFuncName: this.getSigner.name, error },
                })
            }
        }
    }

    getContractInterface(): ProsopoCaptchaContract {
        if (this.contractInterface === undefined) {
            throw new ProsopoEnvError('CONTRACT.CONTRACT_UNDEFINED')
        }
        return this.contractInterface
    }

    getApi(): ApiPromise {
        if (this.api === undefined) {
            throw new ProsopoEnvError(new Error('api not setup! Please call isReady() first'))
        }
        return this.api
    }

    async changeSigner(pair: KeyringPair): Promise<void> {
        await this.getApi().isReadyOrError
        this.pair = pair
        await this.getSigner()
        this.contractInterface = await this.getContractApi()
    }

    async getContractApi(): Promise<ProsopoCaptchaContract> {
        const nonce = this.pair ? await this.getApi().rpc.system.accountNextIndex(this.pair.address) : 0
        if (!isAddress(this.contractAddress)) {
            throw new ProsopoEnvError('CONTRACT.CONTRACT_UNDEFINED')
        }
        this.contractInterface = new ProsopoCaptchaContract(
            this.getApi(),
            this.abi,
            this.contractAddress,
            this.contractName,
            parseInt(nonce.toString()),
            this.pair,
            this.config.logLevel as unknown as LogLevel,
            this.config.account.address // allows calling the contract from a public address only
        )
        return this.contractInterface
    }

    async isReady() {
        try {
            if (this.pair && this.config.account.password) {
                this.pair.unlock(this.config.account.password)
            }
            if (!this.api) {
                this.api = await ApiPromise.create({ provider: this.wsProvider, initWasm: false })
            }
            await this.getSigner()
            // make sure contract address is valid before trying to load contract interface
            if (isAddress(this.contractAddress)) {
                this.contractInterface = await this.getContractApi()
            }
            if (!this.db) {
                await this.importDatabase().catch((err) => {
                    this.logger.error(err)
                })
            }
            if (this.db && this.db.connection?.readyState !== 1) {
                this.logger.warn(`Database connection is not ready, reconnecting...`)
                await this.db.connect()
                this.logger.info(`Connected to db`)
            }
        } catch (err) {
            throw new ProsopoEnvError('GENERAL.ENVIRONMENT_NOT_READY', { context: { error: err }, logger: this.logger })
        }
    }

    async importDatabase(): Promise<void> {
        try {
            if (this.config.database) {
                const dbConfig = this.config.database[this.defaultEnvironment]
                if (dbConfig) {
                    const ProsopoDatabase = get(Databases, dbConfig.type)
                    this.db = await ProsopoDatabase.create(
                        dbConfig.endpoint,
                        dbConfig.dbname,
                        this.logger,
                        dbConfig.authSource
                    )
                }
            }
        } catch (error) {
            throw new ProsopoEnvError('DATABASE.DATABASE_IMPORT_FAILED', {
                context: {
                    error,
                    environment: this.config.database
                        ? this.config.database[this.defaultEnvironment]
                            ? this.config.database[this.defaultEnvironment]?.type
                            : undefined
                        : undefined,
                },
            })
        }
    }
}

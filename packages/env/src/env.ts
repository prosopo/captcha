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

import { ApiPromise } from '@polkadot/api'
import { AssetsResolver, ContractAbi, EnvironmentTypes } from '@prosopo/types'
import { Database } from '@prosopo/types-database'
import { Databases } from '@prosopo/database'
import { Keyring } from '@polkadot/keyring'
import { KeyringPair } from '@polkadot/keyring/types'
import { LogLevel, Logger, ProsopoEnvError, getLogger } from '@prosopo/common'
import { ProsopoBasicConfig } from '@prosopo/types'
import { ProsopoCaptchaContract, abiJson } from '@prosopo/contract'
import { ProsopoEnvironment } from '@prosopo/types-env'
import { WsProvider } from '@polkadot/rpc-provider'

export class Environment implements ProsopoEnvironment {
    config: ProsopoBasicConfig
    db: Database | undefined
    contractInterface: ProsopoCaptchaContract
    contractAddress: string
    defaultEnvironment: EnvironmentTypes
    contractName: string
    abi: ContractAbi
    logger: Logger
    assetsResolver: AssetsResolver | undefined
    wsProvider: WsProvider
    keyring: Keyring
    pair: KeyringPair
    api: ApiPromise

    constructor(pair: KeyringPair, config: ProsopoBasicConfig) {
        this.config = config
        this.defaultEnvironment = this.config.defaultEnvironment
        this.pair = pair
        this.logger = getLogger(this.config.logLevel, `ProsopoEnvironment`)
        if (
            this.config.defaultEnvironment &&
            Object.prototype.hasOwnProperty.call(this.config.networks, this.config.defaultEnvironment) &&
            this.config.networks &&
            this.config.networks[this.defaultEnvironment]
        ) {
            this.logger.info(`Endpoint: ${this.config.networks[this.defaultEnvironment]?.endpoint}`)
            this.wsProvider = new WsProvider(this.config.networks[this.defaultEnvironment]?.endpoint)
            this.contractAddress = this.config.networks[this.defaultEnvironment]?.contract.address || ''
            this.contractName = this.config.networks[this.defaultEnvironment]?.contract.name || ''

            this.keyring = new Keyring({
                type: 'sr25519', // TODO get this from the chain
            })
            this.keyring.addPair(this.pair)
            this.abi = abiJson as ContractAbi
            this.importDatabase().catch((err) => {
                this.logger.error(err)
            })
        } else {
            throw new ProsopoEnvError(
                'CONFIG.UNKNOWN_ENVIRONMENT',
                this.constructor.name,
                {},
                this.config.defaultEnvironment
            )
        }
    }

    async getSigner(): Promise<void> {
        if (!this.api) {
            this.api = await ApiPromise.create({ provider: this.wsProvider })
        }
        await this.api.isReadyOrError
        try {
            this.pair = this.keyring.addPair(this.pair)
        } catch (err) {
            throw new ProsopoEnvError('CONTRACT.SIGNER_UNDEFINED', this.getSigner.name, {}, err)
        }
    }

    async changeSigner(pair: KeyringPair): Promise<void> {
        await this.api.isReadyOrError
        this.pair = pair
        await this.getSigner()
        this.contractInterface = await this.getContractApi()
    }

    async getContractApi(): Promise<ProsopoCaptchaContract> {
        const nonce = await this.api.rpc.system.accountNextIndex(this.pair.address)
        this.contractInterface = new ProsopoCaptchaContract(
            this.api,
            this.abi,
            this.contractAddress,
            this.pair,
            this.contractName,
            nonce.toNumber(),
            this.config.logLevel as unknown as LogLevel
        )
        return this.contractInterface
    }

    async isReady() {
        try {
            if (this.config.account.password) {
                this.pair.unlock(this.config.account.password)
            }
            if (!this.api) {
                this.api = await ApiPromise.create({ provider: this.wsProvider })
            }
            await this.getSigner()
            this.contractInterface = await this.getContractApi()
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
            this.logger.error(err)
            throw new ProsopoEnvError(err, 'GENERAL.ENVIRONMENT_NOT_READY')
        }
    }

    async importDatabase(): Promise<void> {
        try {
            if (this.config.database) {
                const dbConfig = this.config.database[this.defaultEnvironment]
                if (dbConfig) {
                    const ProsopoDatabase = Databases[dbConfig.type]
                    this.db = await ProsopoDatabase.create(
                        dbConfig.endpoint,
                        dbConfig.dbname,
                        this.logger,
                        dbConfig.authSource
                    )
                }
            }
        } catch (err) {
            throw new ProsopoEnvError(
                err,
                'DATABASE.DATABASE_IMPORT_FAILED',
                {},
                this.config.database
                    ? this.config.database[this.defaultEnvironment]
                        ? this.config.database[this.defaultEnvironment]?.type
                        : undefined
                    : undefined
            )
        }
    }
}

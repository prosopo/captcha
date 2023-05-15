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

import { ApiPromise } from '@polkadot/api'
import { Keyring } from '@polkadot/keyring'
import { KeyringPair } from '@polkadot/keyring/types'
import { WsProvider } from '@polkadot/rpc-provider'
import { Logger, ProsopoEnvError, logger } from '@prosopo/common'
import { ProsopoContractMethods, abiJson } from '@prosopo/contract'
import { loadEnv } from '@prosopo/env'
import { AssetsResolver, ContractAbi, EnvironmentTypes, IProsopoContractMethods, ProsopoConfig } from '@prosopo/types'
import { Database } from '@prosopo/types-database'
import { ProsopoEnvironment } from '@prosopo/types-env'
import { LogLevel } from 'consola'
import { LocalAssetsResolver } from './assets'
import prosopoConfig from './prosopo.config'
import { Databases } from '@prosopo/database'

export class Environment implements ProsopoEnvironment {
    config: ProsopoConfig
    db: Database | undefined
    contractInterface: IProsopoContractMethods
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

    constructor(pair: KeyringPair) {
        loadEnv()
        this.config = Environment.getConfig()
        this.pair = pair
        this.logger = logger(this.config.logLevel, `ProsopoEnvironment`)
        if (
            this.config.defaultEnvironment &&
            Object.prototype.hasOwnProperty.call(this.config.networks, this.config.defaultEnvironment)
        ) {
            this.defaultEnvironment = this.config.defaultEnvironment
            this.logger.info(`Endpoint: ${this.config.networks[this.defaultEnvironment].endpoint}`)
            this.wsProvider = new WsProvider(this.config.networks[this.defaultEnvironment].endpoint)
            this.contractAddress = this.config.networks[this.defaultEnvironment].contract.address
            this.contractName = this.config.networks[this.defaultEnvironment].contract.name

            this.keyring = new Keyring({
                type: 'sr25519', // TODO get this from the chain
            })
            this.keyring.addPair(this.pair)

            this.abi = abiJson as ContractAbi
            this.importDatabase().catch((err) => {
                this.logger.error(err)
            })
            this.assetsResolver = new LocalAssetsResolver({
                absolutePath: this.config.assets.absolutePath,
                basePath: this.config.assets.basePath,
                serverBaseURL: this.config.server.baseURL,
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

    async getContractApi(): Promise<IProsopoContractMethods> {
        const nonce = await this.api.rpc.system.accountNextIndex(this.pair.address)
        this.logger.debug('Getting new contract instance with pair', this.pair.address, 'nonce', nonce.toString())
        this.contractInterface = new ProsopoContractMethods(
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
            this.api = await ApiPromise.create({ provider: this.wsProvider })
            await this.getSigner()
            this.contractInterface = await this.getContractApi()
            await this.db?.connect()
        } catch (err) {
            throw new ProsopoEnvError(err, 'GENERAL.ENVIRONMENT_NOT_READY')
        }
    }

    async importDatabase(): Promise<void> {
        try {
            if (this.config.database) {
                const ProsopoDatabase = Databases[this.config.database[this.defaultEnvironment].type]
                this.db = await ProsopoDatabase.create(
                    this.config.database[this.defaultEnvironment].endpoint,
                    this.config.database[this.defaultEnvironment].dbname,
                    this.logger,
                    this.config.database[this.defaultEnvironment].authSource
                )
            }
        } catch (err) {
            throw new ProsopoEnvError(
                err,
                'DATABASE.DATABASE_IMPORT_FAILED',
                {},
                this.config.database[this.defaultEnvironment].type
            )
        }
    }

    private static getConfig(): ProsopoConfig {
        return prosopoConfig() as ProsopoConfig
    }
}

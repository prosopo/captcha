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

import { AssetsResolver, EnvironmentTypes, NetworkNames } from '@prosopo/types'
import { Database } from '@prosopo/types-database'
import { Databases } from '@prosopo/database'
import { Keyring } from '@polkadot/keyring'
import { KeyringPair } from '@polkadot/keyring/types'
import { Logger, ProsopoEnvError, getLogger } from '@prosopo/common'
import { ProsopoBasicConfigOutput } from '@prosopo/types'
import { ProsopoEnvironment } from '@prosopo/types-env'
import { get } from '@prosopo/util'

export class Environment implements ProsopoEnvironment {
    config: ProsopoBasicConfigOutput
    db: Database | undefined
    contractAddress: string
    defaultEnvironment: EnvironmentTypes
    defaultNetwork: NetworkNames
    contractName: string
    logger: Logger
    assetsResolver: AssetsResolver | undefined
    keyring: Keyring
    pair: KeyringPair | undefined

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
            this.contractAddress = network?.contract.address
            this.contractName = network?.contract.name

            this.keyring = new Keyring({
                type: 'sr25519', // TODO get this from the chain
            })
            if (this.pair) this.keyring.addPair(this.pair)
            this.importDatabase().catch((err) => {
                this.logger.error(err)
            })
        } else {
            throw new ProsopoEnvError('CONFIG.UNKNOWN_ENVIRONMENT', {
                context: { constructor: this.constructor.name, environment: this.config.defaultEnvironment },
            })
        }
    }

    async getSigner(): Promise<KeyringPair> {
        if (!this.pair) {
            throw new ProsopoEnvError('CONTRACT.SIGNER_UNDEFINED', {
                context: { failedFuncName: this.getSigner.name },
            })
        }

        try {
            this.pair = this.keyring.addPair(this.pair)
        } catch (error) {
            throw new ProsopoEnvError('CONTRACT.SIGNER_UNDEFINED', {
                context: { failedFuncName: this.getSigner.name, error },
            })
        }

        return this.pair
    }

    getDb(): Database {
        if (this.db === undefined) {
            throw new ProsopoEnvError(new Error('db not setup! Please call isReady() first'))
        }
        return this.db
    }

    getAssetsResolver(): AssetsResolver {
        if (this.assetsResolver === undefined) {
            throw new ProsopoEnvError(new Error('assetsResolver not setup! Please call isReady() first'))
        }
        return this.assetsResolver
    }

    getPair(): KeyringPair {
        if (this.pair === undefined) {
            throw new ProsopoEnvError(new Error('pair not setup! Please call isReady() first'))
        }
        return this.pair
    }

    async isReady() {
        try {
            if (this.pair && this.config.account.password && this.pair.isLocked) {
                this.pair.unlock(this.config.account.password)
            }
            await this.getSigner()
            // make sure contract address is valid before trying to load contract interface
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

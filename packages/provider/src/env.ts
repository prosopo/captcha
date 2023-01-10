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

import {
    ContractAbi,
    ProsopoContractApi,
    ProsopoContractMethods,
    abiJson,
    generateDefinitions,
} from '@prosopo/contract'
import { AssetsResolver } from '@prosopo/datasets'
import { ProsopoEnvError } from '@prosopo/common'
import consola, { LogLevel } from 'consola'
import dotenv from 'dotenv'
import path from 'path'
import { LocalAssetsResolver } from './assets'
import { Database, EnvironmentTypes, ProsopoConfig, ProsopoEnvironment } from './types'
import prosopoConfig from './prosopo.config'
import { ApiPromise } from '@polkadot/api'
import { WsProvider } from '@polkadot/rpc-provider'
import { Keyring } from '@polkadot/keyring'
import { KeyringPair } from '@polkadot/keyring/types'

export function loadEnv() {
    const args = { path: getEnvFile() }
    dotenv.config(args)
}

export function getEnvFile(filename = '.env', filepath = path.join(__dirname, '..')) {
    const env = process.env.NODE_ENV || 'development'
    return path.join(filepath, `${filename}.${env}`)
}

export class Environment implements ProsopoEnvironment {
    config: ProsopoConfig
    db: Database | undefined
    contractInterface: ProsopoContractMethods
    mnemonic: string
    contractAddress: string
    defaultEnvironment: EnvironmentTypes
    contractName: string
    abi: ContractAbi
    logger: typeof consola
    assetsResolver: AssetsResolver | undefined
    wsProvider: WsProvider
    keyring: Keyring
    pair: KeyringPair
    api: ApiPromise

    constructor(mnemonic: string) {
        loadEnv()
        this.config = Environment.getConfig()
        this.mnemonic = mnemonic
        if (
            this.config.defaultEnvironment &&
            Object.prototype.hasOwnProperty.call(this.config.networks, this.config.defaultEnvironment)
        ) {
            this.defaultEnvironment = this.config.defaultEnvironment
            this.wsProvider = new WsProvider(this.config.networks[this.defaultEnvironment].endpoint)
            this.contractAddress = this.config.networks[this.defaultEnvironment].contract.address
            this.contractName = this.config.networks[this.defaultEnvironment].contract.name
            this.logger = consola.create({
                level: this.config.logLevel as unknown as LogLevel,
            })
            this.keyring = new Keyring({
                type: 'sr25519', // TODO get this from the chain
            })
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
        const { mnemonic } = this
        if (!mnemonic) {
            throw new ProsopoEnvError('CONTRACT.SIGNER_UNDEFINED')
        }
        this.pair = this.keyring.addFromMnemonic(mnemonic)
    }

    async changeSigner(mnemonic: string): Promise<void> {
        await this.api.isReadyOrError
        this.mnemonic = mnemonic
        await this.getSigner()
        await this.getContractApi()
    }

    async getContractApi(): Promise<ProsopoContractApi> {
        this.contractInterface = new ProsopoContractMethods(
            this.api,
            this.abi,
            this.contractAddress,
            this.pair,
            this.contractName
        )
        return this.contractInterface
    }

    async isReady() {
        try {
            this.api = await ApiPromise.create({ provider: this.wsProvider })
            const contractDefinitions = generateDefinitions(['prosopo', 'prosopo'])
            await this.api.registry.register(contractDefinitions.types)
            await this.getSigner()
            await this.getContractApi()
            await this.db?.connect()
        } catch (err) {
            throw new ProsopoEnvError(err, 'GENERAL.ENVIRONMENT_NOT_READY')
        }
    }

    async importDatabase(): Promise<void> {
        try {
            if (this.config.database) {
                const { ProsopoDatabase } = await import(`./db/${this.config.database[this.defaultEnvironment].type}`)
                this.db = new ProsopoDatabase(
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

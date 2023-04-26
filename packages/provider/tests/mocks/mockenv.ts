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
import { ProsopoContractMethods, abiJson } from '@prosopo/contract'
import {} from '@prosopo/datasets'
import { LogLevel, Logger, ProsopoEnvError, loadEnv, logger } from '@prosopo/common'
import { MongoMemoryServer } from 'mongodb-memory-server'
import path from 'path'
import { LocalAssetsResolver } from '../../src/assets'
import {
    AssetsResolver,
    ContractAbi,
    Database,
    DatabaseTypes,
    EnvironmentTypes,
    IProsopoContractMethods,
    ProsopoConfig,
    ProsopoEnvironment,
} from '@prosopo/types'
import { ApiPromise } from '@polkadot/api'
import { WsProvider } from '@polkadot/rpc-provider'
import { Keyring } from '@polkadot/keyring'
import { KeyringPair } from '@polkadot/keyring/types'
import { mnemonicGenerate } from '@polkadot/util-crypto'

export class MockEnvironment implements ProsopoEnvironment {
    config: ProsopoConfig
    db: Database | undefined
    contractInterface: IProsopoContractMethods
    contractAddress: string
    defaultEnvironment: string
    contractName: string
    abi: ContractAbi
    logger: Logger
    assetsResolver: AssetsResolver | undefined
    wsProvider: WsProvider
    keyring: Keyring
    pair: KeyringPair
    api: ApiPromise

    constructor(pair: KeyringPair) {
        loadEnv('../..')
        this.pair = pair
        this.config = {
            logLevel: LogLevel.Debug,
            contract: { abi: '../contract/src/abi/prosopo.json' }, // Deprecated for abiJson.
            defaultEnvironment: EnvironmentTypes.development,
            account: {
                password: '',
            },
            networks: {
                development: {
                    endpoint: process.env.SUBSTRATE_NODE_URL!,
                    contract: {
                        address: process.env.PROTOCOL_CONTRACT_ADDRESS!,
                        name: 'prosopo',
                    },
                    accounts: ['//Alice', '//Bob', '//Charlie', '//Dave', '//Eve', '//Ferdie'],
                },
            },

            captchas: {
                solved: {
                    count: 1,
                },
                unsolved: {
                    count: 1,
                },
            },
            captchaSolutions: {
                requiredNumberOfSolutions: 3,
                solutionWinningPercentage: 80,
                captchaFilePath: path.join(process.cwd(), './tests/mocks/data/captchas.json'),
                captchaBlockRecency: 10,
            },
            database: {
                development: { type: DatabaseTypes.mongo, endpoint: '', dbname: 'prosopo', authSource: '' },
            },
            assets: {
                absolutePath: '',
                basePath: '',
            },
            server: {
                baseURL: '',
            },
            batchCommit: {
                interval: 1000000,
                maxBatchExtrinsicPercentage: 59,
            },
        }

        if (
            this.config.defaultEnvironment &&
            Object.prototype.hasOwnProperty.call(this.config.networks, this.config.defaultEnvironment)
        ) {
            this.defaultEnvironment = this.config.defaultEnvironment
            this.contractAddress = this.config.networks[this.defaultEnvironment].contract.address
            this.contractName = this.config.networks[this.defaultEnvironment].contract.name
            this.logger = logger(this.config.logLevel, 'MockEnvironment')
            this.abi = MockEnvironment.getContractAbi(this.config.contract.abi, this.logger)
            this.keyring = new Keyring({
                type: 'sr25519', // TODO get this from the chain
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

    public createAccountAndAddToKeyring(): [string, string] {
        const mnemonic: string = mnemonicGenerate()
        const account = this.keyring.addFromMnemonic(mnemonic)
        const { address } = account
        return [mnemonic, address]
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

    async changeSigner(pair): Promise<void> {
        await this.api.isReadyOrError
        this.pair = pair
        await this.getSigner()
        await this.getContractApi()
    }

    async getContractApi(): Promise<IProsopoContractMethods> {
        this.contractInterface = new ProsopoContractMethods(
            this.api,
            this.abi,
            this.contractAddress,
            this.pair,
            this.contractName,
            0
        )

        return this.contractInterface
    }

    async isReady(): Promise<void> {
        try {
            if (!this.api) {
                this.api = await ApiPromise.create({ provider: this.wsProvider })
            }
            await this.getSigner()
            await this.getContractApi()
            if (!this.db) {
                await this.importDatabase().catch((err) => {
                    this.logger.error(err)
                })
            } else if (this.db?.connection?.readyState !== 1) {
                this.db
                    .connect()
                    .then(() => {
                        this.logger.info(`connected to db`)
                    })
                    .catch((err) => {
                        this.logger.error(err)
                    })
            }
        } catch (err) {
            throw new ProsopoEnvError(err, 'GENERAL.ENVIRONMENT_NOT_READY')
        }
    }

    async importDatabase(): Promise<void> {
        try {
            const dbPath = path.join(`../../src/db/${this.config.database[this.defaultEnvironment].type}`)
            const { ProsopoDatabase } = await import(dbPath)
            const mongod = await MongoMemoryServer.create()
            const databaseUrl = mongod.getUri()
            this.db = new ProsopoDatabase(
                databaseUrl,
                this.config.database[this.defaultEnvironment].dbname,
                this.logger
            )
        } catch (err) {
            throw new ProsopoEnvError(
                err,
                'DATABASE.DATABASE_IMPORT_FAILED',
                {},
                this.config.database[this.defaultEnvironment].type
            )
        }
    }

    private static getContractAbi(path, logger): ContractAbi {
        return abiJson
    }
}

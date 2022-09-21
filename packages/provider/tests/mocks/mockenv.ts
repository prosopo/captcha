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
    abiJson,
    AssetsResolver,
    ContractAbi,
    ContractApiInterface,
    createNetwork,
    Network,
    ProsopoContractApi,
    ProsopoEnvError
} from '@prosopo/contract';
import consola, { LogLevel } from 'consola';
import { MongoMemoryServer } from "mongodb-memory-server";
import path from 'path';
import { LocalAssetsResolver } from "../../src/assets";
import { loadEnv } from '../../src/env';
import { ERRORS } from '../../src/errors';
import { Database, ProsopoConfig, ProsopoEnvironment } from '../../src/types';


export class MockEnvironment implements ProsopoEnvironment {
    config: ProsopoConfig
    db: Database | undefined
    mnemonic: string
    contractAddress: string
    defaultEnvironment: string
    contractName: string
    contractInterface: ContractApiInterface | undefined
    abi: ContractAbi
    network!: Network
    logger: typeof consola
    assetsResolver: AssetsResolver | undefined

    constructor(mnemonic?: string) {
        loadEnv();
        this.config = {
            logLevel: 'info',
            contract: {abi: '../contract/src/abi/prosopo.json'}, // Deprecated for abiJson.
            defaultEnvironment: 'development',
            networks: {
                development: {
                    endpoint: process.env.SUBSTRATE_NODE_URL!,
                    contract: {
                        address: process.env.CONTRACT_ADDRESS!,
                        name: 'prosopo'
                    },
                    accounts: [
                        '//Alice',
                        '//Bob',
                        '//Charlie',
                        '//Dave',
                        '//Eve',
                        '//Ferdie'
                    ]
                }
            },
            captchas: {
                solved: {
                    count: 1
                },
                unsolved: {
                    count: 1
                }
            },
            captchaSolutions: {
                requiredNumberOfSolutions: 3,
                solutionWinningPercentage: 80,
                captchaFilePath: path.join(process.cwd(), './tests/mocks/data/captchas.json'),
                captchaBlockRecency: 10
            },
            database: {
                development: {type: 'mongo', endpoint: '', dbname: ''}
            },
            assets : {
                absolutePath: '',
                basePath: ''
            },
            server : {
                baseURL: ''
            }
        }
        if (!mnemonic) {
            this.mnemonic = '//Alice'
        }

        if (this.config.defaultEnvironment && Object.prototype.hasOwnProperty.call(this.config.networks, this.config.defaultEnvironment)) {
            this.defaultEnvironment = this.config.defaultEnvironment
            this.contractAddress = this.config.networks[this.defaultEnvironment].contract.address
            this.contractName = this.config.networks[this.defaultEnvironment].contract.name
            this.logger = consola.create({level: LogLevel.Info});
            this.abi = MockEnvironment.getContractAbi(this.config.contract.abi, this.logger)
            this.assetsResolver = new LocalAssetsResolver({
                absolutePath: this.config.assets.absolutePath,
                basePath: this.config.assets.basePath,
                serverBaseURL: this.config.server.baseURL,
            });
        } else {
            throw new ProsopoEnvError(ERRORS.CONFIG.UNKNOWN_ENVIRONMENT.message, this.constructor.name, this.config.defaultEnvironment)
        }
    }


    async isReady(): Promise<void> {
        this.network = await createNetwork(this.mnemonic, this.config.networks![this.defaultEnvironment])
        this.contractInterface = new ProsopoContractApi(this.contractAddress, this.mnemonic, this.contractName, this.abi, this.network)
        // Persist database state for tests
        if (!this.db) {
            consola.debug("Starting database...")
            await this.importDatabase()
            // @ts-ignore
            await this.db?.connect()
        }
        await this.contractInterface?.isReady()
    }

    async importDatabase(): Promise<void> {
        try {
            const dbPath = path.join(`../../src/db/${this.config.database[this.defaultEnvironment].type}`);
            const {ProsopoDatabase} = await import(dbPath)
            const mongod = await MongoMemoryServer.create();
            const databaseUrl = mongod.getUri();
            this.db = new ProsopoDatabase(
                databaseUrl,
                this.config.database[this.defaultEnvironment].dbname,
                this.logger
            )
        } catch (err) {
            throw new ProsopoEnvError(err, ERRORS.DATABASE.DATABASE_IMPORT_FAILED.message, this.config.database[this.defaultEnvironment].type)
        }
    }

    private static getContractAbi(path, logger): ContractAbi {
        return abiJson;
    }

}

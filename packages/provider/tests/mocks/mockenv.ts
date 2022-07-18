// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of provider <https://github.com/prosopo-io/provider>.
//
// provider is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// provider is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with provider.  If not, see <http://www.gnu.org/licenses/>.
import { abiJson, AssetsResolver, ContractAbi, ContractApiInterface, createNetwork, Network, ProsopoContractApi } from '@prosopo/contract';
import {ERRORS} from '../../src/errors'
import consola, {LogLevel} from 'consola'
import {LocalAssetsResolver} from "../../src/assets";
import { loadEnvFile, Database, ProsopoConfig, ProsopoEnvironment } from '../../src';
import {MongoMemoryServer} from "mongodb-memory-server";

const path = require('path');

// TODO mock imageserver.

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
        loadEnvFile();
        this.config = {
            logLevel: 'info',
            contract: {abi: '../contract/src/abi/prosopo.json'},
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
            throw new Error(`${ERRORS.CONFIG.UNKNOWN_ENVIRONMENT.message}:${this.config.defaultEnvironment}`)
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
            throw new Error(`${ERRORS.DATABASE.DATABASE_IMPORT_FAILED.message}:${this.config.database[this.defaultEnvironment].type}:${err}`)
        }
    }

    private static getContractAbi(path, logger): ContractAbi {
        return abiJson;
    }

}

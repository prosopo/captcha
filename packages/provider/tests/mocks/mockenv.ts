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
import {AssetsResolver, Database, ProsopoConfig, ProsopoEnvironment} from '../../src/types'
import {createNetwork, Network} from '@prosopo/contract'
import {ERRORS} from '../../src/errors'
import {network, patract} from 'redspot'
import {ContractAbi, ContractApiInterface, ProsopoContractApi} from '@prosopo/contract'
import {loadJSONFile} from "../../src/util";
import consola, {LogLevel} from 'consola'
import {LocalAssetsResolver} from "../../src/assets";

export class MockEnvironment implements ProsopoEnvironment {
    config: ProsopoConfig
    db: Database | undefined
    mnemonic: string
    deployerAddress: string
    patract: any;
    contractAddress: string
    defaultEnvironment: string
    contractName: string
    contractInterface: ContractApiInterface | undefined
    abi: ContractAbi
    network!: Network
    logger: typeof consola
    assetsResolver: AssetsResolver | undefined

    constructor() {
        this.config = {
            logLevel: 'debug',
            contract: {abi: '/usr/src/packages/contract/src/abi/prosopo.json'},
            defaultEnvironment: 'development',
            networks: {
                development: {
                    endpoint: 'ws://substrate-node:9944',
                    contract: {
                        address: process.env.CONTRACT_ADDRESS!,
                        deployer: {
                            address: '//Alice'
                        },
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
                captchaFilePath: '/usr/src/data/captchas.json'
            },
            database: {
                development: {type: 'mockdb', endpoint: '', dbname: ''}
            },
            assets : {
                absolutePath: '',
                basePath: ''
            },
            server : {
                baseURL: ''
            }
        }
        this.mnemonic = '//Alice'

        this.patract = patract
        if (this.config.defaultEnvironment && Object.prototype.hasOwnProperty.call(this.config.networks, this.config.defaultEnvironment)) {
            this.defaultEnvironment = this.config.defaultEnvironment
            this.deployerAddress = this.config.networks[this.defaultEnvironment].contract.deployer.address
            this.contractAddress = this.config.networks[this.defaultEnvironment].contract.address
            this.contractName = this.config.networks[this.defaultEnvironment].contract.name
            this.logger = consola.create({level: this.config.logLevel as unknown as LogLevel});
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
        this.contractInterface = new ProsopoContractApi(this.deployerAddress, this.contractAddress, this.mnemonic, this.contractName, this.abi, this.network)
        // Persist database state for tests
        if (!this.db) {
            await this.importDatabase()
            // @ts-ignore
            await this.db?.connect()
        }
        await this.contractInterface?.isReady()
    }

    async importDatabase(): Promise<void> {
        try {
            const {ProsopoDatabase} = await import(`./${this.config.database[this.defaultEnvironment].type}`)
            this.db = new ProsopoDatabase(
                this.config.database[this.defaultEnvironment].endpoint,
                this.config.database[this.defaultEnvironment].dbname
            )
        } catch (err) {
            throw new Error(`${ERRORS.DATABASE.DATABASE_IMPORT_FAILED.message}:${this.config.database[this.defaultEnvironment].type}:${err}`)
        }
    }

    private static getContractAbi(path, logger): ContractAbi {
        return loadJSONFile(path, logger) as ContractAbi
    }

}

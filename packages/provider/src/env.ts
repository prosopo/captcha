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
// import { findUpSync } from 'find-up'
import { abiJson, ContractAbi, ContractApiInterface, createNetwork, Network, ProsopoContractApi, AssetsResolver } from '@prosopo/contract';
import consola, { LogLevel } from "consola";
import dotenv from 'dotenv';
import { LocalAssetsResolver } from './assets';
import { ERRORS } from './errors';
import { Database, ProsopoConfig, ProsopoEnvironment } from './types';
import {loadEnvFile} from "./util";


dotenv.config();

import prosopoConfig from './prosopo.config';
// const JS_CONFIG_FILENAME = 'prosopo.config.js'

export class Environment implements ProsopoEnvironment {
    config: ProsopoConfig

    db: Database | undefined

    contractInterface: ContractApiInterface | undefined

    mnemonic: string

    contractAddress: string

    defaultEnvironment: string

    contractName: string

    abi: ContractAbi

    network!: Network

    logger: typeof consola

    assetsResolver: AssetsResolver | undefined

    constructor(mnemonic: string) {
        loadEnvFile();
        this.config = Environment.getConfig()
        this.mnemonic = mnemonic
        if (this.config.defaultEnvironment && Object.prototype.hasOwnProperty.call(this.config.networks, this.config.defaultEnvironment)) {
            this.defaultEnvironment = this.config.defaultEnvironment
            this.contractAddress = this.config.networks![this.defaultEnvironment].contract.address
            this.contractName = this.config.networks![this.defaultEnvironment].contract.name
            this.logger = consola.create({ level: this.config.logLevel as unknown as LogLevel });
            // this.abi = Environment.getContractAbi(this.config.contract.abi, this.logger) as ContractAbi
            this.abi = abiJson as ContractAbi;


            this.assetsResolver = new LocalAssetsResolver({
                absolutePath: this.config.assets.absolutePath,
                basePath: this.config.assets.basePath,
                serverBaseURL: this.config.server.baseURL,
            });
        } else {
            throw new Error(`${ERRORS.CONFIG.UNKNOWN_ENVIRONMENT}:${this.config.defaultEnvironment}`)
        }
    }

    async isReady() {
        this.network = await createNetwork(this.mnemonic, this.config.networks![this.defaultEnvironment])
        this.contractInterface = new ProsopoContractApi(this.contractAddress, this.mnemonic, this.contractName, this.abi, this.network)
        await this.importDatabase()
        await this.db?.connect()
        await this.contractInterface?.isReady()
    }

    async importDatabase(): Promise<void> {
        try {
            if (this.config.database) {
                const { ProsopoDatabase } = await import(`./db/${this.config.database![this.defaultEnvironment!].type!}`)
                this.db = new ProsopoDatabase(
                    this.config.database![this.defaultEnvironment].endpoint,
                    this.config.database![this.defaultEnvironment].dbname
                )
            }
        } catch (err) {
            throw new Error(`${ERRORS.DATABASE.DATABASE_IMPORT_FAILED.message}:${this.config.database[this.defaultEnvironment].type}:${err}`)
        }
    }

    private static getConfig(): ProsopoConfig {
        return prosopoConfig as ProsopoConfig;
    }

}

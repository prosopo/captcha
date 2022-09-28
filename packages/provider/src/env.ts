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
// import { findUpSync } from 'find-up'
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
import consola, { LogLevel } from "consola";
import dotenv from 'dotenv';
import path from 'path';
import { LocalAssetsResolver } from './assets';
import { ERRORS } from './errors';
import { Database, ProsopoConfig, ProsopoEnvironment } from './types';
// import { loadEnvFile } from "./util";

// loadEnv();

import prosopoConfig from './prosopo.config';

export function loadEnv() {
    dotenv.config({ path: getEnvFile() });
}

export function getEnvFile(filename = '.env', filepath = './') {
    const env =  process.env.NODE_ENV || 'development';
    return path.join(filepath, `${filename}.${env}`);
}

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
        loadEnv()
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
            throw new ProsopoEnvError("CONFIG.UNKNOWN_ENVIRONMENT", this.constructor.name, {}, this.config.defaultEnvironment)
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
            throw new ProsopoEnvError(err, "DATABASE.DATABASE_IMPORT_FAILED", {}, this.config.database[this.defaultEnvironment].type)
        }
    }

    private static getConfig(): ProsopoConfig {
        return prosopoConfig() as ProsopoConfig
    }

}

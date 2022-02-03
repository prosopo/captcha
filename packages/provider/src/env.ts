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
import findUp from 'find-up'
// @ts-ignore
import { network, patract } from 'redspot'
import { Network } from 'redspot/types'
import { Signer } from 'redspot/provider'
import Contract from '@redspot/patract/contract'
import { strict as assert } from 'assert'
import { ZodError } from 'zod'
import { ERRORS } from './errors'
import { Database, ProsopoConfig, ProsopoConfigSchema, ProsopoEnvironment } from './types'
import { contractDefinitions } from './contract/definitions'

require('dotenv').config()

const { mnemonicGenerate } = require('@polkadot/util-crypto')

const TS_CONFIG_FILENAME = 'prosopo.config.ts'
const JS_CONFIG_FILENAME = 'prosopo.config.js'
const CONTRACT_NAME = 'prosopo'

export class Environment implements ProsopoEnvironment {
    config: ProsopoConfig

    network: Network

    contract?: Contract

    db: Database | undefined

    mnemonic: string

    signer?: Signer

    deployerAddress: string

    patract: any;

    contractAddress: string

    defaultEnvironment: string

    constructor (mnemonic) {
        this.config = Environment.getConfig()
        this.network = network
        this.patract = patract
        this.mnemonic = mnemonic
        if (this.config.defaultEnvironment && Object.prototype.hasOwnProperty.call(this.config.networks, this.config.defaultEnvironment)) {
            this.defaultEnvironment = this.config.defaultEnvironment
            this.deployerAddress = this.config.networks[this.defaultEnvironment].contract.deployer.address
            this.contractAddress = this.config.networks[this.defaultEnvironment].contract.address
        } else {
            throw new Error(`${ERRORS.CONFIG.UNKNOWN_ENVIRONMENT}:${this.config.defaultEnvironment}`)
        }
    }

    async isReady () {
        await this.getSigner()
        await this.getContract()
        await this.importDatabase()
        await this.db?.connect()
        // redspot will do this if using `npx redspot` commands. do it here anyway in case using `yarn ts-node ...`
        this.network.registry.register(contractDefinitions)
        assert(this.contract instanceof Contract)
    }

    async importDatabase (): Promise<void> {
        try {
            const { ProsopoDatabase } = await import(`./db/${this.config.database[this.defaultEnvironment].type}`)
            this.db = new ProsopoDatabase(
                this.config.database[this.defaultEnvironment].endpoint,
                this.config.database[this.defaultEnvironment].dbname
            )
        } catch (err) {
            throw new Error(`${ERRORS.DATABASE.DATABASE_IMPORT_FAILED.message}:${this.config.database[this.defaultEnvironment].type}:${err}`)
        }
    }

    async getContract (): Promise<void> {
        await this.network.api.isReadyOrError
        const contractFactory = await patract.getContractFactory(CONTRACT_NAME, this.signer)
        this.contract = contractFactory.attach(this.contractAddress)
    }

    async getSigner (): Promise<void> {
        await this.network.api.isReadyOrError
        const { mnemonic } = this
        if (mnemonic) {
            const keyringPair = this.network.keyring.addFromMnemonic(mnemonic)
            // @ts-ignore
            this.signer = this.network.createSigner(keyringPair)
        }
    }

    async changeSigner (mnemonic: string): Promise<void> {
        await this.network.api.isReadyOrError
        this.mnemonic = mnemonic
        await this.getSigner()
    }

    createAccountAndAddToKeyring (): [string, string] {
        const mnemonic: string = mnemonicGenerate()
        const account = this.network.keyring.addFromMnemonic(mnemonic)
        const { address } = account
        return [mnemonic, address]
    }

    private static getConfigPath (): string {
        const tsConfigPath = findUp.sync(TS_CONFIG_FILENAME)
        if (tsConfigPath !== undefined) {
            return tsConfigPath
        }

        const pathToConfigFile = findUp.sync(JS_CONFIG_FILENAME)

        if (pathToConfigFile === undefined) {
            throw new Error(ERRORS.GENERAL.CANNOT_FIND_CONFIG_FILE.message)
        }

        return pathToConfigFile
    }

    private static getConfig (): ProsopoConfig {
        try {
            const filePath = Environment.getConfigPath()
            const config = Environment.importCsjOrEsModule(filePath)
            return ProsopoConfigSchema.parse(config)
        } catch (error) {
            if (error instanceof ZodError) {
                const { path, message } = error.issues[0]
                throw new Error(`${path.join('.')} ${message}`)
            }
            throw new Error(ERRORS.CONFIG.CONFIGURATIONS_LOAD_FAILED.message)
        }
    }

    private static importCsjOrEsModule (filePath: string): any {
        const imported = require(filePath)
        return imported.default !== undefined ? imported.default : imported
    }
}

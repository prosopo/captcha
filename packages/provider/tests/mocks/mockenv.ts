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
import { Database, ProsopoConfig, ProsopoEnvironment } from '../../src/types'
import { Network, Signer } from 'redspot/types'
import Contract from '@redspot/patract/contract'
import { ERRORS } from '../../src/errors'
import { network, patract } from 'redspot'
import { contractDefinitions } from '../../src/contract/definitions'
import { strict as assert } from 'assert'

const { mnemonicGenerate } = require('@polkadot/util-crypto')

const CONTRACT_NAME = 'prosopo'

export class MockEnvironment implements ProsopoEnvironment {
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

    constructor () {
        this.config = {
            defaultEnvironment: 'development',
            networks: {
                development: {
                    endpoint: 'ws://substrate-node:9944',
                    contract: {
                        address: process.env.CONTRACT_ADDRESS!,
                        deployer: {
                            address: '//Alice'
                        }
                    }
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
                development: { type: 'mockdb', endpoint: '', dbname: '' }
            }
        }
        this.mnemonic = '//Alice'
        this.network = network
        this.patract = patract
        if (this.config.defaultEnvironment && Object.prototype.hasOwnProperty.call(this.config.networks, this.config.defaultEnvironment)) {
            this.defaultEnvironment = this.config.defaultEnvironment
            this.deployerAddress = this.config.networks[this.defaultEnvironment].contract.deployer.address
            this.contractAddress = this.config.networks[this.defaultEnvironment].contract.address
        } else {
            throw new Error(`${ERRORS.CONFIG.UNKNOWN_ENVIRONMENT.message}:${this.config.defaultEnvironment}`)
        }
    }

    async isReady (): Promise<void> {
        await this.getSigner()
        await this.getContract()
        // Persist database state for tests
        if (!this.db) {
            await this.importDatabase()
            // @ts-ignore
            await this.db?.connect()
        }

        this.network.registry.register(contractDefinitions)
        assert(this.contract instanceof Contract)
    }

    async importDatabase (): Promise<void> {
        try {
            const { ProsopoDatabase } = await import(`./${this.config.database[this.defaultEnvironment].type}`)
            this.db = new ProsopoDatabase(
                this.config.database[this.defaultEnvironment].endpoint,
                this.config.database[this.defaultEnvironment].dbname
            )
        } catch (err) {
            throw new Error(`${ERRORS.DATABASE.DATABASE_IMPORT_FAILED.message}:${this.config.database[this.defaultEnvironment].type}:${err}`)
        }
    }

    /*
        Direct copy of functions from env.ts as contract is not currently mocked
    */
    async getContract (): Promise<void> {
        await this.network.api.isReadyOrError
        const contractFactory = await patract.getContractFactory(CONTRACT_NAME, this.signer)
        this.contract = contractFactory.attach(this.contractAddress)
    }

    async getSigner (): Promise<void> {
        await this.network.api.isReadyOrError
        const mnemonic = this.mnemonic
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
}

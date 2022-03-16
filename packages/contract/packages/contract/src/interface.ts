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
// @ts-ignore

import '@redspot/patract';
import '@redspot/chai';
import '@redspot/watcher';
import '@redspot/explorer';
import '@redspot/decimals';
import {Registry} from 'redspot/types/provider'
import type {AbiMessage} from '@polkadot/api-contract/types'
import Contract from '@redspot/patract/contract'
import {ContractApiInterface} from './types'
import {Signer} from 'redspot/types'
import {ERRORS} from './errors'
import {AbiMetadata, Network} from 'redspot/types'
import {unwrap, encodeStringArgs, getEventNameFromMethodName, handleContractCallOutcomeErrors} from './helpers'
import {AnyJson} from '@polkadot/types/types/codec'
import {DecodedEvent} from "@redspot/patract/types";
import {contractDefinitions} from "./definitions";
import {strict as assert} from "assert";
import { network, patract } from "redspot"
const { mnemonicGenerate } = require('@polkadot/util-crypto')

export class ProsopoContractApi implements ContractApiInterface {
    contract?: Contract
    network: Network
    mnemonic?: string
    signer?: Signer
    deployerAddress: string
    contractAddress: string
    patract: any;
    contractName: string

    constructor(deployerAddress: string, contractAddress: string, mnemonic: string | undefined, contractName: string) {
        this.deployerAddress = deployerAddress
        this.contractAddress = contractAddress
        this.mnemonic = mnemonic
        this.network = network
        this.patract = patract
        this.contractName = contractName
    }

    async isReady(): Promise<void> {
        // redspot will do this if using `npx redspot` commands. do it here anyway in case using `yarn ts-node ...`
        await this.network.api.isReadyOrError
        await this.network.registry.register(contractDefinitions)
        await this.getSigner()
        await this.getContract()
        assert(this.contract !== undefined)
    }

    async getSigner(): Promise<Signer> {
        await this.network.api.isReadyOrError
        const {mnemonic} = this
        if (!mnemonic) {
            throw new Error(ERRORS.CONTRACT.SIGNER_UNDEFINED.message)
        }
        const keyringPair = this.network.keyring.addFromMnemonic(mnemonic)
        const signer = this.network.createSigner(keyringPair)
        this.signer = signer
        return signer

    }

    async changeSigner(mnemonic: string): Promise<Signer> {
        await this.network.api.isReadyOrError
        this.mnemonic = mnemonic
        return await this.getSigner()
    }


    async getContract(): Promise<Contract> {
        await this.network.api.isReadyOrError
        const contractFactory = await patract.getContractFactory(this.contractName, this.signer)
        let contract = contractFactory.attach(this.contractAddress)
        if (!contract) {
            console.log(contract);
            throw new Error(ERRORS.CONTRACT.CONTRACT_UNDEFINED.message)
        }

        this.contract = contract
        return contract
    }

    createAccountAndAddToKeyring(): [string, string] {
        const mnemonic: string = mnemonicGenerate()
        console.log("adding from mnemonic")
        const account = this.network.keyring.addFromMnemonic(mnemonic)
        const {address} = account
        return [mnemonic, address]
    }

    /**
     * Operations to carry out before calling contract
     */
    async beforeCall<T>(contractMethodName: string, args: T[]): Promise<{ encodedArgs: T[]; signedContract: Contract }> {
        const contract = await this.getContract()
        if (!this.signer) {
            throw new Error(ERRORS.CONTRACT.SIGNER_UNDEFINED.message)
        }
        const signedContract: Contract = contract.connect(this.signer)
        const methodObj = this.getContractMethod(contractMethodName)
        const encodedArgs: T[] = encodeStringArgs(methodObj, args)
        return {signedContract, encodedArgs}
    }


    /**
     * Perform a contract tx (mutating) calling the specified method
     * @param {string} contractMethodName
     * @param args
     * @param {number | undefined} value   The value of token that is sent with the transaction
     * @return JSON result containing the contract event
     */
    async contractTx<T>(contractMethodName: string, args: T[], value?: number | string): Promise<DecodedEvent[]> {
        // Always query first as errors are passed back from a dry run but not from a transaction
        await this.contractQuery(contractMethodName, args)
        const {encodedArgs, signedContract} = await this.beforeCall(contractMethodName, args)
        let response
        if (value) {
            response = await signedContract.tx[contractMethodName](...encodedArgs, {value})
        } else {
            response = await signedContract.tx[contractMethodName](...encodedArgs)
        }
        const eventsProperty = 'events'

        if (response.result.status.isRetracted) {
            throw (response.result.status.asRetracted)
        }
        if (response.result.status.isInvalid) {
            throw new Error('isInvalid')
        }

        if (response.result.isInBlock || response.result.isFinalized) {
            const eventName = getEventNameFromMethodName(contractMethodName)
            // Most contract transactions should return an event
            if (response[eventsProperty] !== undefined) {
                return response[eventsProperty]!.filter((x) => x.name === eventName)
            }
        }
        return []
    }

    /**
     * Perform a contract query (non-mutating) calling the specified method
     * @param {string} contractMethodName
     * @param args
     * @param atBlock
     * @return JSON result containing the contract event
     */
    async contractQuery<T>(contractMethodName: string, args: T[], atBlock?: string | Uint8Array): Promise<AnyJson> {
        const {encodedArgs, signedContract} = await this.beforeCall(contractMethodName, args)
        const query = !atBlock ? signedContract.query[contractMethodName] : signedContract.queryAt(atBlock, signedContract.abi.findMessage(contractMethodName))
        const response = await query(...encodedArgs)
        // @ts-ignore
        handleContractCallOutcomeErrors(response)
        if (response.result.isOk) {
            if (response.output) {
                return unwrap(response.output.toHuman())
            } else {
                return []
            }
        }
        throw new Error(response.result.asErr.asModule.message.unwrap().toString())
    }

    /** Get the contract method from the ABI
     * @return the contract method object
     */
    getContractMethod(contractMethodName: string): AbiMessage {
        const methodObj = this.contract?.abi.messages.filter((obj) => obj.method === contractMethodName)[0]
        if (methodObj !== undefined) {
            return methodObj as unknown as AbiMessage
        }
        throw new Error(ERRORS.CONTRACT.INVALID_METHOD.message)
    }

    /** Get the storage key from the ABI given a storage name
     * @return the storage key
     */
    getStorageKey(storageName: string): string {
        if (!this.contract) {
            throw new Error(ERRORS.CONTRACT.CONTRACT_UNDEFINED.message)
        }
        const json: AbiMetadata = this.contract.abi.json as AbiMetadata

        // Find the different metadata version key, V1, V2, V3, etc.
        const storageKey = Object.keys(json).filter(key => key.search(/V\d/) > -1)

        let data
        if (storageKey.length) {
            // @ts-ignore
            data = json[storageKey[0]]
        } else {
            // The metadata version is not present and its the old AbiMetadata
            data = json
        }

        const storageEntry = data.storage.struct.fields.filter((obj: { name: string }) => obj.name === storageName)[0]

        if (storageEntry) {
            return storageEntry.layout.cell.key
        }
        throw new Error(ERRORS.CONTRACT.INVALID_STORAGE_NAME.message)
    }

    /**
     * Get the data at specified storage key
     * @return {any} data
     */
    async getStorage<T>(name: string, decodingFn: (registry: Registry, data: Uint8Array) => T): Promise<T> {
        await this.getContract()
        const storageKey = this.getStorageKey(name)
        if (!this.contract) {
            throw new Error(ERRORS.CONTRACT.CONTRACT_UNDEFINED.message)
        }
        const promiseResult = await this.network.api.rpc.contracts.getStorage(this.contract.address, storageKey)
        const data = promiseResult.unwrapOrDefault()
        return decodingFn(this.network.registry, data)
    }
}

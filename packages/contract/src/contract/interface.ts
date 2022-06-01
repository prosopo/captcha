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
import type {AbiMessage} from '@polkadot/api-contract/types';
import {AnyJson} from '@polkadot/types/types/codec';
import {Registry} from '@polkadot/types/types';
import {ContractApiInterface, ContractAbi, AbiMetadata, Network, TransactionResponse} from '../types'; // TODO from each module
import {ERRORS} from '../errors';
import {unwrap, encodeStringArgs, handleContractCallOutcomeErrors} from './helpers';
import {contractDefinitions} from "./definitions";
import {Signer} from '../signer/signer';
import {AccountSigner} from '../signer/accountsigner';
import {Contract} from './contract';

import { mnemonicGenerate } from '@polkadot/util-crypto';

export class ProsopoContractApi implements ContractApiInterface {
    contract?: Contract
    network!: Network
    mnemonic: string
    signer!: Signer
    deployerAddress: string
    contractAddress: string
    contractName: string
    abi: ContractAbi

    constructor(deployerAddress: string, contractAddress: string, mnemonic: string, contractName: string, abi: ContractAbi, network: Network) {
        this.deployerAddress = deployerAddress
        this.mnemonic = mnemonic
        this.contractName = contractName
        this.contractAddress = contractAddress
        this.abi = abi
        this.network = network
    }

    async isReady(): Promise<void> {
        await this.network.api.isReadyOrError
        await this.network.registry.register(contractDefinitions)
        await this.getSigner()
        await this.getContract()
        if (this.contract === undefined) {
            throw new Error(ERRORS.CONTRACT.CONTRACT_UNDEFINED.message)
        }
    }

    async getSigner(): Promise<Signer> {
        await this.network.api.isReadyOrError
        const {mnemonic} = this
        if (!mnemonic) {
            throw new Error(ERRORS.CONTRACT.SIGNER_UNDEFINED.message)
        }
        const keyringPair = this.network.keyring.addFromMnemonic(mnemonic)
        const accountSigner = this.network.signer as unknown as AccountSigner; // TODO
        const signer = new Signer(keyringPair, accountSigner);
        accountSigner.addPair(signer.pair)
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
        let contract = new Contract(this.contractAddress, this.abi, this.network.api, this.signer)
        if (!contract) {
            throw new Error(ERRORS.CONTRACT.CONTRACT_UNDEFINED.message)
        }

        this.contract = contract
        return contract
    }

    createAccountAndAddToKeyring(): [string, string] {
        const mnemonic: string = mnemonicGenerate()
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
    async contractTx<T>(contractMethodName: string, args: T[], value?: number | string): Promise<TransactionResponse> {
        // Always query first as errors are passed back from a dry run but not from a transaction
        await this.contractQuery(contractMethodName, args)
        const {encodedArgs, signedContract} = await this.beforeCall(contractMethodName, args)
        let response
        if (value) {
            response = await signedContract.tx[contractMethodName](...encodedArgs, {value, signer: this.signer})
        } else {
            response = await signedContract.tx[contractMethodName](...encodedArgs, {signer: this.signer})
        }

        if (response.result.status.isRetracted) {
            throw (response.status.asRetracted)
        }
        if (response.result.status.isInvalid) {
            throw (response.status.asInvalid)
        }

        return response
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

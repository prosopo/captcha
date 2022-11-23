// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of provider <https://github.com/prosopo/provider>.
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
import type { AbiMessage } from '@polkadot/api-contract/types'
import { AnyJson } from '@polkadot/types/types/codec'
import { Observable, Registry } from '@polkadot/types/types'
import { AbiMetadata, ContractAbi, ContractApiInterface, TransactionResponse } from '../types'
import { encodeStringArgs, handleContractCallOutcomeErrors, unwrap } from './helpers'
import { contractDefinitions } from './definitions'
import { buildCall, buildSend } from './contract'
import { ProsopoContractError } from '../handlers'
import { ApiPromise } from '@polkadot/api'
import { ContractPromise } from '@polkadot/api-contract'
import AsyncFactory from './AsyncFactory'
import { KeyringPair } from '@polkadot/keyring/types'
import { Bytes, Option } from '@polkadot/types-codec'

export class ProsopoContractApi extends AsyncFactory implements ContractApiInterface {
    contract: ContractPromise
    contractAddress: string
    contractName: string
    abi: ContractAbi
    pair: KeyringPair
    api: ApiPromise

    public async init(
        contractAddress: string,
        pair: KeyringPair,
        contractName: string,
        abi: ContractAbi,
        api: ApiPromise
    ): Promise<this> {
        this.api = api
        this.pair = pair
        this.contractAddress = contractAddress
        this.abi = abi
        await this.api.isReadyOrError
        await this.api.registry.register(contractDefinitions)
        this.contract = new ContractPromise(this.api, this.abi, this.contractAddress)
        return this
    }

    public getContract(): ContractPromise {
        return this.contract
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
        const methodObj = this.getContractMethod(contractMethodName)
        const encodedArgs: T[] = encodeStringArgs(methodObj, args)
        const send = buildSend(this.contract, methodObj, this.pair)
        const response = value ? await send(...encodedArgs, { value: value }) : await send(...encodedArgs)

        if (response.result.status.isRetracted || response.result.status.isInvalid) {
            throw new ProsopoContractError(response.result.status.type, contractMethodName)
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
        const methodObj = this.getContractMethod(contractMethodName)
        const encodedArgs: T[] = encodeStringArgs(methodObj, args)
        const call = !atBlock
            ? buildCall(this.contract, methodObj, this.pair)
            : buildCall(this.contract, methodObj, this.pair, false, atBlock)
        const response = await call(...encodedArgs)
        handleContractCallOutcomeErrors(response, contractMethodName, encodedArgs)
        if (response.result.isOk) {
            if (response.output) {
                return unwrap(response.output.toHuman())
            } else {
                return []
            }
        }
        throw new ProsopoContractError(response.result.asErr, 'contractQuery')
    }

    /** Get the contract method from the ABI
     * @return the contract method object
     */
    getContractMethod(contractMethodName: string): AbiMessage {
        const methodObj = this.contract?.abi.messages.filter((obj) => obj.method === contractMethodName)[0]
        if (methodObj !== undefined) {
            return methodObj as unknown as AbiMessage
        }
        throw new ProsopoContractError('CONTRACT.INVALID_METHOD', 'contractMethodName')
    }

    /** Get the storage key from the ABI given a storage name
     * @return the storage key
     */
    getStorageKey(storageName: string): string {
        if (!this.contract) {
            throw new ProsopoContractError('CONTRACT.CONTRACT_UNDEFINED')
        }
        const json: AbiMetadata = this.contract.abi.json as AbiMetadata

        // Find the different metadata version key, V1, V2, V3, etc.
        const storageKey = Object.keys(json).filter((key) => key.search(/V\d/) > -1)

        let data
        if (storageKey.length) {
            data = json[storageKey[0]]
        } else {
            // The metadata version is not present, and it's the old AbiMetadata
            data = json
        }

        const storageEntry = data.storage.struct.fields.filter((obj: { name: string }) => obj.name === storageName)[0]

        if (storageEntry) {
            return storageEntry.layout.cell.key
        }
        throw new ProsopoContractError('CONTRACT.INVALID_STORAGE_NAME', 'getStorageKey')
    }

    /**
     * Get the data at specified storage key
     * @return {any} data
     */
    async getStorage<T>(name: string, decodingFn: (registry: Registry, data: Uint8Array) => T): Promise<T> {
        await this.getContract()
        const storageKey = this.getStorageKey(name)
        if (!this.contract) {
            throw new ProsopoContractError('CONTRACT.CONTRACT_UNDEFINED')
        }
        const promiseResult: Observable<Option<Bytes>> = await this.api.rpc.contracts.getStorage(this.contract.address, storageKey)
        const data = promiseResult.unwrapOrDefault()
        return decodingFn(this.api.registry, data)
    }
}

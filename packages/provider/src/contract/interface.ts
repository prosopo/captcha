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
import { Registry } from 'redspot/types/provider'
import { AbiMessage } from '@polkadot/api-contract/types'
import Contract from '@redspot/patract/contract'
import { ContractApiInterface } from '../types'
import { ERRORS } from '../errors'
import { Environment } from '../env'
import { AbiMetadata } from 'redspot/types'
import { unwrap, encodeStringArgs, getEventNameFromMethodName, handleContractCallOutcomeErrors } from './helpers'
import { AnyJson } from '@polkadot/types/types/codec'

export class ProsopoContractApi implements ContractApiInterface {
    env: Environment

    constructor (env) {
        this.env = env
    }

    /**
     * Perform a contract transaction calling the specified method
     * @param {string} contractMethodName
     * @param {Array}  args
     * @param {number} value    A value to send with the transaction, e.g. a stake
     * @return JSON result containing the contract event
     */
    async contractCall<T> (contractMethodName: string, args: T[], value?: number | string, atBlock?: string | Uint8Array): Promise<AnyJson> {
        await this.env.isReady()
        if (!this.env.contract) {
            throw new Error(ERRORS.CONTRACT.CONTRACT_UNDEFINED.message)
        }
        if (!this.env.signer) {
            throw new Error(ERRORS.CONTRACT.SIGNER_UNDEFINED.message)
        }
        const signedContract: Contract = this.env.contract.connect(this.env.signer)
        const methodObj = this.getContractMethod(contractMethodName)
        const encodedArgs = encodeStringArgs(methodObj, args)

        // Always query first as errors are passed back from a dry run but not from a transaction
        let result = await this.contractQuery(signedContract, contractMethodName, encodedArgs, atBlock)

        if (methodObj.isMutating) {
            result = await this.contractTx(signedContract, contractMethodName, encodedArgs, value)
        }
        return result
    }

    /**
     * Perform a contract tx (mutating) calling the specified method
     * @param {Contract} signedContract
     * @param {string} contractMethodName
     * @param {Array}  encodedArgs
     * @param {number | undefined} value   The value of token that is sent with the transaction
     * @return JSON result containing the contract event
     */
    async contractTx <T> (signedContract: Contract, contractMethodName: string, encodedArgs: T[], value: number | string | undefined): Promise<AnyJson> {
        let response
        if (value) {
            response = await signedContract.tx[contractMethodName](...encodedArgs, { value })
        } else {
            response = await signedContract.tx[contractMethodName](...encodedArgs)
        }
        const eventsProperty = 'events'

        if (response.result.status.isRetracted) {
            throw (response.status.asRetracted)
        }
        if (response.result.status.isInvalid) {
            throw (response.status.asInvalid)
        }

        if (response.result.isInBlock || response.result.isFinalized) {
            const eventName = getEventNameFromMethodName(contractMethodName)
            // Most contract transactions should return an event
            if (response[eventsProperty]) {
                return response[eventsProperty].filter((x) => x.name === eventName)
            }
        }
        return []
    }

    /**
     * Perform a contract query (non-mutating) calling the specified method
     * @param {Contract} signedContract
     * @param {string} contractMethodName
     * @param {Array}  encodedArgs
     * @return JSON result containing the contract event
     */
    async contractQuery <T> (signedContract: Contract, contractMethodName: string, encodedArgs: T[], atBlock?: string | Uint8Array): Promise<AnyJson> {
        const query = !atBlock ? signedContract.query[contractMethodName] : signedContract.queryAt(atBlock, signedContract.abi.findMessage(contractMethodName))
        const response = await query(...encodedArgs)
        handleContractCallOutcomeErrors(response)
        if (response.result.isOk) {
            if (response.output) {
                return unwrap(response.output.toHuman())
            } else {
                return
            }
        }
        throw new Error(response.result.asErr.asModule.message.unwrap().toString())
    }

    /** Get the contract method from the ABI
     * @return the contract method object
     */
    getContractMethod (contractMethodName: string): AbiMessage {
        const methodObj = this.env.contract?.abi.messages.filter((obj) => obj.method === contractMethodName)[0] as AbiMessage
        if (methodObj) {
            return methodObj
        }
        throw new Error(ERRORS.CONTRACT.INVALID_METHOD.message)
    }

    /** Get the storage key from the ABI given a storage name
     * @return the storage key
     */
    getStorageKey (storageName: string): string {
        if (!this.env.contract) {
            throw new Error(ERRORS.CONTRACT.CONTRACT_UNDEFINED.message)
        }
        const json: AbiMetadata = this.env.contract.abi.json as AbiMetadata

        // Find the different metadata version key, V1, V2, V3, etc.
        const storageKey = Object.keys(json).filter(key => key.search(/V\d/) > -1)

        let data
        if (storageKey.length) {
            data = json[storageKey[0]]
        } else {
            // The metadata version is not present and its the old AbiMetadata
            data = json
        }

        const storageEntry = data.storage.struct.fields.filter((obj) => obj.name === storageName)[0]

        if (storageEntry) {
            return storageEntry.layout.cell.key
        }
        throw new Error(ERRORS.CONTRACT.INVALID_STORAGE_NAME.message)
    }

    /**
     * Get the data at specified storage key
     * @return {any} data
     */
    async getStorage<T> (name: string, decodingFn: (registry: Registry, data: Uint8Array) => T): Promise<T> {
        await this.env.isReady()
        const storageKey = this.getStorageKey(name)
        if (!this.env.contract) {
            throw new Error(ERRORS.CONTRACT.CONTRACT_UNDEFINED.message)
        }
        const promiseResult = await this.env.network.api.rpc.contracts.getStorage(this.env.contract.address, storageKey)
        const data = promiseResult.unwrapOrDefault()
        return decodingFn(this.env.network.registry, data)
    }
}

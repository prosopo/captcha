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
import type { AbiMessage, ContractCallOutcome } from '@polkadot/api-contract/types'
import { AbiMetadata, AbiStorageEntry, BigNumber, ContractApiInterface, TransactionResponse } from '../types'
import { encodeStringArgs, handleContractCallOutcomeErrors } from './helpers'
import { buildSend, populateTransaction } from './contract'
import { ProsopoContractError } from '../handlers'
import { ApiPromise } from '@polkadot/api'
import { ContractPromise } from '@polkadot/api-contract'
import AsyncFactory from './AsyncFactory'
import { KeyringPair } from '@polkadot/keyring/types'
import { AbiVersion, getABIVersion } from '../util/definitionGen'
import { ContractExecResult, ContractExecResultOk } from '@polkadot/types/interfaces/contracts'
import { createType } from '@polkadot/types'
import { ApiBase, ApiDecoration } from '@polkadot/api/types'
import { firstValueFrom, map } from 'rxjs'
import { convertWeight } from '@polkadot/api-contract/base/util'

export class ProsopoContractApi extends AsyncFactory implements ContractApiInterface {
    contract: ContractPromise
    contractAddress: string
    contractName: string
    abi: AbiMetadata
    pair: KeyringPair
    api: ApiPromise
    abiVersion: AbiVersion

    public async init(
        contractAddress: string,
        pair: KeyringPair,
        contractName: string,
        abi: AbiMetadata,
        api: ApiPromise
    ): Promise<this> {
        this.api = api
        this.pair = pair
        this.contractAddress = contractAddress
        this.abi = abi
        this.abiVersion = getABIVersion(abi)
        await this.api.isReadyOrError
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
    async contractTx<T>(
        contractMethodName: string,
        args: T[],
        value?: number | string | BigNumber
    ): Promise<TransactionResponse> {
        // Always query first as errors are passed back from a dry run but not from a transaction

        await this.contractQuery(contractMethodName, args)

        const methodObj = this.getContractMethod(contractMethodName)
        const encodedArgs: Uint8Array[] = encodeStringArgs(this.contract.api.registry, methodObj, args)
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
     * @param atBlock?
     * @return JSON result containing the contract event
     */
    async contractQuery(
        contractMethodName: string,
        args: any[],
        atBlock?: string | Uint8Array
    ): Promise<ContractExecResultOk> {
        const methodObj = this.getContractMethod(contractMethodName)
        const encodedArgs: Uint8Array[] = encodeStringArgs(this.contract.api.registry, methodObj, args)
        let api: ApiBase<'promise'> | ApiDecoration<'promise'> = this.api
        const { callParams } = await populateTransaction(this.contract, methodObj, encodedArgs)
        if (atBlock) {
            api = atBlock ? await this.api.at(atBlock) : this.api
        }

        const responseObservable = api.rx.call.contractsApi
            .call<ContractExecResult>(
                this.pair.address,
                this.contract.address,
                callParams.value,
                callParams.gasLimit,
                null,
                methodObj.toU8a(encodedArgs)
            )
            .pipe(
                map(
                    ({ debugMessage, gasConsumed, gasRequired, result, storageDeposit }): ContractCallOutcome => ({
                        debugMessage,
                        gasConsumed,
                        gasRequired:
                            gasRequired && !convertWeight(gasRequired).v1Weight.isZero() ? gasRequired : gasConsumed,
                        output:
                            result.isOk && methodObj.returnType
                                ? this.contract.abi.registry.createTypeUnsafe(
                                      methodObj.returnType.lookupName || methodObj.returnType.type,
                                      [result.asOk.data.toU8a(true)],
                                      { isPedantic: true }
                                  )
                                : null,
                        result,
                        storageDeposit,
                    })
                )
            )
        const response = await firstValueFrom(responseObservable)
        const { result } = response
        // const { debugMessage, gasRequired, gasConsumed, result, storageDeposit } = response
        handleContractCallOutcomeErrors(response, contractMethodName, encodedArgs)
        if (result.isOk) {
            return result.asOk
        }
        throw new ProsopoContractError(result.asErr, 'contractQuery')
    }

    /** Get the contract method from the ABI
     * @return the contract method object
     */
    getContractMethod(contractMethodName: string): AbiMessage {
        const methodObj = this.contract.abi.messages.filter((obj) => obj.method === contractMethodName)[0]
        if (methodObj !== undefined) {
            return methodObj
        }
        throw new ProsopoContractError('CONTRACT.INVALID_METHOD', 'contractMethodName')
    }

    /** Get the storage entry from the ABI given a storage name
     * @return the storage entry object
     */
    getStorageEntry(storageName: string): AbiStorageEntry {
        if (!this.contract) {
            throw new ProsopoContractError('CONTRACT.CONTRACT_UNDEFINED')
        }
        const json: AbiMetadata = this.contract.abi.json as AbiMetadata

        const data = json[this.abiVersion]

        const storageEntry = data.storage.struct.fields.filter((obj: { name: string }) => obj.name === storageName)[0]
        if (storageEntry) {
            return storageEntry
        }
        throw new ProsopoContractError('CONTRACT.INVALID_STORAGE_NAME', 'getStorageKey')
    }

    /**
     * Get the data at specified storage key
     * @return {any} data
     */
    async getStorage<T>(name: string, type: string): Promise<T> {
        await this.getContract()
        const storageEntry = this.getStorageEntry(name)
        if (storageEntry.layout.cell) {
            //const storageType: AbiType = this.abi[this.abiVersion].types[storageEntry.layout.cell.ty]
            if (!this.contract) {
                throw new ProsopoContractError('CONTRACT.CONTRACT_UNDEFINED')
            }
            const promiseResult = await this.api.call.contractsApi.getStorage(
                this.contract.address,
                storageEntry.layout.cell.key
            )
            const result = promiseResult.unwrapOrDefault()

            return createType(result.registry, type, [result.toU8a(true)]) as T
        }
        throw new ProsopoContractError('CONTRACT.INVALID_STORAGE_TYPE', 'getStorage')
    }
}

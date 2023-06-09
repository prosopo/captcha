// Copyright 2021-2023 Prosopo (UK) Ltd.
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
import { AbiMetaDataSpec, AbiMetadata, ContractAbi } from '@prosopo/types'
import { ApiPromise } from '@polkadot/api'
import { BN } from '@polkadot/util'
import { BlockHash, StorageDeposit } from '@polkadot/types/interfaces'
import { ContractPromise } from '@polkadot/api-contract'
import { Error, LangError } from '../typechain/captcha/types-returns/captcha'
import { KeyringPair } from '@polkadot/keyring/types'
import { LogLevel, Logger, logger, snakeToCamelCase } from '@prosopo/common'
import { ProsopoContractError } from '../handlers'
import { QueryReturnType, Result } from '@727-ventures/typechain-types'
import { SubmittableExtrinsic } from '@polkadot/api/promise/types'
import { encodeStringArgs, getExpectedBlockTime, getOptions, handleContractCallOutcomeErrors } from './helpers'
import { firstValueFrom } from 'rxjs'
import { getPrimitiveStorageFields, getPrimitiveStorageValue, getPrimitiveTypes, getStorageKeyAndType } from './storage'
import { useWeightImpl } from './useWeight'
import Contract from '../typechain/captcha/contracts/captcha'
import MixedMethods from '../typechain/captcha/mixed-methods/captcha'
import QueryMethods from '../typechain/captcha/query/captcha'
import type { ContractOptions } from '@polkadot/api-contract/types'

export type QueryReturnTypeInner<T> = T extends QueryReturnType<Result<Result<infer U, Error>, LangError>> ? U : never

export const wrapQuery = <QueryFunctionArgs extends any[], QueryFunctionReturnType>(
    fn: (...args: QueryFunctionArgs) => QueryFunctionReturnType,
    queryMethods: QueryMethods
) => {
    return async (...args: QueryFunctionArgs): Promise<QueryReturnTypeInner<QueryFunctionReturnType>> => {
        let result: QueryReturnType<Result<Result<QueryReturnTypeInner<QueryFunctionReturnType>, Error>, LangError>>
        try {
            result = (await fn.bind(queryMethods)(...args)) as QueryReturnType<
                Result<Result<QueryReturnTypeInner<QueryFunctionReturnType>, Error>, LangError>
            >
        } catch (e) {
            throw new ProsopoContractError(e._asError, fn.name, undefined, {
                args: args,
            })
        }
        if (result && result.value.err) {
            throw new ProsopoContractError(result.value.err.toString(), fn.name, {
                result: JSON.stringify(result),
            })
        }
        if (result.value) {
            return result.value.unwrapRecursively() as QueryReturnTypeInner<QueryFunctionReturnType>
        }
        throw new ProsopoContractError('CONTRACT.QUERY_ERROR', fn.name, {}, { result: JSON.stringify(result) })
    }
}

export class ProsopoCaptchaContract extends Contract {
    api: ApiPromise
    contractName: string
    contract: ContractPromise
    pair: KeyringPair
    options: ContractOptions
    nonce: number
    logger: Logger
    json: AbiMetadata

    constructor(
        api: ApiPromise,
        abi: ContractAbi,
        address: string,
        pair: KeyringPair,
        contractName: string,
        currentNonce: number,
        logLevel?: LogLevel
    ) {
        // address: string, signer: KeyringPair, nativeAPI: ApiPromise
        super(address, pair, api)
        this.api = api
        this.contract = new ContractPromise(api, abi, address)
        this.pair = pair
        this.contractName = contractName
        this.nonce = currentNonce
        this.logger = logger(logLevel || LogLevel.Info, `${ProsopoCaptchaContract.name}.${contractName}`)
        this.json = AbiMetaDataSpec.parse(this.abi.json)
        this.createStorageGetters()
    }

    /**
     * Create getter functions for contract storage entries
     */
    private createStorageGetters(): void {
        if (this.json.storage.root.layout.struct) {
            for (const storageField of this.json.storage.root.layout.struct.fields) {
                const functionName = `${snakeToCamelCase(storageField.name)}`
                ProsopoCaptchaContract.prototype[functionName] = () => {
                    return this.getStorage(storageField.name)
                }
            }
        }
    }

    /**
     * Get the return value of a contract query function at a specific block in the past
     * @param blockHash
     * @param methodName
     * @param args
     */
    async queryAtBlock<T>(blockHash: BlockHash, methodName: string, args?: any[]): Promise<T> {
        const api = (await this.api.at(blockHash)) as ApiPromise
        const methods = new MixedMethods(api, this.contract, this.signer)
        if (args) {
            return (await methods[methodName](...args)).value.unwrap().unwrap() as T
        } else {
            return (await methods[methodName]()).value.unwrap().unwrap() as T
        }
    }

    /**
     * Get the extrinsic for submitting in a transaction
     * @return {SubmittableExtrinsic} extrinsic
     */
    async getExtrinsicAndGasEstimates<T>(
        contractMethodName: string,
        args: T[],
        value?: number | BN | undefined
    ): Promise<{ extrinsic: SubmittableExtrinsic; options: ContractOptions; storageDeposit: StorageDeposit }> {
        // Always query first as errors are passed back from a dry run but not from a transaction
        const message = this.abi.findMessage(contractMethodName)
        const encodedArgs: Uint8Array[] = encodeStringArgs(this.abi, message, args)
        const expectedBlockTime = getExpectedBlockTime(this.api)
        const weight = await useWeightImpl(this.api as ApiPromise, expectedBlockTime, new BN(1))
        const gasLimit = weight.isWeightV2 ? weight.weightV2 : weight.isEmpty ? -1 : weight.weight
        this.logger.debug('Sending address: ', this.pair.address)
        const initialOptions = {
            value,
            gasLimit,
            storageDepositLimit: null,
        }
        const extrinsic = this.contract.query[message.method](this.pair.address, initialOptions, ...encodedArgs)

        const response = await extrinsic
        if (response.result.isOk) {
            let options = getOptions(this.api, message.isMutating, value, response.gasRequired, response.storageDeposit)
            const extrinsicTx = this.contract.tx[contractMethodName](options, ...encodedArgs)
            // paymentInfo is larger than gasRequired returned by query so use paymentInfo
            const paymentInfo = await extrinsicTx.paymentInfo(this.pair.address)
            this.logger.debug('Payment info: ', paymentInfo.partialFee.toHuman())
            // increase the gas limit to make sure the tx succeeds
            options = getOptions(this.api, message.isMutating, value, paymentInfo.weight, response.storageDeposit, true)
            handleContractCallOutcomeErrors(response, contractMethodName)
            return {
                extrinsic: this.contract.tx[contractMethodName](options, ...encodedArgs),
                options,
                storageDeposit: response.storageDeposit,
            }
        } else {
            throw new ProsopoContractError(response.result.asErr, this.getExtrinsicAndGasEstimates.name)
        }
    }

    /**
     * Get the data at specified storage key
     * @return {any} data
     */
    async getStorage<T>(name: string): Promise<T> {
        const primitiveTypes = getPrimitiveTypes(this.json)
        const primitiveStorageFields = getPrimitiveStorageFields(
            this.json.storage.root.layout.struct?.fields || [],
            primitiveTypes
        )
        if (name in primitiveStorageFields) {
            return getPrimitiveStorageValue<T>(this.api, this.abi, name, primitiveStorageFields, this.contract.address)
        } else {
            const { storageKey, storageType } = getStorageKeyAndType(this.api, this.abi, this.json, name)
            if (storageType) {
                const typeDef = this.abi.registry.lookup.getTypeDef(`Lookup${storageType.id.toNumber()}`)
                const promiseResult = this.api.rx.call.contractsApi.getStorage(this.address, storageKey)
                const result = await firstValueFrom(promiseResult)
                const optionBytes = this.abi.registry.createType('Option<Bytes>', result)
                return this.abi.registry.createType(typeDef.type, [optionBytes.unwrap().toU8a(true)]) as T
            }
        }
        throw new ProsopoContractError('CONTRACT.INVALID_STORAGE_TYPE', this.getStorage.name)
    }
}

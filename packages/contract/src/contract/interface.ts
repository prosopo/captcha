// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import { AbiMetaDataSpec, AbiMetadata, ContractAbi, IProsopoCaptchaContract } from '@prosopo/types'
import { ApiPromise } from '@polkadot/api/promise/Api'
import { BN } from '@polkadot/util/bn'
import { BlockHash, StorageDeposit } from '@polkadot/types/interfaces'
import { Contract } from '@prosopo/captcha-contract'
import { ContractPromise } from '@polkadot/api-contract/promise'
import { KeyringPair } from '@polkadot/keyring/types'
import { LangError } from '@prosopo/captcha-contract/types-arguments'
import { LogLevel, Logger, ProsopoContractError, getLogger, snakeToCamelCase } from '@prosopo/common'
import { default as Methods } from '@prosopo/captcha-contract/mixed-methods'
import { default as Query } from '@prosopo/captcha-contract/query'
import { QueryReturnType, Result } from '@prosopo/typechain-types'
import { SubmittableExtrinsic } from '@polkadot/api/promise/types'
import { encodeStringArgs, getExpectedBlockTime, getOptions, handleContractCallOutcomeErrors } from './helpers.js'
import { firstValueFrom } from 'rxjs'
import {
    getPrimitiveStorageFields,
    getPrimitiveStorageValue,
    getPrimitiveTypes,
    getStorageKeyAndType,
} from './storage.js'
import { getReadOnlyPair } from '../accounts/index.js'
import { useWeightImpl } from './useWeight.js'
import type { ContractCallOutcome, ContractOptions } from '@polkadot/api-contract/types'
export type QueryReturnTypeInner<T> = T extends QueryReturnType<Result<Result<infer U, Error>, LangError>> ? U : never

export const wrapQuery = <QueryFunctionArgs extends any[], QueryFunctionReturnType>(
    fn: (...args: QueryFunctionArgs) => QueryFunctionReturnType,
    queryMethods: Query
) => {
    return async (...args: QueryFunctionArgs): Promise<QueryReturnTypeInner<QueryFunctionReturnType>> => {
        let result: QueryReturnType<Result<Result<QueryReturnTypeInner<QueryFunctionReturnType>, Error>, LangError>>
        try {
            result = (await fn.bind(queryMethods)(...args)) as QueryReturnType<
                Result<Result<QueryReturnTypeInner<QueryFunctionReturnType>, Error>, LangError>
            >
        } catch (e: any) {
            throw new ProsopoContractError('CONTRACT.QUERY_ERROR', {
                context: {
                    error: e._asError,
                    failedFuncName: fn.name,
                    args,
                },
            })
        }
        if (result && result.value.err) {
            throw new ProsopoContractError('CONTRACT.QUERY_ERROR', {
                context: {
                    error: result.value.err.toString(),
                    failedFuncName: fn.name,
                    result: JSON.stringify(result),
                },
            })
        }
        if (result.value) {
            return result.value.unwrapRecursively() as QueryReturnTypeInner<QueryFunctionReturnType>
        }
        throw new ProsopoContractError('CONTRACT.QUERY_ERROR', {
            context: {
                failedFuncName: fn.name,
                result: JSON.stringify(result),
            },
        })
    }
}
export class ProsopoCaptchaContract extends Contract implements IProsopoCaptchaContract {
    api: ApiPromise
    contractName: string
    contract: ContractPromise
    pair: KeyringPair
    options: ContractOptions | undefined
    nonce: number
    logger: Logger
    json: AbiMetadata

    constructor(
        api: ApiPromise,
        abi: ContractAbi,
        address: string,
        contractName: string,
        currentNonce: number,
        pair?: KeyringPair,
        logLevel?: LogLevel,
        userAccount?: string
    ) {
        // Get a read-only contract with a dummy account
        if (!pair) {
            pair = getReadOnlyPair(api, userAccount)
        }
        // address: string, signer: KeyringPair, nativeAPI: ApiPromise
        super(address, pair, api)
        this.api = api
        this.contract = new ContractPromise(api, abi, address)
        this.pair = pair
        this.contractName = contractName
        this.nonce = currentNonce
        this.logger = getLogger(logLevel || LogLevel.enum.info, `${ProsopoCaptchaContract.name}.${contractName}`)
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
                const proto = ProsopoCaptchaContract.prototype as unknown as {
                    [key: string]: () => any
                }
                proto[functionName] = () => {
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
        const methods: any = new Methods(api, this.contract, this.signer)
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
        const initialOptions: ContractOptions = {
            gasLimit,
            storageDepositLimit: null,
        }
        if (value !== undefined) {
            initialOptions.value = value
        }
        const func = this.contract.query[message.method]
        if (func === undefined) {
            throw new RangeError(`Method ${contractMethodName} does not exist on contract ${this.contractName}`)
        }
        const extrinsic = func(this.pair.address, initialOptions, ...encodedArgs)

        const response = (await extrinsic) as unknown as ContractCallOutcome
        if (response.result.isOk) {
            let options = getOptions(this.api, message.isMutating, value, response.gasRequired, response.storageDeposit)
            let method = this.contract.tx[contractMethodName]
            if (method === undefined) {
                throw new RangeError(`Method ${contractMethodName} does not exist on contract ${this.contractName}`)
            }
            const extrinsicTx = method(options, ...encodedArgs)
            // paymentInfo is larger than gasRequired returned by query so use paymentInfo
            const paymentInfo = await extrinsicTx.paymentInfo(this.pair.address)
            this.logger.debug('Payment info: ', paymentInfo.partialFee.toHuman())
            // increase the gas limit to make sure the tx succeeds
            options = getOptions(this.api, message.isMutating, value, paymentInfo.weight, response.storageDeposit, true)
            handleContractCallOutcomeErrors(response, contractMethodName)
            method = this.contract.tx[contractMethodName]
            if (method === undefined) {
                throw new RangeError(`Method ${contractMethodName} does not exist on contract ${this.contractName}`)
            }
            return {
                extrinsic: method(options, ...encodedArgs),
                options,
                storageDeposit: response.storageDeposit,
            }
        } else {
            throw new ProsopoContractError('CONTRACT.QUERY_ERROR', {
                context: { error: response.result.asErr, failedFuncName: this.getExtrinsicAndGasEstimates.name },
            })
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
        throw new ProsopoContractError('CONTRACT.INVALID_STORAGE_TYPE', {
            context: { failedFuncName: this.getStorage.name },
        })
    }
}

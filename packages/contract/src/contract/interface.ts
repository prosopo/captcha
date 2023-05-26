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
import type { ContractOptions } from '@polkadot/api-contract/types'
import { AbiMetaDataSpec, AbiMetadata, ContractAbi } from '@prosopo/types'
import { ProsopoContractError } from '../handlers'
import { ApiPromise } from '@polkadot/api'
import { firstValueFrom } from 'rxjs'
import { LogLevel, Logger, logger, snakeToCamelCase } from '@prosopo/common'
import { getPrimitiveStorageFields, getPrimitiveStorageValue, getPrimitiveTypes, getStorageKeyAndType } from './storage'
import Contract from '../typechain/captcha/contracts/captcha'
import { KeyringPair } from '@polkadot/keyring/types'
import { useWeightImpl } from './useWeight'
import { BN } from '@polkadot/util'
import MixedMethods from '../typechain/captcha/mixed-methods/captcha'
import { BlockHash, StorageDeposit } from '@polkadot/types/interfaces'
import { encodeStringArgs, getOptions, handleContractCallOutcomeErrors } from './helpers'
import { SubmittableExtrinsic } from '@polkadot/api/promise/types'
import { ContractPromise } from '@polkadot/api-contract'

// export type QueryReturnTypeInner<T> = T extends QueryReturnType<
//     Result<Result<infer U, ReturnTypes.Error>, ReturnTypes.LangError>
// >
//     ? U
//     : never
//
// const wrapQuery = <QueryFunctionArgs extends any[], QueryFunctionReturnType>(
//     methodName: string,
//     fn: (...args: QueryFunctionArgs) => QueryFunctionReturnType,
//     queryMethods: QueryMethods
// ) => {
//     return async (...args: QueryFunctionArgs): Promise<QueryReturnTypeInner<QueryFunctionReturnType>> => {
//         console.log('in wrapped query')
//         const result = (await fn.bind({ this: queryMethods })(...args)) as QueryReturnType<
//             Result<Result<QueryReturnTypeInner<QueryFunctionReturnType>, ReturnTypes.Error>, ReturnTypes.LangError>
//         >
//         if (result.value.err) {
//             throw new ProsopoContractError(result.value.err.toString(), fn.name, {
//                 result: JSON.stringify(result),
//             })
//         }
//         return result.value.unwrap().unwrap() as QueryReturnTypeInner<QueryFunctionReturnType>
//     }
// }
//
// const wrapTx = <QueryFunctionArgs extends any[], QueryFunctionReturnType, TxFunctionReturnType>(
//     methodName: string,
//     queryFn: (...args: QueryFunctionArgs) => QueryFunctionReturnType,
//     txFn: (...args: QueryFunctionArgs) => TxFunctionReturnType,
//     queryMethods: QueryMethods,
//     txMethods: TxSignAndSendMethods
// ) => {
//     return async (...args: QueryFunctionArgs): Promise<TxFunctionReturnType> => {
//         await wrapQuery(methodName, queryFn, queryMethods)(...args)
//         const txResult = (await txFn.bind({ this: txMethods })(...args)) as SignAndSendSuccessResponse
//         if (!txResult || txResult.result?.isError) {
//             throw new ProsopoContractError('CONTRACT.TX_ERROR', methodName, {}, { result: txResult.result?.toHuman() })
//         }
//
//         return txResult as TxFunctionReturnType
//     }
// }

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
        this.logger = logger(logLevel || LogLevel.Info, `ProsopoCaptchaContract: ${contractName}`)
        this.json = AbiMetaDataSpec.parse(this.abi.json)
        this.createStorageGetters()
        //this.wrapContractMethods()
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

    // /** Wrap the contract methods and throw contract errors.
    //  * Contract methods are stored in ProsopoCaptchaContract.prototype[message.method].
    //  * Method names are stored in this.abi.messages.map((message) => { message.method }).
    //  */
    // private wrapContractMethods(): void {
    //     try {
    //         console.log('wrapping methods')
    //         this.abi.messages.map((message) => {
    //             const methodName = message.method
    //             console.log('wrapping', methodName)
    //             // Wrap each of the abi method functions in the contract, and handle errors
    //             this.tx[methodName] = wrapTx(
    //                 methodName,
    //                 this.query[methodName],
    //                 this.tx[methodName],
    //                 this.query,
    //                 this.tx
    //             )
    //             this.query[methodName] = wrapQuery(methodName, this.query[methodName], this.query)
    //             if (typeof this.tx[methodName] === 'function') {
    //                 this.methods[methodName] = wrapTx(
    //                     methodName,
    //                     this.query[methodName],
    //                     this.tx[methodName],
    //                     this.query,
    //                     this.tx
    //                 )
    //             } else {
    //                 this.methods[methodName] = wrapQuery(methodName, this.query[methodName], this.query)
    //             }
    //         })
    //     } catch (e) {
    //         throw new ProsopoContractError(e)
    //     }
    // }

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
        const expectedBlockTime = new BN(this.api.consts.babe?.expectedBlockTime)
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
                extrinsic: this.tx[contractMethodName](options, ...encodedArgs),
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

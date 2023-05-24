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
import { GasLimitAndValue } from '@727-ventures/typechain-types'
import { BN } from '@polkadot/util'
import MixedMethods from '../typechain/captcha/mixed-methods/captcha'
import { BlockHash, StorageDeposit } from '@polkadot/types/interfaces'
import { encodeStringArgs, getOptions, handleContractCallOutcomeErrors } from './helpers'
import { SubmittableExtrinsic } from '@polkadot/api/promise/types'
import { ContractPromise } from '@polkadot/api-contract'

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

    async queryAtBlock<T>(blockHash: BlockHash, methodName: string, args?: any[]): Promise<T> {
        const api = (await this.api.at(blockHash)) as ApiPromise
        const methods = new MixedMethods(api, this.contract, this.signer)
        if (args) {
            return (await methods[methodName](...args)
                .value.unwrap()
                .unwrap()) as T
        } else {
            return methods[methodName]() as T
        }
    }

    // /** Wrap the contract methods and supply gas limit as the last argument, keeping then original arguments.
    //  * Contract methods are stored in ProsopoCaptchaContract.prototype[message.method].
    //  * Method names are stored in this.abi.messages.map((message) => { message.method }).
    //  */
    // private async wrapContractMethods(): Promise<void> {
    //     // Wrap the methods and supply gas limit argument called _options for each abi message
    //     this.abi.messages.map((message) => {
    //         const methodName = message.method
    //         // Wrap each of the abi method functions in the contract, supplying the gas limit from above
    //         this.wrapFunc(this[methodName])
    //     })
    // }
    //
    private wrapFunc<A extends any[], R>(fn: (...args: A) => R) {
        const wrappedFunc = async (...args: [...mainArgs: A, options: GasLimitAndValue] | A) => {
            // try to construct a WeightV2 from the last argument. If it fails, use the default weight
            const options = args[args.length - 1]

            const expectedBlockTime = new BN(this.api.consts.babe?.expectedBlockTime)
            const weight = await useWeightImpl(this.api, expectedBlockTime, new BN(1))
            let gasLimit = weight.isWeightV2 ? weight.weightV2 : weight.isEmpty ? -1 : weight.weight
            try {
                gasLimit = this.api.createType('WeightV2', options.gasLimit)
            } catch (e) {
                this.logger.warn('Failed to construct WeightV2 from gasLimit. Using default weight instead')
            }

            options.gasLimit = gasLimit
            fn(...(args.slice(-1) as A))
        }

        return wrappedFunc
    }

    // public getContract(): ProsopoContractApi {
    //     return this
    // }
    //
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
    //
    // /**
    //  * Perform a contract tx (mutating) calling the specified method
    //  * @param {string} contractMethodName
    //  * @param args
    //  * @param {number | undefined} value   The value of token that is sent with the transaction
    //  * @return JSON result containing the contract event
    //  */
    // async contractTx<T>(
    //     contractMethodName: string,
    //     args: T[],
    //     value?: number | BN | undefined
    // ): Promise<ContractSubmittableResult> {
    //     const { extrinsic } = await this.buildExtrinsic(contractMethodName, args, value)
    //     const nextNonce = await this.api.rpc.system.accountNextIndex(this.pair.address)
    //     this.nonce = nextNonce ? nextNonce.toNumber() : this.nonce
    //     this.logger.debug(`Sending ${contractMethodName} tx`)
    //     const paymentInfo = await extrinsic.paymentInfo(this.pair)
    //     this.logger.debug(`${contractMethodName} paymentInfo:`, paymentInfo.toHuman())
    //     // eslint-disable-next-line no-async-promise-executor
    //     return await new Promise(async (resolve, reject) => {
    //         const unsub = await extrinsic.signAndSend(
    //             this.pair,
    //             { nonce: this.nonce },
    //             (result: ISubmittableResult) => {
    //                 if (result.status.isFinalized || result.status.isInBlock) {
    //                     // ContractEmitted is the current generation, ContractExecution is the previous generation
    //                     const contractResult = new ContractSubmittableResult(
    //                         result,
    //                         applyOnEvent(result, ['ContractEmitted', 'ContractExecution'], (records: EventRecord[]) =>
    //                             records
    //                                 .map(
    //                                     ({
    //                                         event: {
    //                                             data: [, data],
    //                                         },
    //                                     }): DecodedEvent | null => {
    //                                         try {
    //                                             return this.abi.decodeEvent(data as Bytes)
    //                                         } catch (error) {
    //                                             this.logger.error(
    //                                                 `Unable to decode contract event: ${(error as Error).message}`
    //                                             )
    //
    //                                             return null
    //                                         }
    //                                     }
    //                                 )
    //                                 .filter((decoded): decoded is DecodedEvent => !!decoded)
    //                         )
    //                     )
    //                     unsub()
    //                     resolve(contractResult)
    //                 } else if (result.isError) {
    //                     unsub()
    //                     reject(new ProsopoContractError(result.status.type))
    //                 }
    //             }
    //         )
    //     })
    // }
    //
    // /**
    //  * Perform a contract query (non-mutating) calling the specified method
    //  * @param {string} contractMethodName
    //  * @param args
    //  * @param value
    //  * @param atBlock?
    //  * @return JSON result containing the contract event
    //  */
    // async contractQuery(
    //     contractMethodName: string,
    //     args: any[],
    //     value?: number | BN | undefined,
    //     atBlock?: string | Uint8Array
    // ): Promise<ContractCallOutcome> {
    //     const message = this.abi.findMessage(contractMethodName)
    //     const origin = this.pair.address
    //
    //     const params: Uint8Array[] = encodeStringArgs(this.abi, message, args)
    //     let api: ApiBase<'promise'> | ApiDecoration<'promise'> = this.nativeAPI
    //     if (atBlock) {
    //         api = atBlock ? await this.nativeAPI.at(atBlock) : this.nativeAPI
    //     }
    //     const { gasRequired, result } = await this.query[message.method](
    //         this.address,
    //         { gasLimit: -1, storageDepositLimit: null, value: message.isPayable ? value : 0 },
    //         ...params
    //     )
    //     const weight = result.isOk ? (api.registry.createType('WeightV2', gasRequired) as WeightV2) : undefined
    //     const options = getOptions(this.nativeAPI, message.isMutating, value, weight)
    //     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //     // @ts-ignore
    //     const responseObservable = api.rx.call.contractsApi
    //         .call<ContractExecResult>(
    //             origin,
    //             this.address,
    //             options.value ? options.value : BN_ZERO,
    //             // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //             // @ts-ignore jiggle v1 weights, metadata points to latest
    //             weight ? weight.weightV2 : options.gasLimit,
    //             // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //             // @ts-ignore
    //             options.storageDepositLimit,
    //             message.toU8a(params)
    //         )
    //         .pipe(
    //             map(
    //                 ({ debugMessage, gasConsumed, gasRequired, result, storageDeposit }): ContractCallOutcome => ({
    //                     debugMessage,
    //                     gasConsumed,
    //                     gasRequired:
    //                         gasRequired && !convertWeight(gasRequired).v1Weight.isZero() ? gasRequired : gasConsumed,
    //                     output:
    //                         result.isOk && message.returnType
    //                             ? this.abi.registry.createTypeUnsafe(
    //                                   message.returnType.lookupName || message.returnType.type,
    //                                   [result.asOk.data.toU8a(true)],
    //                                   { isPedantic: true }
    //                               )
    //                             : null,
    //                     result,
    //                     storageDeposit,
    //                 })
    //             )
    //         )
    //     const response = await firstValueFrom<ContractCallOutcome>(responseObservable)
    //     handleContractCallOutcomeErrors(response, contractMethodName)
    //     if (response.result.isOk) {
    //         return response
    //     }
    //     throw new ProsopoContractError(response.result.asErr, 'contractQuery', undefined, {
    //         contractMethodName,
    //         gasLimit: options.gasLimit?.toString(),
    //         ...(value && { value: value.toString() }),
    //     })
    // }

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

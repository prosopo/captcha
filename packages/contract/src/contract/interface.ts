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
import type { AbiMessage, ContractCallOutcome, ContractOptions } from '@polkadot/api-contract/types'
import { AbiMetadata, ContractAbi, TransactionResponse } from '../types'
import { decodeEvents, dispatchErrorHandler, encodeStringArgs, handleContractCallOutcomeErrors } from './helpers'
import { ProsopoContractError } from '../handlers'
import { ApiPromise, SubmittableResult } from '@polkadot/api'
import { ContractPromise } from '@polkadot/api-contract'
import { KeyringPair } from '@polkadot/keyring/types'
import { ContractExecResult } from '@polkadot/types/interfaces/contracts'
import { createType } from '@polkadot/types'
import { ApiBase, ApiDecoration } from '@polkadot/api/types'
import { firstValueFrom, map } from 'rxjs'
import { convertWeight } from '@polkadot/api-contract/base/util'
import { BN, BN_ONE, BN_ZERO } from '@polkadot/util'
import { Weight } from '@polkadot/types/interfaces/runtime'
import { WeightV2 } from '@polkadot/types/interfaces'
import { ContractLayoutStructField } from '@polkadot/types/interfaces/contractsAbi'
import { SubmittableExtrinsic } from '@polkadot/api/promise/types'
import { useWeightImpl } from './useWeight'
// 4_999_999_999_999
const MAX_CALL_WEIGHT = new BN(5_000_000_000_000).isub(BN_ONE)

export class ProsopoContractApi extends ContractPromise {
    contractName: string
    pair: KeyringPair
    options: ContractOptions
    nonce: number

    constructor(
        api: ApiPromise,
        abi: ContractAbi,
        address: string,
        pair: KeyringPair,
        contractName: string,
        currentNonce: number
    ) {
        super(api, abi, address)
        this.pair = pair
        this.contractName = contractName
        this.nonce = currentNonce
    }

    public getContract(): ProsopoContractApi {
        return this
    }

    getOptions(message: AbiMessage, value?: number | BN, gasLimit?: Weight | WeightV2): ContractOptions {
        const _gasLimit: Weight | WeightV2 | undefined = gasLimit
            ? gasLimit
            : message.isMutating
            ? (this.api.registry.createType('WeightV2', {
                  proofTime: new BN(1_000_000),
                  refTime: MAX_CALL_WEIGHT,
              }) as WeightV2)
            : undefined
        return {
            gasLimit: _gasLimit,
            storageDepositLimit: null,
            value: value || BN_ZERO,
        }
    }

    /**
     * Get the extrinsic for submitting in a transaction
     * @return {SubmittableExtrinsic} extrinsic
     */
    async buildExtrinsic<T>(
        contractMethodName: string,
        args: T[],
        value?: number | BN | undefined
    ): Promise<SubmittableExtrinsic> {
        // Always query first as errors are passed back from a dry run but not from a transaction
        const message = this.getContractMethod(contractMethodName)
        const encodedArgs: Uint8Array[] = encodeStringArgs(this.abi, message, args)
        const weight = await useWeightImpl(this.api as ApiPromise, new BN(this.api.consts.babe?.expectedBlockTime))
        const extrinsic = this.query[message.method](
            this.pair.address,
            {
                value,
                gasLimit: weight.isWeightV2 ? weight.weightV2 : weight.isEmpty ? -1 : weight.weight,
                storageDepositLimit: null,
            },
            ...encodedArgs
        )
        const { gasRequired, result } = await extrinsic

        if (result.isOk) {
            const options = this.getOptions(message, value, gasRequired)

            return this.tx[contractMethodName](options, ...encodedArgs)
        } else {
            throw new ProsopoContractError(result.asErr, this.buildExtrinsic.name)
        }
    }

    /**
     * Perform a contract tx (mutating) calling the specified method
     * @param {string} contractMethodName
     * @param args
     * @param {number | undefined} value   The value of token that is sent with the transaction
     * @return JSON result containing the contract event
     */
    async contractTx<T>(contractMethodName: string, args: T[], value?: number | BN | undefined): Promise<any> {
        const extrinsic = await this.buildExtrinsic(contractMethodName, args, value)
        const nextNonce = await this.api.rpc.system.accountNextIndex(this.pair.address)
        this.nonce = nextNonce ? nextNonce.toNumber() : this.nonce

        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            const unsub = await extrinsic.signAndSend(this.pair, { nonce: this.nonce }, (result: SubmittableResult) => {
                const actionStatus = {
                    from: this.pair.address.toString(),
                    txHash: result.txHash.hash.toHex(),
                } as Partial<TransactionResponse>
                if (result.status.isInBlock) {
                    actionStatus.blockHash = result.status.asInBlock.toHex()
                }
                if (result.status.isFinalized || result.status.isInBlock) {
                    result.events
                        .filter(({ event: { section } }: any): boolean => section === 'system')
                        .forEach((event): void => {
                            const {
                                event: { method },
                            } = event

                            if (method === 'ExtrinsicFailed') {
                                dispatchErrorHandler(this.api.registry, event)
                            } else if (method === 'ExtrinsicSuccess') {
                                actionStatus.result = result
                                if ('events' in result) {
                                    actionStatus.events = decodeEvents(this.address, result, this.abi)
                                }
                            }
                        })
                    unsub()
                    resolve(actionStatus as TransactionResponse)
                } else if (result.isError) {
                    unsub()
                    reject(new ProsopoContractError(result.status.type))
                }
            })
        })
    }

    /**
     * Perform a contract query (non-mutating) calling the specified method
     * @param {string} contractMethodName
     * @param args
     * @param value
     * @param atBlock?
     * @return JSON result containing the contract event
     */
    async contractQuery(
        contractMethodName: string,
        args: any[],
        value?: number | BN | undefined,
        atBlock?: string | Uint8Array
    ): Promise<ContractCallOutcome> {
        const message = this.getContractMethod(contractMethodName)
        const origin = this.pair.address

        const params: Uint8Array[] = encodeStringArgs(this.abi, message, args)
        let api: ApiBase<'promise'> | ApiDecoration<'promise'> = this.api
        if (atBlock) {
            api = atBlock ? await this.api.at(atBlock) : this.api
        }
        const { gasRequired, result } = await this.query[message.method](
            this.address,
            { gasLimit: -1, storageDepositLimit: null, value: message.isPayable ? value : 0 },
            ...params
        )
        const weight = result.isOk ? (api.registry.createType('WeightV2', gasRequired) as WeightV2) : undefined
        const options = this.getOptions(message, value, weight)
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const responseObservable = api.rx.call.contractsApi
            .call<ContractExecResult>(
                origin,
                this.address,
                options.value ? options.value : BN_ZERO,
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore jiggle v1 weights, metadata points to latest
                weight ? weight.weightV2 : options.gasLimit,
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                options.storageDepositLimit,
                message.toU8a(params)
            )
            .pipe(
                map(
                    ({ debugMessage, gasConsumed, gasRequired, result, storageDeposit }): ContractCallOutcome => ({
                        debugMessage,
                        gasConsumed,
                        gasRequired:
                            gasRequired && !convertWeight(gasRequired).v1Weight.isZero() ? gasRequired : gasConsumed,
                        output:
                            result.isOk && message.returnType
                                ? this.abi.registry.createTypeUnsafe(
                                      message.returnType.lookupName || message.returnType.type,
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
        handleContractCallOutcomeErrors(response, contractMethodName)
        if (response.result.isOk) {
            return response
        }
        throw new ProsopoContractError(response.result.asErr, 'contractQuery', undefined, {
            contractMethodName,
            gasLimit: options.gasLimit?.toString(),
            ...(value && { value: value.toString() }),
        })
    }

    /** Get the contract method from the ABI
     * @return the contract method object
     */
    getContractMethod(contractMethodName: string): AbiMessage {
        const methodObj = this.abi.messages.filter((obj) => obj.method === contractMethodName)[0]
        if (methodObj !== undefined) {
            return methodObj
        }
        throw new ProsopoContractError('CONTRACT.INVALID_METHOD', 'contractMethodName')
    }

    /** Get the storage entry from the ABI given a storage name
     * @return the storage entry object
     */
    getStorageEntry(storageName: string): ContractLayoutStructField {
        const json: AbiMetadata = this.abi.json as AbiMetadata

        let storageEntry = json.storage.root.layout.struct.fields.filter(
            (obj: { name: string }) => obj.name === storageName
        )[0]
        if (storageEntry) {
            while ('root' in storageEntry.layout) {
                storageEntry = storageEntry.layout.root
            }
            return this.abi.registry.createType('ContractLayoutStructField ', storageEntry)
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
        if (storageEntry.layout.isCell) {
            const storageCell = storageEntry.layout.asCell
            const promiseResult = this.api.rx.call.contractsApi.getStorage(this.address, storageCell.key.toHex())
            const result = await firstValueFrom(promiseResult)
            // const result = await promiseResult
            //     .pipe(map((values) => this.api.registry.createType(`Option<${type}>`, values.value)))
            //     .toPromise()
            //values.map(v => this.api.registry.createType('Option<StorageData>', v)).map(o => o.isSome ? this.api.registry.createType('Balance', o.unwrap())
            if (result) {
                return createType(result.registry, type, [result.toU8a(true)]) as T
            }
        }

        throw new ProsopoContractError('CONTRACT.INVALID_STORAGE_TYPE', 'getStorage')
    }
}

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
import type { ContractCallOutcome, ContractOptions, DecodedEvent } from '@polkadot/api-contract/types'
import { AbiMetadata, ContractAbi } from '../types'
import { encodeStringArgs, getOptions, handleContractCallOutcomeErrors } from './helpers'
import { ProsopoContractError } from '../handlers'
import { ApiPromise } from '@polkadot/api'
import { ContractPromise } from '@polkadot/api-contract'
import { ContractExecResult } from '@polkadot/types/interfaces/contracts'
import { createType } from '@polkadot/types'
import { ApiBase, ApiDecoration } from '@polkadot/api/types'
import { firstValueFrom, map } from 'rxjs'
import { convertWeight } from '@polkadot/api-contract/base/util'
import { BN, BN_ZERO } from '@polkadot/util'
import { EventRecord, WeightV2 } from '@polkadot/types/interfaces'
import { ContractLayoutStructField } from '@polkadot/types/interfaces/contractsAbi'
import { SubmittableExtrinsic } from '@polkadot/api/promise/types'
import { useWeightImpl } from './useWeight'
import { IKeyringPair, ISubmittableResult } from '@polkadot/types/types'
import { ContractSubmittableResult } from '@polkadot/api-contract/base/Contract'
import { applyOnEvent } from '@polkadot/api-contract/util'
import { Bytes } from '@polkadot/types-codec'
import consola, { LogLevel } from 'consola'

export class ProsopoContractApi extends ContractPromise {
    contractName: string
    pair: IKeyringPair
    options: ContractOptions
    nonce: number
    logger: typeof consola

    constructor(
        api: ApiPromise,
        abi: ContractAbi,
        address: string,
        pair: IKeyringPair,
        contractName: string,
        currentNonce: number,
        logLevel?: LogLevel
    ) {
        super(api, abi, address)
        this.pair = pair
        this.contractName = contractName
        this.nonce = currentNonce
        this.logger = consola.create({
            level: logLevel || ('info' as unknown as LogLevel),
        })
        this.logger.withScope(`ProsopoContractApi: ${contractName}`)
    }

    public getContract(): ProsopoContractApi {
        return this
    }

    /**
     * Get the extrinsic for submitting in a transaction
     * @return {SubmittableExtrinsic} extrinsic
     */
    async buildExtrinsic<T>(
        contractMethodName: string,
        args: T[],
        value?: number | BN | undefined
    ): Promise<{ extrinsic: SubmittableExtrinsic; options: ContractOptions }> {
        // Always query first as errors are passed back from a dry run but not from a transaction
        const message = this.abi.findMessage(contractMethodName)
        const encodedArgs: Uint8Array[] = encodeStringArgs(this.abi, message, args)
        const expectedBlockTime = new BN(this.api.consts.babe?.expectedBlockTime)
        const weight = await useWeightImpl(this.api as ApiPromise, expectedBlockTime)
        const gasLimit = weight.isWeightV2 ? weight.weightV2 : weight.isEmpty ? -1 : weight.weight
        this.logger.debug('Sending address: ', this.pair.address)
        const initialOptions = {
            value,
            gasLimit,
            storageDepositLimit: null,
        }
        const extrinsic = this.query[message.method](this.pair.address, initialOptions, ...encodedArgs)

        const response = await extrinsic
        if (response.result.isOk) {
            let options = getOptions(this.api, message.isMutating, value, response.gasRequired, response.storageDeposit)
            const extrinsicTx = this.tx[contractMethodName](options, ...encodedArgs)
            const paymentInfo = await extrinsicTx.paymentInfo(this.pair.address)
            options = getOptions(this.api, message.isMutating, value, paymentInfo.weight, response.storageDeposit)
            handleContractCallOutcomeErrors(response, contractMethodName)
            return { extrinsic: this.tx[contractMethodName](options, ...encodedArgs), options }
        } else {
            throw new ProsopoContractError(response.result.asErr, this.buildExtrinsic.name)
        }
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
        value?: number | BN | undefined
    ): Promise<ContractSubmittableResult> {
        const { extrinsic } = await this.buildExtrinsic(contractMethodName, args, value)
        const nextNonce = await this.api.rpc.system.accountNextIndex(this.pair.address)
        this.nonce = nextNonce ? nextNonce.toNumber() : this.nonce
        this.logger.debug(`Sending ${contractMethodName} tx`)
        const paymentInfo = await extrinsic.paymentInfo(this.pair)
        this.logger.debug(`${contractMethodName} paymentInfo:`, paymentInfo.toHuman())
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            const unsub = await extrinsic.signAndSend(
                this.pair,
                { nonce: this.nonce },
                (result: ISubmittableResult) => {
                    if (result.status.isFinalized || result.status.isInBlock) {
                        // ContractEmitted is the current generation, ContractExecution is the previous generation
                        const contractResult = new ContractSubmittableResult(
                            result,
                            applyOnEvent(result, ['ContractEmitted', 'ContractExecution'], (records: EventRecord[]) =>
                                records
                                    .map(
                                        ({
                                            event: {
                                                data: [, data],
                                            },
                                        }): DecodedEvent | null => {
                                            try {
                                                return this.abi.decodeEvent(data as Bytes)
                                            } catch (error) {
                                                this.logger.error(
                                                    `Unable to decode contract event: ${(error as Error).message}`
                                                )

                                                return null
                                            }
                                        }
                                    )
                                    .filter((decoded): decoded is DecodedEvent => !!decoded)
                            )
                        )
                        unsub()
                        resolve(contractResult)
                    } else if (result.isError) {
                        unsub()
                        reject(new ProsopoContractError(result.status.type))
                    }
                }
            )
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
        const message = this.abi.findMessage(contractMethodName)
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
        const options = getOptions(this.api, message.isMutating, value, weight)
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

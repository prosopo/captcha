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
import { Abi } from '@polkadot/api-contract/Abi'
import { ApiPromise } from '@polkadot/api/promise/Api'
import { BN, BN_ZERO } from '@polkadot/util/bn'
import { BlueprintOptions } from '@polkadot/api-contract/types'
import { CodePromise } from '@polkadot/api-contract/promise'
import { CodeSubmittableResult } from '@polkadot/api-contract/base'
import { ContractSubmittableResult } from '@polkadot/api-contract/base/Contract'
import { ISubmittableResult } from '@polkadot/types/types'
import { KeyringPair } from '@polkadot/keyring/types'
import { LogLevel, Logger, ProsopoContractError, getLogger } from '@prosopo/common'
import { SubmittableExtrinsic } from '@polkadot/api/types'
import { TransactionQueue } from '@prosopo/tx'
import { UseWeight } from '@prosopo/types'
import { dispatchErrorHandler, getOptions } from './helpers.js'
import { getWeight } from './useWeight.js'

interface DryRunResult {
    contract: null | SubmittableExtrinsic<'promise'>
    error: null | string
}

export class ContractDeployer {
    private api: ApiPromise
    private abi: Abi
    private wasm: Uint8Array
    private readonly code: CodePromise
    private readonly pair: KeyringPair
    private readonly params: any[]
    private readonly constructorIndex: number
    private readonly value: number
    private readonly logger: Logger
    private readonly salt: string | undefined
    private readonly transactionQueue: TransactionQueue | undefined

    constructor(
        api: ApiPromise,
        abi: Abi,
        wasm: Uint8Array,
        pair: KeyringPair,
        params: any[] = [],
        value = 0,
        constructorIndex = 0,
        salt?: string,
        logLevel?: LogLevel,
        transactionQueue?: TransactionQueue
    ) {
        this.api = api
        this.abi = abi
        this.wasm = this.api.registry.createType('Raw', wasm)
        this.pair = pair
        this.params = params
        this.constructorIndex = constructorIndex
        this.value = value
        this.salt = salt
        this.logger = getLogger(logLevel || LogLevel.enum.info, 'ContractDeployer')
        this.code = new CodePromise(api, abi, wasm)
        this.transactionQueue = transactionQueue
    }

    async deploy(): Promise<CodeSubmittableResult<any>> {
        const weight = await getWeight(this.api)
        const { contract, error } = await dryRunDeploy(
            this.code,
            this.api,
            this.abi,
            this.wasm,
            this.pair,
            this.params,
            this.value,
            weight,
            this.constructorIndex,
            this.salt,
            this.logger.getLogLevel()
        )
        this.logger.debug('Weight', weight.weightV2?.toHuman())

        const nonce = await this.api.rpc.system.accountNextIndex(this.pair.address)

        if (contract) {
            if (this.transactionQueue) {
                return new Promise((resolve, reject) => {
                    this.transactionQueue?.add(
                        contract,
                        (result: ISubmittableResult) => {
                            this.logger.info('Contract deployed by', this.pair.address)
                            resolve(new CodeSubmittableResult(result))
                        },
                        this.pair,
                        contract.method.method.toString()
                    )
                })
            } else {
                // eslint-disable-next-line no-async-promise-executor
                return new Promise(async (resolve, reject) => {
                    const unsub = await contract?.signAndSend(this.pair, { nonce }, (result: ISubmittableResult) => {
                        if (result.status.isFinalized || result.status.isInBlock) {
                            result.events
                                .filter(({ event: { section } }): boolean => section === 'system')
                                .forEach((event): void => {
                                    const {
                                        event: { method },
                                    } = event

                                    if (method === 'ExtrinsicFailed') {
                                        unsub()
                                        reject(dispatchErrorHandler(this.api.registry, event))
                                    }
                                })

                            // ContractEmitted is the current generation, ContractExecution is the previous generation
                            unsub()
                            resolve(new ContractSubmittableResult(result))
                        } else if (result.isError) {
                            unsub()
                            reject(
                                new ProsopoContractError('CONTRACT.UNKNOWN_ERROR', {
                                    context: {
                                        error: result.status.type,
                                        deployer: this.pair.address,
                                    },
                                    logLevel: this.logger.getLogLevel(),
                                })
                            )
                        }
                    })
                })
            }
        } else {
            throw new ProsopoContractError('CONTRACT.UNKNOWN_ERROR', {
                context: { error, deployer: this.pair.address },
            })
        }
    }
}

// Taken from apps/packages/page-contracts/src/Codes/Upload.tsx
export async function dryRunDeploy(
    code: CodePromise,
    api: ApiPromise,
    contractAbi: Abi,
    wasm: Uint8Array,
    pair: KeyringPair,
    params: any[] = [],
    value = 0,
    weight: UseWeight,
    constructorIndex = 0,
    salt?: string,
    logLevel?: LogLevel
): Promise<DryRunResult> {
    const accountId = pair.address
    const logger = getLogger(logLevel || LogLevel.Values.info, 'dryRunDeploy')
    let contract: SubmittableExtrinsic<'promise'> | null = null
    let error: string | null = null
    const saltOrNull = salt ? salt : null

    try {
        const message = contractAbi?.constructors[constructorIndex]
        if (message === undefined) {
            throw new ProsopoContractError('CONTRACT.CONTRACT_UNDEFINED', {
                context: { reason: 'Unable to find constructor' },
                logLevel: logger.getLogLevel(),
            })
        }
        const method = message.method
        if (code && message && accountId) {
            const dryRunParams: Parameters<typeof api.call.contractsApi.instantiate> = [
                pair.address,
                message.isPayable
                    ? api.registry.createType('Balance', value)
                    : api.registry.createType('Balance', BN_ZERO),
                weight.weightV2,
                null,
                { Upload: wasm },
                message.toU8a(params),
                '',
            ]

            const dryRunResult = await api.call.contractsApi.instantiate(...dryRunParams)
            const func = code.tx[method]
            if (func === undefined) {
                throw new ProsopoContractError('CONTRACT.INVALID_METHOD', { context: { func } })
            }
            const options: BlueprintOptions = getOptions(
                api,
                true,
                new BN(value),
                dryRunResult.gasRequired,
                dryRunResult.storageDeposit,
                true
            )
            options.salt = saltOrNull
            contract = func(options, ...params)
        }
    } catch (e) {
        error = (e as Error).message
    }

    return { contract, error }
}

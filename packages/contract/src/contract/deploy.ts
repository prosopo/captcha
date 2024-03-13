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
import type { Abi } from '@polkadot/api-contract/Abi'
import type { CodeSubmittableResult } from '@polkadot/api-contract/base'
import { ContractSubmittableResult } from '@polkadot/api-contract/base/Contract'
import { CodePromise } from '@polkadot/api-contract/promise'
import type { BlueprintOptions } from '@polkadot/api-contract/types'
import type { ApiPromise } from '@polkadot/api/promise/Api'
import type { SubmittableExtrinsic } from '@polkadot/api/types'
import type { KeyringPair } from '@polkadot/keyring/types'
import type { ISubmittableResult } from '@polkadot/types/types'
import { BN, BN_ZERO } from '@polkadot/util/bn'
import {
    LogLevel,
    type Logger,
    ProsopoContractError,
    getLogger,
} from '@prosopo/common'
import type { UseWeight } from '@prosopo/types'
import { dispatchErrorHandler } from './helpers.js'
import { calcInterval } from './useBlockInterval.js'
import { useWeightImpl } from './useWeight.js'

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

    constructor(
        api: ApiPromise,
        abi: Abi,
        wasm: Uint8Array,
        pair: KeyringPair,
        params: any[] = [],
        value = 0,
        constructorIndex = 0,
        salt?: string,
        logLevel?: LogLevel
    ) {
        this.api = api
        this.abi = abi
        this.wasm = this.api.registry.createType('Raw', wasm)
        this.pair = pair
        this.params = params
        this.constructorIndex = constructorIndex
        this.value = value
        this.salt = salt
        this.logger = getLogger(
            logLevel || LogLevel.enum.info,
            'ContractDeployer'
        )
        this.code = new CodePromise(api, abi, wasm)
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
            this.salt
        )
        this.logger.debug('Weight', weight.weightV2?.toHuman())

        const nonce = await this.api.rpc.system.accountNextIndex(
            this.pair.address
        )

        if (contract) {
            // eslint-disable-next-line no-async-promise-executor
            return new Promise(async (resolve, reject) => {
                const unsub = await contract?.signAndSend(
                    this.pair,
                    { nonce },
                    (result: ISubmittableResult) => {
                        if (
                            result.status.isFinalized ||
                            result.status.isInBlock
                        ) {
                            result.events
                                .filter(
                                    ({ event: { section } }): boolean =>
                                        section === 'system'
                                )
                                .forEach((event): void => {
                                    const {
                                        event: { method },
                                    } = event

                                    if (method === 'ExtrinsicFailed') {
                                        unsub()
                                        reject(
                                            dispatchErrorHandler(
                                                this.api.registry,
                                                event
                                            )
                                        )
                                    }
                                })

                            // ContractEmitted is the current generation, ContractExecution is the previous generation
                            unsub()
                            resolve(new ContractSubmittableResult(result))
                        } else if (result.isError) {
                            unsub()
                            reject(
                                new ProsopoContractError(
                                    'CONTRACT.UNKNOWN_ERROR',
                                    {
                                        context: { error: result.status.type },
                                    }
                                )
                            )
                        }
                    }
                )
            })
        }
        throw new ProsopoContractError('CONTRACT.UNKNOWN_ERROR', {
            context: { error },
        })
    }
}

async function getWeight(api: ApiPromise): Promise<UseWeight> {
    const expectedBlockTime = calcInterval(api)
    return await useWeightImpl(api as ApiPromise, expectedBlockTime, new BN(10))
}

// Taken from apps/packages/page-contracts/src/Codes/Upload.tsx
export async function dryRunDeploy(
    code: CodePromise,
    api: ApiPromise,
    contractAbi: Abi,
    wasm: Uint8Array,
    pair: KeyringPair,
    params: any[],
    value,
    weight: UseWeight,
    constructorIndex = 0,
    salt?: string
): Promise<DryRunResult> {
    const accountId = pair.address
    let contract: SubmittableExtrinsic<'promise'> | null = null
    let error: string | null = null
    const saltOrNull = salt ? salt : null

    try {
        const message = contractAbi?.constructors[constructorIndex]
        if (message === undefined) {
            throw new ProsopoContractError('CONTRACT.CONTRACT_UNDEFINED', {
                context: { reason: 'Unable to find constructor' },
            })
        }
        const method = message.method
        if (code && message && accountId) {
            const dryRunParams: Parameters<
                typeof api.call.contractsApi.instantiate
            > = [
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

            const dryRunResult = await api.call.contractsApi.instantiate(
                ...dryRunParams
            )
            const func = code.tx[method]
            if (func === undefined) {
                throw new ProsopoContractError('CONTRACT.INVALID_METHOD', {
                    context: { func },
                })
            }
            const options: BlueprintOptions = {
                gasLimit: dryRunResult.gasRequired,
                storageDepositLimit: dryRunResult.storageDeposit.isCharge
                    ? dryRunResult.storageDeposit.asCharge
                    : null,
                salt: saltOrNull,
            }
            if (value !== undefined) {
                options.value = value
            }
            contract = func(options, ...params)
        }
    } catch (e) {
        error = (e as Error).message
    }

    return { contract, error }
}

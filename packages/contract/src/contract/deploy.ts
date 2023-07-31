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
import { Abi, CodePromise } from '@polkadot/api-contract'
import { ApiPromise } from '@polkadot/api'
import { BN, BN_ZERO } from '@polkadot/util'
import { CodeSubmittableResult } from '@polkadot/api-contract/base'
import { ContractSubmittableResult } from '@polkadot/api-contract/base/Contract'
import { ISubmittableResult } from '@polkadot/types/types'
import { KeyringPair } from '@polkadot/keyring/types'
import { LogLevel, Logger, logger } from '@prosopo/common'
import { ProsopoContractError } from '../handlers'
import { SubmittableExtrinsic } from '@polkadot/api/types'
import { UseWeight } from '@prosopo/types'
import { calcInterval } from './useBlockInterval'
import { dispatchErrorHandler } from './helpers'
import { useWeightImpl } from './useWeight'

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
    private readonly salt?: string

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
        this.logger = logger(logLevel || LogLevel.Info, 'ContractDeployer')
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

        const nonce = await this.api.rpc.system.accountNextIndex(this.pair.address)

        if (contract) {
            // eslint-disable-next-line no-async-promise-executor
            return new Promise(async (resolve, reject) => {
                const unsub = await contract?.signAndSend(this.pair, { nonce }, (result: ISubmittableResult) => {
                    if (result.status.isFinalized || result.status.isInBlock) {
                        result.events
                            .filter(({ event: { section } }: any): boolean => section === 'system')
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
                        reject(new ProsopoContractError(result.status.type))
                    }
                })
            })
        } else {
            throw new ProsopoContractError(error || 'Unknown error')
        }
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
    params: any[] = [],
    value = 0,
    weight: UseWeight,
    constructorIndex = 0,
    salt?: string
): Promise<DryRunResult> {
    const accountId = pair.address
    let contract: SubmittableExtrinsic<'promise'> | null = null
    let error: string | null = null

    try {
        const message = contractAbi?.constructors[constructorIndex]
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
            contract = code.tx[method](
                {
                    gasLimit: dryRunResult.gasRequired,
                    storageDepositLimit: dryRunResult.storageDeposit.isCharge
                        ? dryRunResult.storageDeposit.asCharge
                        : null,
                    //storageDepositLimit: null,
                    value: message.isPayable ? value : undefined,
                    salt,
                },
                ...params
            )
        }
    } catch (e) {
        error = (e as Error).message
    }

    return { contract, error }
}

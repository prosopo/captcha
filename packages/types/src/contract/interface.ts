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
import type { AbiMetadata } from './artifacts.js'
import type { ApiPromise } from '@polkadot/api/promise/Api'
import type { BN } from '@polkadot/util/bn'
import type { BlockHash, StorageDeposit } from '@polkadot/types/interfaces'
import type { ContractOptions } from '@polkadot/api-contract/types'
import type { ContractPromise } from '@polkadot/api-contract'
import type { KeyringPair } from '@polkadot/keyring/types'
import type { Logger } from '@prosopo/common'
import type { SubmittableExtrinsic } from '@polkadot/api/promise/types'

export interface IProsopoCaptchaContract {
    api: ApiPromise
    contractName: string
    contract: ContractPromise
    nativeContract: ContractPromise
    pair: KeyringPair
    options: ContractOptions | undefined
    nonce: number
    logger: Logger
    json: AbiMetadata
    dryRunContractMethod<T>(
        contractMethodName: string,
        args: T[],
        value?: BN | undefined
    ): Promise<SubmittableExtrinsic>
// biome-ignore lint/suspicious/noExplicitAny: TODO fix
    queryAtBlock<T>(blockHash: BlockHash, methodName: string, args?: any[]): Promise<T>
    getExtrinsicAndGasEstimates<T>(
        contractMethodName: string,
        args: T[],
        value?: number | BN | undefined
    ): Promise<{ extrinsic: SubmittableExtrinsic; options: ContractOptions; storageDeposit: StorageDeposit }>
    getStorage<T>(name: string): Promise<T>
}

// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of contract <https://github.com/prosopo/contract>.
//
// contract is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// contract is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with contract. If not, see <http://www.gnu.org/licenses/>.
import BN from 'bn.js'

import { SubmittableResult } from '@polkadot/api'
import { Codec, ISubmittableResult } from '@polkadot/types/types'
import { AbiEvent } from '@polkadot/api-contract/types'
import { SignerOptions, SubmittableExtrinsic } from '@polkadot/api/types'

import { ApiPromise } from '@polkadot/api'
import { ContractPromise } from '@polkadot/api-contract'
import { AbiMessage } from '@polkadot/api-contract/types'
import { AbiStorageEntry, ContractAbi } from './artifacts'
import { KeypairType } from '@polkadot/util-crypto/types'
import { KeyringPair } from '@polkadot/keyring/types'
import { AbiVersion } from '../util/index'

export interface TransactionResponse {
    from: string
    txHash?: string
    blockHash?: string
    error?: {
        message?: any
        data?: any
    }
    result: SubmittableResult
    events?: DecodedEvent[]
}

export interface DecodedEvent {
    args: Codec[]
    name: string
    event: AbiEvent
}

export interface InjectedAccountWithMeta {
    address: string
    meta: {
        genesisHash?: string | null
        name?: string
        source: string
    }
    type?: KeypairType
}

export interface CallParams {
    dest: any
    value: BigNumber
    gasLimit: BigNumber
    inputData: Uint8Array
}

export interface CallOverrides extends SignerOptions {
    dest?: any
    salt?: any
    value?: BigNumber
    gasLimit?: BigNumber
    storageDepositLimit?: BigNumber
    signer: never
}

export type TransactionParams = (unknown | Partial<CallOverrides>)[]

export interface PopulatedTransaction extends Partial<SignerOptions> {
    callParams: CallParams
    extrinsic: SubmittableExtrinsic<'promise', ISubmittableResult>
}

export type ContractFunction<T = any> = (...args: TransactionParams) => Promise<T>

export type BigNumber = BN | bigint | number | string

// Interfaces and types taken from @redspot/patract
export interface ContractApiInterface {
    contract: ContractPromise
    contractAddress: string
    contractName: string
    abi: ContractAbi
    pair: KeyringPair
    api: ApiPromise
    abiVersion: AbiVersion

    init(
        contractAddress: string,
        pair: KeyringPair,
        contractName: string,
        abi: ContractAbi,
        api: ApiPromise
    ): Promise<this>

    getContract(): ContractPromise

    contractTx<T>(contractMethodName: string, args: T[], value?: string | BigNumber): Promise<TransactionResponse>

    contractQuery<T>(contractMethodName: string, args: any[], atBlock?: string | Uint8Array): Promise<unknown>

    getContractMethod(contractMethodName: string): AbiMessage

    getStorage<T>(name: string, type: string): Promise<T>

    getStorageEntry(storageName: string): AbiStorageEntry
}

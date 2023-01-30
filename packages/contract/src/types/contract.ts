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

import { SubmittableResult } from '@polkadot/api'
import { Codec, ISubmittableResult } from '@polkadot/types/types'
import { AbiEvent } from '@polkadot/api-contract/types'
import { SignerOptions, SubmittableExtrinsic } from '@polkadot/api/types'

import { KeypairType } from '@polkadot/util-crypto/types'
import { Compact, u64 } from '@polkadot/types-codec'
import { AnyNumber } from '@polkadot/types-codec/types'

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
    value: AnyNumber
    gasLimit: AnyNumber | Compact<u64>
    inputData: Uint8Array
}

export interface CallOverrides extends SignerOptions {
    dest?: any
    salt?: any
    value?: AnyNumber
    gasLimit?: AnyNumber | Compact<u64>
    storageDepositLimit?: AnyNumber
    signer: never
}

export type TransactionParams = (unknown | Partial<CallOverrides>)[]

export interface PopulatedTransaction extends Partial<SignerOptions> {
    callParams: CallParams
    extrinsic: SubmittableExtrinsic<'promise', ISubmittableResult>
}

export type ContractFunction<T = any> = (...args: TransactionParams) => Promise<T>

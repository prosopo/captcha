// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of provider <https://github.com/prosopo-io/provider>.
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
import { Registry } from 'redspot/types/provider'
import { AccountId, Balance, Hash } from '@polkadot/types/interfaces'
import { u16, u32 } from '@polkadot/types'
import Contract from '@redspot/patract/contract'
import { Environment } from '../env'
import { AbiMessage } from '@polkadot/api-contract/types'
import { TypeDef } from '@polkadot/types-create/types'
import { AnyJson } from '@polkadot/types/types/codec'

export enum GovernanceStatus {
    Active = 'Active', Inactive = 'Inactive', Deactivated = 'Deactivated'
}

export enum Payee {
    Provider,
    Dapp,
    None
}

export interface Provider {
    status: GovernanceStatus,
    balance: Balance,
    fee: u32,
    payee: Payee,
    serviceOrigin: Hash | string,
    captchaDatasetId: Hash | string,
}

export interface Dapp {
    status: GovernanceStatus,
    balance: Balance,
    owner: AccountId,
    minDifficulty: u16,
    clientOrigin: Hash,
}

export interface CaptchaData {
    provider: AccountId,
    merkleTreeRoot: Hash,
    captchaType: u16
}

export interface ContractTxResponse {
    args: string[],
    event: {
        args: [{
            name: string,
            type: {
                info: number,
                type: string
            }
        }, {
            name: string,
            type: TypeDef
        }],
        docs: [],
        identifier: string,
        index: number
    },
    name: string
}

export interface ContractApiInterface {
    env: Environment

    contractCall<T>(contractFunction: string, args: T[], value?: number): Promise<AnyJson>

    contractTx<T> (signedContract: Contract, contractMethodName: string, encodedArgs: T[], value: number | undefined): Promise<AnyJson>

    contractQuery<T>(signedContract: Contract, contractMethodName: string, encodedArgs: T[]): Promise<AnyJson>

    getContractMethod(contractMethodName: string): AbiMessage

    getStorage<T>(key: string, decodingFn: (registry: Registry, data: Uint8Array) => T): Promise<T>
}

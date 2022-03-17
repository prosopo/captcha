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
import {Registry} from 'redspot/types/provider'
import {AccountId, Balance, Hash} from '@polkadot/types/interfaces'
import {u16, u32} from '@polkadot/types'
import Contract from '@redspot/patract/contract'
import {AbiMessage} from '@polkadot/api-contract/types'
import {TypeDef} from '@polkadot/types-create/types'
import {AnyJson} from '@polkadot/types/types/codec'
import {z} from 'zod'
import {Network , Signer} from "redspot/types";
import {DecodedEvent} from "@redspot/patract/types";

export enum GovernanceStatus {
    Active = 'Active',
    Inactive = 'Inactive',
    Deactivated = 'Deactivated'
}

export const PayeeSchema = z.enum(['Provider', 'Dapp', 'None'])
export const Payee = PayeeSchema.Values
export type Payee = z.infer<typeof PayeeSchema>;

export interface Provider {
    status: GovernanceStatus,
    balance: Balance,
    fee: u32,
    payee: Payee,
    // rust name style, hence snake case
    service_origin: Hash | string,
    captcha_dataset_id: Hash | string,
}

export interface RandomProvider {
    provider: Provider,
    block_number: string,
}

export interface Dapp {
    status: GovernanceStatus,
    balance: Balance,
    owner: AccountId,
    min_difficulty: u16,
    client_origin: Hash,
}

export interface CaptchaData {
    provider: AccountId,
    merkle_tree_root: Hash,
    captcha_type: u16
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
    contract?: Contract
    network: Network
    mnemonic?: string
    signer?: Signer | undefined
    deployerAddress: string
    contractAddress: string
    patract: any;

    isReady(): Promise<void>

    getContract(): Promise<Contract>

    getSigner(): Promise<Signer>

    changeSigner(mnemonic: string): Promise<Signer>

    createAccountAndAddToKeyring(): [string, string]

    beforeCall<T> (contractMethodName: string, args: T[]): Promise<{ encodedArgs: T[]; signedContract: Contract }>

    contractTx <T> (contractMethodName: string, args: T[], value?: number | string): Promise<AnyJson>

    contractQuery <T> (contractMethodName: string, args: T[], atBlock?: string | Uint8Array): Promise<AnyJson>

    getContractMethod(contractMethodName: string): AbiMessage

    getStorage<T>(key: string, decodingFn: (registry: Registry, data: Uint8Array) => T): Promise<T>
}

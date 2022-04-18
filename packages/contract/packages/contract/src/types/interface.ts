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
import {AccountId} from '@polkadot/types/interfaces'
import {AbiMessage} from '@polkadot/api-contract/types'
import type {AnyJson} from '@polkadot/types/types';
import {Registry} from "@polkadot/types/types";
import BN from 'bn.js';
import type {Contract} from '../contract'
import {TransactionResponse} from "./contract";
import {Signer} from './signer'
import {ContractAbi} from './artifacts'
import {Network} from './network'

export type BigNumber = BN | bigint | number | string;

export interface ContractApiInterface {
    contract?: Contract
    mnemonic?: string
    signer: Signer
    deployerAddress: string
    contractAddress: AccountId | string
    abi: ContractAbi
    network: Network

    isReady(): Promise<void>

    getContract(): Promise<Contract>

    getSigner(): Promise<Signer>

    changeSigner(mnemonic: string): Promise<Signer>

    createAccountAndAddToKeyring(): [string, string]

    beforeCall<T>(contractMethodName: string, args: T[]): Promise<{ encodedArgs: T[]; signedContract: Contract }>

    contractTx<T>(contractMethodName: string, args: T[], value?: string | BigNumber): Promise<TransactionResponse>

    contractQuery<T>(contractMethodName: string, args: T[], atBlock?: string | Uint8Array): Promise<AnyJson>

    getContractMethod(contractMethodName: string): AbiMessage

    getStorage<T>(key: string, decodingFn: (registry: Registry, data: Uint8Array) => T): Promise<T>
}

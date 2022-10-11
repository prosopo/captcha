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
import {z} from "zod";
import {AccountId, Balance, Hash} from "@polkadot/types/interfaces";
import {u16, u32} from "@polkadot/types";

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
    service_origin: string,
    captcha_dataset_id: string,
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

export interface ILastCorrectCaptcha {
    before_ms: string,
    dapp_id: AccountId,
}

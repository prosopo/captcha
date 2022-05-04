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

export interface LastCorrectCaptcha {
    before_ms: string,
    dapp_id: AccountId,
}

import { z } from "zod";
import { AccountId, Balance, Hash } from "@polkadot/types/interfaces";
import { u16, u32 } from "@polkadot/types";
export declare enum GovernanceStatus {
    Active = "Active",
    Inactive = "Inactive",
    Deactivated = "Deactivated"
}
export declare const PayeeSchema: z.ZodEnum<["Provider", "Dapp", "None"]>;
export declare const Payee: {
    Provider: "Provider";
    Dapp: "Dapp";
    None: "None";
};
export declare type Payee = z.infer<typeof PayeeSchema>;
export interface Provider {
    status: GovernanceStatus;
    balance: Balance;
    fee: u32;
    payee: Payee;
    service_origin: string;
    captcha_dataset_id: string;
}
export interface RandomProvider {
    provider: Provider;
    block_number: string;
}
export interface Dapp {
    status: GovernanceStatus;
    balance: Balance;
    owner: AccountId;
    min_difficulty: u16;
    client_origin: Hash;
}
export interface CaptchaData {
    provider: AccountId;
    merkle_tree_root: Hash;
    captcha_type: u16;
}
export interface ILastCorrectCaptcha {
    before_ms: string;
    dapp_id: AccountId;
}
//# sourceMappingURL=prosopo.d.ts.map
import {Environment} from "../env";
import {Registry} from "redspot/types/provider";
import {AccountId, Balance, Hash} from "@polkadot/types/interfaces";
import {u16, u32} from "@polkadot/types";
import Contract from "@redspot/patract/contract";

export enum GovernanceStatus {
    Active = "Active", Inactive = "Inactive", Deactivated = "Deactivated"
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
    service_origin: Hash,
    captcha_dataset_id: Hash,
}

export interface Dapp {
    status: GovernanceStatus,
    balance: Balance,
    owner: AccountId,
    min_difficulty: u16,
    client_origin: Hash,
}

export interface contractApiInterface {
    env: Environment

    contractCall(contractFunction: string, args: any[], value?: number): Promise<any>

    contractTx(signedContract: Contract, contractMethodName: string, encodedArgs: any[], value: number | undefined)

    contractQuery(signedContract: Contract, contractMethodName: string, encodedArgs: any[]): Promise<any>

    encodeArgs(methodObj: object, args: any[], value?: number): any[]

    getContractMethod(contractMethodName: string): Object

    getEventNameFromMethodName(contractMethodName: string): string

    getStorage<T>(key: string, decodingFn: (registry: Registry, data: Uint8Array) => T): Promise<T>
}
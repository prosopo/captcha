import {TypeDef} from "@polkadot/types-create/types";
import {SubmittableResult} from "@polkadot/api";
import {Codec, ISubmittableResult} from "@polkadot/types/types";
import {AbiEvent} from "@polkadot/api-contract/types";
import {SignerOptions, SubmittableExtrinsic} from "@polkadot/api/types";
import {BigNumber} from "./index";

// Interfaces and types taken from @redspot/patract

export interface TransactionResponse {
    from: string;
    txHash?: string;
    blockHash?: string;
    error?: {
        message?: any;
        data?: any;
    };
    result: SubmittableResult;
    events?: DecodedEvent[];
}

export interface DecodedEvent {
    args: Codec[];
    name: string;
    event: AbiEvent;
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

export interface CallParams {
    dest: any;
    value: BigNumber;
    gasLimit: BigNumber;
    inputData: Uint8Array;
}

export interface CallOverrides extends SignerOptions {
    dest?: any;
    salt?: any;
    value?: BigNumber;
    gasLimit?: BigNumber;
    storageDepositLimit?: BigNumber;
    signer: never;
}

export type TransactionParams = (unknown | Partial<CallOverrides>)[];

export interface PopulatedTransaction extends Partial<SignerOptions> {
    callParams: CallParams;
    extrinsic: SubmittableExtrinsic<'promise', ISubmittableResult>;
}

export type ContractFunction<T = any> = (
    ...args: TransactionParams
) => Promise<T>;

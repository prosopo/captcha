import { ApiPromise } from '@polkadot/api';
import { Abi } from '@polkadot/api-contract';
import type { AbiMessage, ContractCallOutcome } from '@polkadot/api-contract/types';
import type { AccountId } from '@polkadot/types/interfaces';
import BN from 'bn.js';
import { ContractFunction, PopulatedTransaction, TransactionResponse } from '../types/contract';
import { BigNumber, IContract } from '../types/contract';
import { ContractAbi } from '../types/artifacts';
import { Signer } from '../types/signer';
export declare function buildCall(contract: Contract, fragment: AbiMessage, isEstimateGas?: boolean, at?: string | Uint8Array): ContractFunction<ContractCallOutcome>;
export declare class Contract implements IContract {
    readonly address: AccountId;
    readonly abi: Abi;
    readonly signer: string;
    readonly api: ApiPromise;
    readonly functions: {
        [name: string]: ContractFunction;
    };
    readonly query: {
        [name: string]: ContractFunction<ContractCallOutcome>;
    };
    readonly tx: {
        [name: string]: ContractFunction<TransactionResponse>;
    };
    /**
     * Estimated gas
     */
    readonly estimateGas: {
        [name: string]: ContractFunction<BN>;
    };
    readonly populateTransaction: {
        [name: string]: ContractFunction<PopulatedTransaction>;
    };
    readonly [key: string]: ContractFunction<ContractCallOutcome> | ContractFunction<TransactionResponse> | any;
    gasLimit?: BigNumber;
    constructor(address: string | AccountId, contractAbi: ContractAbi, apiProvider: ApiPromise, signer: Signer | string);
    /**
     * Query at specific block
     *
     * @param at string | Uint8Array
     * @param abi AbiMessage
     * @returns ContractFunction\<ContractCallOutcome\>
     */
    queryAt(at: string | Uint8Array, abi: AbiMessage): ContractFunction<ContractCallOutcome>;
    /**
     * Change contract signer
     *
     * @param signer Signer
     * @returns Contract
     */
    connect(signer: Signer | string): Contract;
    /**
     * Create Contract Instances by Contract Address
     *
     * @param address Contract address
     * @returns Contract
     */
    attach(address: string): Contract;
}
//# sourceMappingURL=contract.d.ts.map
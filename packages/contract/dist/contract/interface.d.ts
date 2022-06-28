import type { AbiMessage } from '@polkadot/api-contract/types';
import { AnyJson } from '@polkadot/types/types/codec';
import { Registry } from '@polkadot/types/types';
import { ContractApiInterface, ContractAbi, Network, TransactionResponse } from '../types';
import { Signer } from '../signer/signer';
import { Contract } from './contract';
export declare class ProsopoContractApi implements ContractApiInterface {
    contract?: Contract;
    network: Network;
    mnemonic: string;
    signer: Signer;
    contractAddress: string;
    contractName: string;
    abi: ContractAbi;
    constructor(contractAddress: string, mnemonic: string, contractName: string, abi: ContractAbi, network: Network);
    isReady(): Promise<void>;
    getSigner(): Promise<Signer>;
    changeSigner(mnemonic: string): Promise<Signer>;
    getContract(): Promise<Contract>;
    createAccountAndAddToKeyring(): [string, string];
    /**
     * Operations to carry out before calling contract
     */
    beforeCall<T>(contractMethodName: string, args: T[]): Promise<{
        encodedArgs: T[];
        signedContract: Contract;
    }>;
    /**
     * Perform a contract tx (mutating) calling the specified method
     * @param {string} contractMethodName
     * @param args
     * @param {number | undefined} value   The value of token that is sent with the transaction
     * @return JSON result containing the contract event
     */
    contractTx<T>(contractMethodName: string, args: T[], value?: number | string): Promise<TransactionResponse>;
    /**
     * Perform a contract query (non-mutating) calling the specified method
     * @param {string} contractMethodName
     * @param args
     * @param atBlock
     * @return JSON result containing the contract event
     */
    contractQuery<T>(contractMethodName: string, args: T[], atBlock?: string | Uint8Array): Promise<AnyJson>;
    /** Get the contract method from the ABI
     * @return the contract method object
     */
    getContractMethod(contractMethodName: string): AbiMessage;
    /** Get the storage key from the ABI given a storage name
     * @return the storage key
     */
    getStorageKey(storageName: string): string;
    /**
     * Get the data at specified storage key
     * @return {any} data
     */
    getStorage<T>(name: string, decodingFn: (registry: Registry, data: Uint8Array) => T): Promise<T>;
}
//# sourceMappingURL=interface.d.ts.map
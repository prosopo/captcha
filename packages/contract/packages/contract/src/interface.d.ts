import { Registry } from 'redspot/types/provider';
import { AbiMessage } from '@polkadot/api-contract/types';
import Contract from '@redspot/patract/contract';
import { ContractApiInterface } from './types';
import { Signer } from 'redspot/types';
import { Network } from 'redspot/types';
import { AnyJson } from '@polkadot/types/types/codec';
import { DecodedEvent } from "@redspot/patract/types";
export declare class ProsopoContractApi implements ContractApiInterface {
    contract?: Contract;
    network: Network;
    mnemonic?: string;
    signer?: Signer;
    deployerAddress: string;
    contractAddress: string;
    patract: any;
    contractName: string;
    constructor(deployerAddress: string, contractAddress: string, mnemonic: string | undefined, contractName: string);
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
    contractTx<T>(contractMethodName: string, args: T[], value?: number | string): Promise<DecodedEvent[]>;
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

import { Network } from 'redspot/types';
import { Signer } from 'redspot/provider';
import Contract from '@redspot/patract/contract';
import { Database, ProsopoConfig, ProsopoEnvironment } from './types';
export declare class Environment implements ProsopoEnvironment {
    config: ProsopoConfig;
    network: Network;
    contract?: Contract;
    db: Database | undefined;
    mnemonic: string;
    signer?: Signer;
    deployerAddress: string;
    patract: any;
    contractAddress: string;
    defaultEnvironment: string;
    contractName: string;
    constructor(mnemonic: any);
    isReady(): Promise<void>;
    importDatabase(): Promise<void>;
    getContract(): Promise<void>;
    getSigner(): Promise<void>;
    changeSigner(mnemonic: string): Promise<void>;
    createAccountAndAddToKeyring(): [string, string];
    private static getConfigPath;
    private static getConfig;
    private static importCsjOrEsModule;
}

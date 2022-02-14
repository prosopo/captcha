import { AnyJson } from '@polkadot/types/types/codec';
import { Hash } from '@polkadot/types/interfaces';
import { CaptchaData, ContractApiInterface, Dapp, Payee, Provider, RandomProvider } from '@prosopo/contract';
import { CaptchaSolution, CaptchaSolutionCommitment, CaptchaSolutionResponse, CaptchaWithProof, Captcha, CaptchaConfig, Database, ProsopoEnvironment } from '../types';
import { CaptchaMerkleTree } from '../merkle';
import { DecodedEvent } from "@redspot/patract/types";
/**
 * @description Tasks that are shared by the API and CLI
 */
export declare class Tasks {
    contractApi: ContractApiInterface;
    db: Database;
    captchaConfig: CaptchaConfig;
    constructor(env: ProsopoEnvironment);
    providerRegister(serviceOrigin: string, fee: number, payee: Payee, address: string): Promise<DecodedEvent[]>;
    providerUpdate(serviceOrigin: string, fee: number, payee: Payee, address: string, value: number | undefined): Promise<DecodedEvent[]>;
    providerDeregister(address: string): Promise<DecodedEvent[]>;
    providerUnstake(value: number): Promise<DecodedEvent[]>;
    providerAddDataset(file: string): Promise<DecodedEvent[]>;
    dappRegister(dappServiceOrigin: string, dappContractAddress: string, dappOwner?: string): Promise<DecodedEvent[]>;
    dappFund(contractAccount: string, value: number | string): Promise<DecodedEvent[]>;
    dappCancel(contractAccount: string): Promise<DecodedEvent[]>;
    dappUserCommit(contractAccount: string, captchaDatasetId: Hash | string, userMerkleTreeRoot: string, providerAddress: string): Promise<DecodedEvent[]>;
    providerApprove(captchaSolutionCommitmentId: any): Promise<DecodedEvent[]>;
    providerDisapprove(captchaSolutionCommitmentId: any): Promise<DecodedEvent[]>;
    getRandomProvider(userAccount: string, at?: string | Uint8Array): Promise<RandomProvider>;
    getProviderDetails(accountId: string): Promise<Provider>;
    getDappDetails(accountId: string): Promise<Dapp>;
    getCaptchaData(captchaDatasetId: string): Promise<CaptchaData>;
    getCaptchaSolutionCommitment(solutionId: string): Promise<CaptchaSolutionCommitment>;
    getProviderAccounts(): Promise<AnyJson>;
    getDappAccounts(): Promise<AnyJson>;
    /**
     * @description Get random captchas that are solved or not solved, along with the merkle proof for each
     * @param {string}   datasetId  the id of the data set
     * @param {boolean}  solved    `true` when captcha is solved
     * @param {number}   size       the number of records to be returned
     */
    getCaptchaWithProof(datasetId: Hash | string, solved: boolean, size: number): Promise<CaptchaWithProof[]>;
    /**
     * Validate and store the clear text captcha solution(s) from the Dapp User
     * @param {string} userAccount
     * @param {string} dappAccount
     * @param {string} requestHash
     * @param {JSON} captchas
     * @return {Promise<CaptchaSolutionResponse[]>} result containing the contract event
     */
    dappUserSolution(userAccount: string, dappAccount: string, requestHash: string, captchas: JSON): Promise<CaptchaSolutionResponse[]>;
    /**
     * Validate that the dapp is active in the contract
     */
    dappIsActive(dappAccount: string): Promise<boolean>;
    /**
     * Validate that the provider is active in the contract
     */
    providerIsActive(providerAccount: string): Promise<boolean>;
    /**
     * Validate length of received captchas array matches length of captchas found in database
     */
    validateCaptchasLength(captchas: JSON): Promise<{
        storedCaptchas: Captcha[];
        receivedCaptchas: CaptchaSolution[];
        captchaIds: string[];
    }>;
    /**
     * Build merkle tree and get commitment from contract, returning the tree, commitment, and commitmentId
     * @param {CaptchaSolution[]} captchaSolutions
     * @returns {Promise<{ tree: CaptchaMerkleTree, commitment: CaptchaSolutionCommitment, commitmentId: string }>}
     */
    buildTreeAndGetCommitment(captchaSolutions: CaptchaSolution[]): Promise<{
        tree: CaptchaMerkleTree;
        commitment: CaptchaSolutionCommitment;
        commitmentId: string;
    }>;
    /**
     * Validate that a Dapp User is responding to their own pending captcha request
     * @param {string} requestHash
     * @param {string} userAccount
     * @param {string[]} captchaIds
     */
    validateDappUserSolutionRequestIsPending(requestHash: string, userAccount: string, captchaIds: string[]): Promise<boolean>;
    /**
     * Get two random captchas from specified dataset, create the response and store a hash of it, marked as pending
     * @param {string} datasetId
     * @param {string} userAccount
     */
    getRandomCaptchasAndRequestHash(datasetId: string, userAccount: string): Promise<{
        captchas: CaptchaWithProof[];
        requestHash: string;
    }>;
    /**
     * Apply new captcha solutions to captcha dataset and recalculate merkle tree
     * @param {string} datasetId
     */
    calculateCaptchaSolutions(datasetId: string): Promise<void>;
    /**
     * Validate that provided `datasetId` was a result of calling `get_random_provider` method
     * @param {string} userAccount - Same user that called `get_random_provider`
     * @param {string} datasetId - `captcha_dataset_id` from the result of `get_random_provider`
     * @param {string} blockNo - Block on which `get_random_provider` was called
     */
    validateProviderWasRandomlyChosen(userAccount: string, datasetId: string | Hash, blockNo: number): Promise<void>;
}

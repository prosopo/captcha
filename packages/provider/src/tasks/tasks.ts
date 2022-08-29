// Copyright 2021-2022 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import {Hash} from '@polkadot/types/interfaces';
import type {RuntimeDispatchInfo} from '@polkadot/types/interfaces/payment';
import {AnyJson} from '@polkadot/types/types/codec';
import {hexToU8a} from '@polkadot/util';
import {randomAsHex} from '@polkadot/util-crypto';
import {
    addHashesToDataset, BigNumber, Captcha,
    CaptchaConfig, CaptchaData, CaptchaMerkleTree, CaptchaSolution,
    CaptchaSolutionCommitment, CaptchaSolutionConfig, CaptchaSolutionToUpdate,
    CaptchaStates, CaptchaStatus, CaptchaWithoutId, compareCaptchaSolutions,
    computeCaptchaHash,
    computeCaptchaSolutionHash,
    computePendingRequestHash, ContractApiInterface, Dapp, GovernanceStatus, LastCorrectCaptcha, parseCaptchaDataset,
    parseCaptchaSolutions, Payee, Provider, RandomProvider, TransactionResponse,
    ProsopoEnvError
} from '@prosopo/contract';
import consola from "consola";
import {buildDecodeVector} from '../codec/codec';
import {ERRORS} from '../errors';
import {
    DappUserSolutionResult,
    CaptchaWithProof,
    Database,
    DatasetRecord,
    ProsopoEnvironment
} from '../types';
import {loadJSONFile, shuffleArray, writeJSONFile} from '../util';

/**
 * @description Tasks that are shared by the API and CLI
 */
export class Tasks {
    contractApi: ContractApiInterface;

    db: Database;

    captchaConfig: CaptchaConfig;

    captchaSolutionConfig: CaptchaSolutionConfig

    logger: typeof consola

    constructor(env: ProsopoEnvironment) {
        if (!env.contractInterface) {
            throw new ProsopoEnvError(ERRORS.CONTRACT.CONTRACT_UNDEFINED.message, this.constructor.name, {contractAddress:env.contractAddress});
        }

        this.contractApi = env.contractInterface!;
        this.db = env.db as Database;
        this.captchaConfig = env.config.captchas;
        this.captchaSolutionConfig = env.config.captchaSolutions
        this.logger = env.logger
    }

    // Contract transactions potentially involving database writes

    async providerRegister(serviceOrigin: string, fee: number, payee: Payee, address: string): Promise<TransactionResponse> {
        return await this.contractApi.contractTx('providerRegister', [serviceOrigin, fee, payee, address]);
    }

    async providerUpdate(serviceOrigin: string, fee: number, payee: Payee, address: string, value?: BigNumber): Promise<TransactionResponse> {
        return await this.contractApi.contractTx('providerUpdate', [serviceOrigin, fee, payee, address], value);
    }

    async providerDeregister(address: string): Promise<TransactionResponse> {
        return await this.contractApi.contractTx('providerDeregister', [address]);
    }

    async providerUnstake(value: number): Promise<TransactionResponse> {
        return await this.contractApi.contractTx('providerUnstake', [], value);
    }

    async providerAddDataset(file: string): Promise<TransactionResponse> {
        const dataset = parseCaptchaDataset(loadJSONFile(file, this.logger) as JSON);
        const datasetWithoutIds = {...dataset}
        const tree = new CaptchaMerkleTree();
        const captchaHashes = await Promise.all(dataset.captchas.map(computeCaptchaHash));
        tree.build(captchaHashes);
        const datasetHashes = addHashesToDataset(dataset, tree);
        datasetHashes.datasetId = tree.root?.hash;
        datasetHashes.tree = tree.layers;
        await this.db?.storeDataset(datasetHashes);
        writeJSONFile(file, {...datasetWithoutIds, datasetId: datasetHashes.datasetId}).catch((err) => {
            console.error(`${ERRORS.GENERAL.CREATE_JSON_FILE_FAILED.message}:${err}`)
        })
        return await this.contractApi.contractTx('providerAddDataset', [hexToU8a(tree.root?.hash)]);
    }

    async dappRegister(dappServiceOrigin: string, dappContractAddress: string, dappOwner?: string): Promise<TransactionResponse> {
        return await this.contractApi.contractTx('dappRegister', [dappServiceOrigin, dappContractAddress, dappOwner]);
    }

    async dappFund(contractAccount: string, value: BigNumber): Promise<TransactionResponse> {
        return await this.contractApi.contractTx('dappFund', [contractAccount], value);
    }

    async dappCancel(contractAccount: string): Promise<TransactionResponse> {
        return await this.contractApi.contractTx('dappCancel', [contractAccount]);
    }

    async dappUserCommit(contractAccount: string, captchaDatasetId: string, userMerkleTreeRoot: string, providerAddress: string): Promise<TransactionResponse> {
        return await this.contractApi.contractTx('dappUserCommit', [contractAccount, captchaDatasetId, userMerkleTreeRoot, providerAddress]);
    }

    async providerApprove(captchaSolutionCommitmentId, refundFee): Promise<TransactionResponse> {
        return await this.contractApi.contractTx('providerApprove', [captchaSolutionCommitmentId, refundFee])
    }

    async providerDisapprove(captchaSolutionCommitmentId): Promise<TransactionResponse> {
        return await this.contractApi.contractTx('providerDisapprove', [captchaSolutionCommitmentId]);
    }

    async getRandomProvider(userAccount: string, dappContractAccount: string, at?: string | Uint8Array): Promise<RandomProvider> {
        return await this.contractApi.contractQuery('getRandomActiveProvider', [userAccount, dappContractAccount], at) as unknown as RandomProvider;
    }

    async getProviderDetails(accountId: string): Promise<Provider> {
        return await this.contractApi.contractQuery('getProviderDetails', [accountId]) as unknown as Provider;
    }

    async getDappDetails(accountId: string): Promise<Dapp> {
        return await this.contractApi.contractQuery('getDappDetails', [accountId]) as unknown as Dapp;
    }

    async getCaptchaData(captchaDatasetId: string): Promise<CaptchaData> {
        return await this.contractApi.contractQuery('getCaptchaData', [captchaDatasetId]) as unknown as CaptchaData;
    }

    async getCaptchaSolutionCommitment(solutionId: string): Promise<CaptchaSolutionCommitment> {
        return await this.contractApi.contractQuery('getCaptchaSolutionCommitment', [solutionId]) as unknown as CaptchaSolutionCommitment;
    }

    async getDappOperatorLastCorrectCaptcha(accountId: string): Promise<LastCorrectCaptcha> {
        return await this.contractApi.contractQuery('dappOperatorLastCorrectCaptcha', [accountId]) as unknown as LastCorrectCaptcha
    }

    async getProviderStakeDefault(): Promise<bigint> {
        const providerStakeDefault = await this.contractApi.contractQuery('getProviderStakeDefault', []) as string;
        return BigInt(providerStakeDefault.replace(/,/g, ''));
    }

    async getProviderAccounts(): Promise<AnyJson> {
        return await this.contractApi.contractQuery('getAllProviderIds', []);
    }

    async getDappAccounts(): Promise<AnyJson> {
        return await this.contractApi.getStorage('dapp_accounts', buildDecodeVector('DappAccounts'));
    }

    // Other tasks

    /**
     * @description Get random captchas that are solved or not solved, along with the merkle proof for each
     * @param {string}   datasetId  the id of the data set
     * @param {boolean}  solved    `true` when captcha is solved
     * @param {number}   size       the number of records to be returned
     */
    async getCaptchaWithProof(datasetId: Hash | string, solved: boolean, size: number): Promise<CaptchaWithProof[]> {
        const captchaDocs = await this.db.getRandomCaptcha(solved, datasetId, size)
        if (captchaDocs) {
            const captchas: CaptchaWithProof[] = []
            for (const captcha of captchaDocs) {
                const datasetDetails: DatasetRecord = await this.db.getDatasetDetails(datasetId)
                const tree = new CaptchaMerkleTree()
                tree.layers = datasetDetails.tree
                const proof = tree.proof(captcha.captchaId)
                // cannot pass solution to dapp user as they are required to solve the captcha!
                delete captcha.solution
                captchas.push({captcha, proof})
            }
            return captchas
        }
        throw new ProsopoEnvError(ERRORS.DATABASE.CAPTCHA_GET_FAILED.message, this.getCaptchaWithProof.name, {datasetId, solved, size})
    }

    /**
     * Validate and store the clear text captcha solution(s) from the Dapp User
     * @param {string} userAccount
     * @param {string} dappAccount
     * @param {string} requestHash
     * @param {JSON} captchas
     * @param blockHash
     * @param txHash
     * @return {Promise<DappUserSolutionResult>} result containing the contract event
     */
    async dappUserSolution(userAccount: string, dappAccount: string, requestHash: string, captchas: JSON, blockHash: string, txHash: string): Promise<DappUserSolutionResult> {
        if (!await this.dappIsActive(dappAccount)) {
            throw new ProsopoEnvError(ERRORS.CONTRACT.DAPP_NOT_ACTIVE.message, this.getPaymentInfo.name, {dappAccount})
        }
        if (blockHash === '' || txHash === '') {
            throw new ProsopoEnvError(ERRORS.API.BAD_REQUEST.message, this.getPaymentInfo.name, {userAccount, dappAccount, requestHash, blockHash, txHash})
        }

        const paymentInfo = await this.getPaymentInfo(userAccount, blockHash, txHash)
        if (!paymentInfo) {
            throw new ProsopoEnvError(ERRORS.API.PAYMENT_INFO_NOT_FOUND.message, this.getPaymentInfo.name, {userAccount, blockHash, txHash})
        }
        const partialFee = paymentInfo?.partialFee
        let response: DappUserSolutionResult = {captchas: [], partialFee: '0'};
        const {storedCaptchas, receivedCaptchas, captchaIds} = await this.validateCaptchasLength(captchas)
        const {tree, commitment, commitmentId} = await this.buildTreeAndGetCommitment(receivedCaptchas)
        const pendingRequest = await this.validateDappUserSolutionRequestIsPending(requestHash, userAccount, captchaIds)
        // Only do stuff if the commitment is Pending on chain and in local DB (avoid using Approved commitments twice)
        if (pendingRequest && commitment.status === CaptchaStatus.Pending) {
            await this.db.storeDappUserSolution(receivedCaptchas, commitmentId)
            if (compareCaptchaSolutions(receivedCaptchas, storedCaptchas)) {
                await this.providerApprove(commitmentId, partialFee)
                response = {
                    captchas: captchaIds.map((id) => ({captchaId: id, proof: tree.proof(id)})),
                    partialFee: partialFee.toString(),
                };
            } else {
                await this.providerDisapprove(commitmentId)
                response = {
                    captchas: captchaIds.map((id) => ({captchaId: id, proof: [[]]})),
                    partialFee: partialFee.toString()
                }
            }
        }

        return response
    }

    /**
     * Validate that the dapp is active in the contract
     */
    async dappIsActive(dappAccount: string): Promise<boolean> {
        const dapp = await this.getDappDetails(dappAccount)
        return dapp.status === GovernanceStatus.Active
    }

    /**
     * Validate that the provider is active in the contract
     */
    async providerIsActive(providerAccount: string): Promise<boolean> {
        const provider = await this.getProviderDetails(providerAccount)
        return provider.status === GovernanceStatus.Active
    }

    /**
     * Validate length of received captchas array matches length of captchas found in database
     */
    async validateCaptchasLength(captchas: JSON): Promise<{ storedCaptchas: Captcha[], receivedCaptchas: CaptchaSolution[], captchaIds: string[] }> {
        const receivedCaptchas = parseCaptchaSolutions(captchas)
        const captchaIds = receivedCaptchas.map((captcha) => captcha.captchaId)
        const storedCaptchas = await this.db.getCaptchaById(captchaIds)
        if (!storedCaptchas || receivedCaptchas.length !== storedCaptchas.length) {
            throw new ProsopoEnvError(ERRORS.CAPTCHA.INVALID_CAPTCHA_ID.message, this.validateCaptchasLength.name, captchas)
        }
        return {storedCaptchas, receivedCaptchas, captchaIds}
    }

    /**
     * Build merkle tree and get commitment from contract, returning the tree, commitment, and commitmentId
     * @param {CaptchaSolution[]} captchaSolutions
     * @returns {Promise<{ tree: CaptchaMerkleTree, commitment: CaptchaSolutionCommitment, commitmentId: string }>}
     */
    async buildTreeAndGetCommitment(captchaSolutions: CaptchaSolution[]): Promise<{ tree: CaptchaMerkleTree, commitment: CaptchaSolutionCommitment, commitmentId: string }> {
        const tree = new CaptchaMerkleTree()
        const solutionsHashed = captchaSolutions.map((captcha) => computeCaptchaSolutionHash(captcha))
        tree.build(solutionsHashed)
        const commitmentId = tree.root?.hash
        if (!commitmentId) {
            throw new ProsopoEnvError(ERRORS.CONTRACT.CAPTCHA_SOLUTION_COMMITMENT_DOES_NOT_EXIST.message, this.buildTreeAndGetCommitment.name, {commitmentId: commitmentId})
        }
        const commitment = await this.getCaptchaSolutionCommitment(commitmentId)
        if (!commitment) {
            throw new ProsopoEnvError(ERRORS.CONTRACT.CAPTCHA_SOLUTION_COMMITMENT_DOES_NOT_EXIST.message, this.buildTreeAndGetCommitment.name, {commitmentId: commitmentId})
        }
        return {tree, commitment, commitmentId}
    }

    /**
     * Validate that a Dapp User is responding to their own pending captcha request
     * @param {string} requestHash
     * @param {string} userAccount
     * @param {string[]} captchaIds
     */
    async validateDappUserSolutionRequestIsPending(requestHash: string, userAccount: string, captchaIds: string[]): Promise<boolean> {
        const pendingRecord = await this.db.getDappUserPending(requestHash)
        if (pendingRecord) {
            const pendingHashComputed = computePendingRequestHash(captchaIds, userAccount, pendingRecord.salt)
            return requestHash === pendingHashComputed
        }
        return false
    }

    /**
     * Get two random captchas from specified dataset, create the response and store a hash of it, marked as pending
     * @param {string} datasetId
     * @param {string} userAccount
     */
    async getRandomCaptchasAndRequestHash(datasetId: string, userAccount: string): Promise<{ captchas: CaptchaWithProof[], requestHash: string }> {
        const dataset = await this.db.getDatasetDetails(datasetId)
        if (!dataset) {
            throw (new Error(ERRORS.DATABASE.DATASET_GET_FAILED.message))
        }

        const unsolvedCount: number = Math.abs(Math.trunc(this.captchaConfig.unsolved.count))
        const solvedCount: number = Math.abs(Math.trunc(this.captchaConfig.solved.count))

        if (!solvedCount) {
            throw (new Error(ERRORS.CONFIG.INVALID_CAPTCHA_NUMBER.message))
        }

        const solved = await this.getCaptchaWithProof(datasetId, true, solvedCount)
        let unsolved: CaptchaWithProof[] = []
        if (unsolvedCount) {
            unsolved = await this.getCaptchaWithProof(datasetId, false, unsolvedCount)
        }
        const captchas: CaptchaWithProof[] = shuffleArray([...solved, ...unsolved])
        const salt = randomAsHex()

        const requestHash = computePendingRequestHash(captchas.map((c) => c.captcha.captchaId), userAccount, salt)

        await this.db.storeDappUserPending(userAccount, requestHash, salt)
        return {captchas, requestHash}
    }

    /**
     * Apply new captcha solutions to captcha dataset and recalculate merkle tree
     */
    async calculateCaptchaSolutions() {
        try {
            const captchaFilePath = this.captchaSolutionConfig.captchaFilePath
            const currentDataset = parseCaptchaDataset(loadJSONFile(captchaFilePath, this.logger) as JSON)
            if (!currentDataset.datasetId) {
                return 0
            }
            const unsolvedCaptchas = await this.db.getAllCaptchasByDatasetId(currentDataset.datasetId as string, CaptchaStates.Unsolved)

            if (!unsolvedCaptchas) {
                // edge case when a captcha dataset contains no unsolved captchas
                return 0
            }

            const totalNumberOfSolutions = this.captchaSolutionConfig.requiredNumberOfSolutions
            const winningPercentage = this.captchaSolutionConfig.solutionWinningPercentage
            const winningNumberOfSolutions = Math.round(totalNumberOfSolutions * (winningPercentage / 100))
            let solutionsToUpdate: CaptchaSolutionToUpdate[] = []

            if (unsolvedCaptchas && unsolvedCaptchas.length > 0) {
                for (let unsolvedCaptchaCount = 0; unsolvedCaptchaCount < unsolvedCaptchas.length; unsolvedCaptchaCount++) {
                    const solutions = await this.db.getAllSolutions(unsolvedCaptchas[unsolvedCaptchaCount].captchaId)
                    if (solutions && solutions.length >= totalNumberOfSolutions) {
                        const solutionsWithCount = {}
                        for (let solutionsIndex = 0; solutionsIndex < solutions.length; solutionsIndex++) {
                            const previousCount = solutionsWithCount[JSON.stringify(solutions[solutionsIndex].solution)]?.solutionCount || 0
                            solutionsWithCount[JSON.stringify(solutions[solutionsIndex].solution)] = {
                                captchaId: solutions[solutionsIndex].captchaId,
                                solution: solutions[solutionsIndex].solution,
                                salt: solutions[solutionsIndex].salt,
                                solutionCount: previousCount + 1
                            }
                        }
                        solutionsToUpdate = solutionsToUpdate.concat(
                            Object.values(solutionsWithCount)
                                .filter(({solutionCount}: any) => solutionCount >= winningNumberOfSolutions)
                                .map(({solutionCount, ...otherAttributes}: any) => otherAttributes))
                    }
                }
                if (solutionsToUpdate.length > 0) {
                    await this.updateCaptchasJSON(captchaFilePath, solutionsToUpdate)
                    await this.providerAddDataset(captchaFilePath)
                    return solutionsToUpdate.length
                } else {
                    return 0
                }
            } else {
                return 0
            }
        } catch (error) {
            throw new ProsopoEnvError(error, ERRORS.GENERAL.CALCULATE_CAPTCHA_SOLUTION.message)
        }
    }

    /**
     * Update captchas json file with new solutions
     */
    async updateCaptchasJSON(filePath: string, solutionsToUpdate: CaptchaSolutionToUpdate[]) {
        try {
            const solutionObj = {}

            for (let i = 0; i < solutionsToUpdate.length; i++) {
                solutionObj[solutionsToUpdate[i].salt] = solutionsToUpdate[i]
            }

            const prevDataset = parseCaptchaDataset(loadJSONFile(filePath, this.logger) as JSON)

            const jsonData = {
                ...prevDataset,
                captchas: prevDataset.captchas.map((item) => {
                    const captcha: CaptchaWithoutId = {
                        salt: item.salt,
                        target: item.target,
                        items: item.items
                    }
                    if (item.salt in solutionObj && 'solution' in solutionObj[item.salt]) {
                        captcha.solution = solutionObj[item.salt].solution
                    }
                    return captcha
                })
            }

            await writeJSONFile(filePath, jsonData)
            return true
        } catch (error) {
            throw new ProsopoEnvError(error, ERRORS.GENERAL.GENERATE_CPATCHAS_JSON_FAILED.message, filePath)
        }
    }

    /**
     * Block by block search for blockNo
     */
    async isRecentBlock(contract, header, blockNo: number, depth = this.captchaSolutionConfig.captchaBlockRecency) {
        if (depth == 0) {
            return false;
        }

        const _header = header.toHuman?.() || header;

        const headerBlockNo: number = Number.parseInt(_header.number);
        if (headerBlockNo == blockNo) {
            return true;
        }

        const parent = await contract.api.rpc.chain.getBlock(_header.parentHash);

        return this.isRecentBlock(contract, (parent.toHuman() as any).block.header, blockNo, depth - 1);
    }

    /**
     * Validate that provided `datasetId` was a result of calling `get_random_provider` method
     * @param {string} userAccount - Same user that called `get_random_provider`
     * @param {string} dappContractAccount - account of dapp that is requesting captcha
     * @param {string} datasetId - `captcha_dataset_id` from the result of `get_random_provider`
     * @param {string} blockNo - Block on which `get_random_provider` was called
     */
    async validateProviderWasRandomlyChosen(userAccount: string, dappContractAccount: string, datasetId: string | Hash, blockNo: number) {
        const contract = await this.contractApi.getContract();
        if (!contract) {
            throw new ProsopoEnvError(ERRORS.CONTRACT.CONTRACT_UNDEFINED.message, this.validateProviderWasRandomlyChosen.name)
        }


        const header = await contract.api.rpc.chain.getHeader()

        const isBlockNoValid = await this.isRecentBlock(contract, header, blockNo)

        if (!isBlockNoValid) {
            throw new ProsopoEnvError(ERRORS.CAPTCHA.INVALID_BLOCK_NO.message, this.validateProviderWasRandomlyChosen.name, {
                userAccount: userAccount,
                dappContractAccount: dappContractAccount,
                datasetId: datasetId,
                header: header,
                blockNo: blockNo
            });
        }

        const block = await contract.api.rpc.chain.getBlockHash(blockNo)
        const randomProviderAndBlockNo = await this.getRandomProvider(userAccount, dappContractAccount, block)

        // @ts-ignore
        if (datasetId.localeCompare(randomProviderAndBlockNo.provider.captcha_dataset_id)) {
            throw new ProsopoEnvError(ERRORS.DATASET.INVALID_DATASET_ID.message, this.validateProviderWasRandomlyChosen.name, randomProviderAndBlockNo)
        }
    }

    /**
     * Get payment info for a transaction
     * @param {string} userAccount
     * @param {string} blockHash
     * @param {string} txHash
     * @returns {Promise<RuntimeDispatchInfo|null>}
     */
    private async getPaymentInfo(userAccount: string, blockHash: string, txHash: string): Promise<RuntimeDispatchInfo | null> {
        // Validate block and transaction, checking that the signer matches the userAccount
        const signedBlock = await this.contractApi.network.api.rpc.chain.getBlock(blockHash)
        if (!signedBlock) {
            return null
        }
        const extrinsic = signedBlock.block.extrinsics.find(extrinsic => extrinsic.hash.toString() === txHash)
        if (!extrinsic || extrinsic.signer.toString() !== userAccount) {
            return null
        }
        // Retrieve tx fee for extrinsic
        const paymentInfo = await this.contractApi.network.api.rpc.payment.queryInfo(extrinsic.toHex(), blockHash)
        if (!paymentInfo) {
            return null
        }
        return paymentInfo
    }
}

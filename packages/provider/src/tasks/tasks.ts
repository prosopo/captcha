// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of provider <https://github.com/prosopo-io/provider>.
//
// provider is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// provider is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with provider.  If not, see <http://www.gnu.org/licenses/>.
import { hexToU8a } from '@polkadot/util'
import { AnyJson } from '@polkadot/types/types/codec'
import type { RuntimeDispatchInfo } from '@polkadot/types/interfaces/payment'
import { Hash } from '@polkadot/types/interfaces'
import { randomAsHex } from '@polkadot/util-crypto'
import { loadJSONFile, shuffleArray } from '../util'
import {
    addHashesToDataset,
    compareCaptchaSolutions,
    computeCaptchaHash,
    computeCaptchaSolutionHash,
    computePendingRequestHash,
    parseCaptchaDataset,
    parseCaptchaSolutions
} from '../captcha'
import {
    Captcha, CaptchaConfig, CaptchaData,
    CaptchaSolution,
    CaptchaSolutionCommitment,
    CaptchaSolutionResponse,
    CaptchaStatus,
    CaptchaWithProof,
    ContractApiInterface,
    Dapp,
    Database, DatasetRecord,
    GovernanceStatus, Payee,
    Provider,
    RandomProvider,
    ProsopoEnvironment
} from '../types'
import { ProsopoContractApi } from '../contract/interface'
import { ERRORS } from '../errors'
import { CaptchaMerkleTree } from '../merkle'
import { buildDecodeVector } from '../codec/codec'

/**
 * @description Tasks that are shared by the API and CLI
 */
export class Tasks {
    contractApi: ContractApiInterface

    db: Database

    captchaConfig: CaptchaConfig

    constructor (env: ProsopoEnvironment) {
        this.contractApi = new ProsopoContractApi(env)
        this.db = env.db as Database
        this.captchaConfig = env.config.captchas
    }

    // Contract transactions potentially involving database writes

    async providerRegister (serviceOrigin: string, fee: number, payee: Payee, address: string): Promise<AnyJson> {
        return await this.contractApi.contractCall('providerRegister', [serviceOrigin, fee, payee, address])
    }

    async providerUpdate (serviceOrigin: string, fee: number, payee: Payee, address: string, value: number | undefined): Promise<AnyJson> {
        return await this.contractApi.contractCall('providerUpdate', [serviceOrigin, fee, payee, address], value)
    }

    async providerDeregister (address: string): Promise<AnyJson> {
        return await this.contractApi.contractCall('providerDeregister', [address])
    }

    async providerUnstake (value: number): Promise<AnyJson> {
        return await this.contractApi.contractCall('providerUnstake', [], value)
    }

    async providerAddDataset (file: string): Promise<AnyJson> {
        const dataset = parseCaptchaDataset(loadJSONFile(file) as JSON)
        const tree = new CaptchaMerkleTree()
        const captchaHashes = await Promise.all(dataset.captchas.map(computeCaptchaHash))
        tree.build(captchaHashes)
        const datasetHashes = addHashesToDataset(dataset, tree)
        datasetHashes.datasetId = tree.root?.hash
        datasetHashes.tree = tree.layers
        await this.db?.storeDataset(datasetHashes)
        return await this.contractApi.contractCall('providerAddDataset', [hexToU8a(tree.root?.hash)])
    }

    async dappRegister (dappServiceOrigin: string, dappContractAddress: string, dappOwner?: string): Promise<AnyJson> {
        return await this.contractApi.contractCall('dappRegister', [dappServiceOrigin, dappContractAddress, dappOwner])
    }

    async dappFund (contractAccount: string, value: number | string): Promise<AnyJson> {
        return await this.contractApi.contractCall('dappFund', [contractAccount], value)
    }

    async dappCancel (contractAccount: string): Promise<AnyJson> {
        return await this.contractApi.contractCall('dappCancel', [contractAccount])
    }

    async dappUserCommit (contractAccount: string, captchaDatasetId: Hash | string, userMerkleTreeRoot: string, providerAddress: string) {
        return await this.contractApi.contractCall('dappUserCommit', [contractAccount, captchaDatasetId, userMerkleTreeRoot, providerAddress])
    }

    async providerApprove (captchaSolutionCommitmentId, refundFee): Promise<AnyJson> {
        return await this.contractApi.contractCall('providerApprove', [captchaSolutionCommitmentId, refundFee])
    }

    async providerDisapprove (captchaSolutionCommitmentId): Promise<AnyJson> {
        return await this.contractApi.contractCall('providerDisapprove', [captchaSolutionCommitmentId])
    }

    async getRandomProvider (userAccount: string, at?: string | Uint8Array): Promise<RandomProvider> {
        return await this.contractApi.contractCall('getRandomActiveProvider', [userAccount], undefined, at) as unknown as RandomProvider
    }

    async getProviderDetails (accountId: string): Promise<Provider> {
        return await this.contractApi.contractCall('getProviderDetails', [accountId]) as unknown as Provider
    }

    async getDappDetails (accountId: string): Promise<Dapp> {
        return await this.contractApi.contractCall('getDappDetails', [accountId]) as unknown as Dapp
    }

    async getCaptchaData (captchaDatasetId: string): Promise<CaptchaData> {
        return await this.contractApi.contractCall('getCaptchaData', [captchaDatasetId]) as unknown as CaptchaData
    }

    async getCaptchaSolutionCommitment (solutionId: string): Promise<CaptchaSolutionCommitment> {
        return await this.contractApi.contractCall('getCaptchaSolutionCommitment', [solutionId]) as unknown as CaptchaSolutionCommitment
    }

    async getProviderAccounts (): Promise<AnyJson> {
        return await this.contractApi.contractCall('getAllProviderIds', [])
    }

    async getDappAccounts (): Promise<AnyJson> {
        return await this.contractApi.getStorage('dapp_accounts', buildDecodeVector('DappAccounts'))
    }

    // Other tasks

    /**
     * @description Get random captchas that are solved or not solved, along with the merkle proof for each
     * @param {string}   datasetId  the id of the data set
     * @param {boolean}  solved    `true` when captcha is solved
     * @param {number}   size       the number of records to be returned
     */
    async getCaptchaWithProof (datasetId: Hash | string, solved: boolean, size: number): Promise<CaptchaWithProof[]> {
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
                captchas.push({ captcha, proof })
            }
            return captchas
        }
        throw Error(ERRORS.DATABASE.CAPTCHA_GET_FAILED.message)
    }

    /**
     * Validate and store the clear text captcha solution(s) from the Dapp User
     * @param {string} userAccount
     * @param {string} dappAccount
     * @param {string} requestHash
     * @param {JSON} captchas
     * @return {Promise<CaptchaSolutionResponse[]>} result containing the contract event
     */
    async dappUserSolution (userAccount: string, dappAccount: string, requestHash: string, captchas: JSON, blockHash: string, txHash: string): Promise<CaptchaSolutionResponse[]> {
        if (!await this.dappIsActive(dappAccount)) {
            throw new Error(ERRORS.CONTRACT.DAPP_NOT_ACTIVE.message)
        }
        if (blockHash === '' || txHash === '') {
            throw new Error(ERRORS.API.BAD_REQUEST.message)
        }

        const paymentInfo = await this.getPaymentInfo(userAccount, blockHash, txHash)
        if (!paymentInfo) {
            throw new Error(ERRORS.API.PAYMENT_INFO_NOT_FOUND.message)
        }
        const partialFee = paymentInfo?.partialFee
        let response: CaptchaSolutionResponse[] = []
        const { storedCaptchas, receivedCaptchas, captchaIds } = await this.validateCaptchasLength(captchas)
        const { tree, commitment, commitmentId } = await this.buildTreeAndGetCommitment(receivedCaptchas)
        const pendingRequest = await this.validateDappUserSolutionRequestIsPending(requestHash, userAccount, captchaIds)

        // Only do stuff if the commitment is Pending on chain and in local DB (avoid using Approved commitments twice)
        if (pendingRequest && commitment.status === CaptchaStatus.Pending) {
            await this.db.storeDappUserSolution(receivedCaptchas, commitmentId)
            if (compareCaptchaSolutions(receivedCaptchas, storedCaptchas)) {
                await this.providerApprove(commitmentId, partialFee)
                response = captchaIds.map((id) => ({ captchaId: id, proof: tree.proof(id) }))
            } else {
                await this.providerDisapprove(commitmentId)
            }
        }

        return response
    }

    /**
     * Validate that the dapp is active in the contract
     */
    async dappIsActive (dappAccount: string): Promise<boolean> {
        const dapp = await this.getDappDetails(dappAccount)
        return dapp.status === GovernanceStatus.Active
    }

    /**
     * Validate that the provider is active in the contract
     */
    async providerIsActive (providerAccount: string): Promise<boolean> {
        const provider = await this.getProviderDetails(providerAccount)
        return provider.status === GovernanceStatus.Active
    }

    /**
     * Validate length of received captchas array matches length of captchas found in database
     */
    async validateCaptchasLength (captchas: JSON): Promise<{ storedCaptchas: Captcha[], receivedCaptchas: CaptchaSolution[], captchaIds: string[] }> {
        const receivedCaptchas = parseCaptchaSolutions(captchas)
        const captchaIds = receivedCaptchas.map((captcha) => captcha.captchaId)
        const storedCaptchas = await this.db.getCaptchaById(captchaIds)
        if (!storedCaptchas || receivedCaptchas.length !== storedCaptchas.length) {
            throw new Error(ERRORS.CAPTCHA.INVALID_CAPTCHA_ID.message)
        }
        return { storedCaptchas, receivedCaptchas, captchaIds }
    }

    /**
     * Build merkle tree and get commitment from contract, returning the tree, commitment, and commitmentId
     * @param {CaptchaSolution[]} captchaSolutions
     * @returns {Promise<{ tree: CaptchaMerkleTree, commitment: CaptchaSolutionCommitment, commitmentId: string }>}
     */
    async buildTreeAndGetCommitment (captchaSolutions: CaptchaSolution[]): Promise<{ tree: CaptchaMerkleTree, commitment: CaptchaSolutionCommitment, commitmentId: string }> {
        const tree = new CaptchaMerkleTree()
        const solutionsHashed = captchaSolutions.map((captcha) => computeCaptchaSolutionHash(captcha))
        tree.build(solutionsHashed)
        const commitmentId = tree.root?.hash
        if (!commitmentId) {
            throw new Error(ERRORS.CONTRACT.CAPTCHA_SOLUTION_COMMITMENT_DOES_NOT_EXIST.message)
        }
        const commitment = await this.getCaptchaSolutionCommitment(commitmentId)
        if (!commitment) {
            throw new Error(ERRORS.CONTRACT.CAPTCHA_SOLUTION_COMMITMENT_DOES_NOT_EXIST.message)
        }
        return { tree, commitment, commitmentId }
    }

    /**
     * Validate that a Dapp User is responding to their own pending captcha request
     * @param {string} requestHash
     * @param {string} userAccount
     * @param {string[]} captchaIds
     */
    async validateDappUserSolutionRequestIsPending (requestHash: string, userAccount: string, captchaIds: string[]): Promise<boolean> {
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
    async getRandomCaptchasAndRequestHash (datasetId: string, userAccount: string): Promise<{ captchas: CaptchaWithProof[], requestHash: string }> {
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
        let unsolved:CaptchaWithProof[] = []
        if (unsolvedCount) {
            unsolved = await this.getCaptchaWithProof(datasetId, false, unsolvedCount)
        }
        const captchas: CaptchaWithProof[] = shuffleArray([...solved, ...unsolved])
        const salt = randomAsHex()

        const requestHash = computePendingRequestHash(captchas.map((c) => c.captcha.captchaId), userAccount, salt)
        await this.db.storeDappUserPending(userAccount, requestHash, salt)
        return { captchas, requestHash }
    }

    /**
     * Apply new captcha solutions to captcha dataset and recalculate merkle tree
     * @param {string} datasetId
     */
    async calculateCaptchaSolutions (datasetId: string) {
        // TODO run this on a predefined schedule as updating the dataset requires committing an updated
        // captcha_dataset_id to the blockchain
    }

    /**
     * Validate that provided `datasetId` was a result of calling `get_random_provider` method
     * @param {string} userAccount - Same user that called `get_random_provider`
     * @param {string} datasetId - `captcha_dataset_id` from the result of `get_random_provider`
     * @param {string} blockNo - Block on which `get_random_provider` was called
     */
    async validateProviderWasRandomlyChosen (userAccount: string, datasetId: string | Hash, blockNo: number) {
        const contract = this.contractApi.env.contract
        if (!contract) {
            throw new Error(ERRORS.CONTRACT.CONTRACT_UNDEFINED.message)
        }
        const block = await contract.api.rpc.chain.getBlockHash(blockNo)
        const randomProviderAndBlockNo = await this.getRandomProvider(userAccount, block)
        // TODO: create mappers/transformations for fields
        // @ts-ignore
        if (datasetId.localeCompare(randomProviderAndBlockNo.provider.captcha_dataset_id)) {
            throw new Error(ERRORS.DATASET.INVALID_DATASET_ID.message)
        }
    }

    /**
     * Get payment info for a transaction
     * @param {string} userAccount
     * @param {string} blockHash
     * @param {string} txHash
     * @returns {Promise<RuntimeDispatchInfo|null>}
     */
    private async getPaymentInfo (userAccount: string, blockHash: string, txHash: string): Promise<RuntimeDispatchInfo|null> {
        // Validate block and transaction, checking that the signer matches the userAccount
        const signedBlock = await this.contractApi.env.network.api.rpc.chain.getBlock(blockHash)
        if (!signedBlock) {
            return null
        }
        const extrinsic = signedBlock.block.extrinsics.find(extrinsic => extrinsic.hash.toString() === txHash)
        if (!extrinsic || extrinsic.signer.toString() !== userAccount) {
            return null
        }
        // Retrieve tx fee for extrinsic
        const paymentInfo = await this.contractApi.env.network.api.rpc.payment.queryInfo(extrinsic.toHex(), blockHash)
        if (!paymentInfo) {
            return null
        }
        return paymentInfo
    }
}

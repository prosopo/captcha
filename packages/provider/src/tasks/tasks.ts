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
    Captcha, CaptchaData,
    CaptchaSolution,
    CaptchaSolutionCommitment,
    CaptchaSolutionResponse,
    CaptchaStatus,
    CaptchaWithProof,
    ContractApiInterface,
    Dapp,
    Database, DatasetRecord,
    GovernanceStatus, Payee,
    Provider
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

    constructor (env) {
        this.contractApi = new ProsopoContractApi(env)
        this.db = env.db
    }

    // Contract tasks

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

    async dappFund (contractAccount: string, value: number) {
        return await this.contractApi.contractCall('dappFund', [contractAccount], value)
    }

    async dappCancel (contractAccount: string) {
        return await this.contractApi.contractCall('dappCancel', [contractAccount])
    }

    async dappUserCommit (contractAccount: string, captchaDatasetId: Hash | string, userMerkleTreeRoot: string, providerAddress: string) {
        return await this.contractApi.contractCall('dappUserCommit', [contractAccount, captchaDatasetId, userMerkleTreeRoot, providerAddress])
    }

    async providerApprove (captchaSolutionCommitmentId) {
        return await this.contractApi.contractCall('providerApprove', [captchaSolutionCommitmentId])
    }

    async providerDisapprove (captchaSolutionCommitmentId) {
        return await this.contractApi.contractCall('providerDisapprove', [captchaSolutionCommitmentId])
    }

    async getRandomProvider (): Promise<Provider> {
        return await this.contractApi.contractCall('getRandomActiveProvider', []) as unknown as Provider
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
    async getCaptchaWithProof (datasetId: Hash | string | Uint8Array, solved: boolean, size: number): Promise<CaptchaWithProof[]> {
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
    async dappUserSolution (userAccount: string, dappAccount: string, requestHash: string, captchas: JSON): Promise<CaptchaSolutionResponse[]> {
        if (!await this.dappIsActive(dappAccount)) {
            throw new Error(ERRORS.CONTRACT.DAPP_NOT_ACTIVE.message)
        }

        let response: CaptchaSolutionResponse[] = []
        const { storedCaptchas, receivedCaptchas, captchaIds } = await this.validateCaptchasLength(captchas)
        const { tree, commitment, commitmentId } = await this.buildTreeAndGetCommitment(receivedCaptchas)
        const pendingRequest = await this.validateDappUserSolutionRequestIsPending(requestHash, userAccount, captchaIds)

        // Only do stuff if the commitment is Pending on chain and in local DB (avoid using Approved commitments twice)
        if (pendingRequest && commitment.status === CaptchaStatus.Pending) {
            await this.db.storeDappUserSolution(receivedCaptchas, commitmentId)
            if (compareCaptchaSolutions(receivedCaptchas, storedCaptchas)) {
                await this.providerApprove(commitmentId)
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
        const solved = await this.getCaptchaWithProof(datasetId, true, 1)
        const unsolved = await this.getCaptchaWithProof(datasetId, false, 1)
        const captchas: CaptchaWithProof[] = shuffleArray([solved[0], unsolved[0]])
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
}

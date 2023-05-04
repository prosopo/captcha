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
import { Hash } from '@polkadot/types/interfaces'
import { hexToU8a, stringToHex } from '@polkadot/util'
import { randomAsHex, signatureVerify } from '@polkadot/util-crypto'
import {
    CaptchaMerkleTree,
    buildDataset,
    captchaSort,
    compareCaptchaSolutions,
    computeCaptchaSolutionHash,
    computePendingRequestHash,
    parseAndSortCaptchaSolutions,
    parseCaptchaDataset,
} from '@prosopo/datasets'
import { Logger, ProsopoEnvError, logger } from '@prosopo/common'
import consola from 'consola'
import {
    Captcha,
    CaptchaConfig,
    CaptchaSolution,
    CaptchaSolutionConfig,
    CaptchaSolutionToUpdate,
    CaptchaStates,
    CaptchaWithProof,
    CaptchaWithoutId,
    DappUserSolutionResult,
    Database,
    DatasetBase,
    DatasetRaw,
    IProsopoContractMethods,
    ProsopoEnvironment,
    UserCommitmentRecord,
} from '@prosopo/types'
import { calculateNewSolutions, loadJSONFile, shuffleArray, updateSolutions, writeJSONFile } from '../util'

import { i18n } from '@prosopo/common'
import { BlockHash } from '@polkadot/types/interfaces/chain/index'
import { SignedBlock } from '@polkadot/types/interfaces/runtime/index'
import { RuntimeDispatchInfoV1 } from '@polkadot/types/interfaces/payment/index'
import { ContractSubmittableResult } from '@polkadot/api-contract/base/Contract'

/**
 * @description Tasks that are shared by the API and CLI
 */
export class Tasks {
    contractApi: IProsopoContractMethods

    db: Database

    captchaConfig: CaptchaConfig

    captchaSolutionConfig: CaptchaSolutionConfig

    logger: Logger

    constructor(env: ProsopoEnvironment) {
        if (!env.contractInterface) {
            throw new ProsopoEnvError(
                'CONTRACT.CONTRACT_UNDEFINED',
                this.constructor.name,
                {},
                { contractAddress: env.contractAddress }
            )
        }

        this.contractApi = env.contractInterface
        this.db = env.db as Database
        this.captchaConfig = env.config.captchas
        this.captchaSolutionConfig = env.config.captchaSolutions
        this.logger = logger(env.config.logLevel, 'Tasks')
    }

    async providerAddDatasetFromFile(file: string): Promise<ContractSubmittableResult> {
        const datasetRaw = parseCaptchaDataset(loadJSONFile(file, this.logger) as JSON)
        return await this.providerAddDataset(datasetRaw, file)
    }

    async providerAddDataset(datasetRaw: DatasetRaw, file?: string): Promise<ContractSubmittableResult> {
        const dataset = await buildDataset(datasetRaw)
        if (!dataset.datasetId) {
            throw new ProsopoEnvError('DATASET.DATASET_ID_UNDEFINED', this.providerAddDataset.name)
        }
        if (file) {
            await writeJSONFile(file, {
                ...datasetRaw,
                datasetId: dataset.datasetId,
            }).catch((err) => {
                console.error(`${i18n.t('GENERAL.CREATE_JSON_FILE_FAILED')}:${err}`)
            })
        }
        await this.db?.storeDataset(dataset)
        return await this.contractApi.contractTx('providerAddDataset', [
            hexToU8a(dataset.datasetId),
            hexToU8a(dataset.datasetContentId),
        ])
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
                const datasetDetails: DatasetBase = await this.db.getDatasetDetails(datasetId)
                const tree = new CaptchaMerkleTree()
                if (datasetDetails.contentTree) {
                    tree.layers = datasetDetails.contentTree
                    const proof = tree.proof(captcha.captchaContentId)
                    // cannot pass solution to dapp user as they are required to solve the captcha!
                    delete captcha.solution
                    captcha.items = shuffleArray(captcha.items)
                    captchas.push({ captcha, proof })
                }
            }
            return captchas
        }
        throw new ProsopoEnvError(
            'DATABASE.CAPTCHA_GET_FAILED',
            this.getCaptchaWithProof.name,
            {},
            { datasetId, solved, size }
        )
    }

    /**
     * Validate and store the captcha solution(s) from the Dapp User in a web3 environment
     * @param {string} userAccount
     * @param {string} dappAccount
     * @param {string} requestHash
     * @param {JSON} captchas
     * @param blockHash
     * @param txHash
     * @return {Promise<DappUserSolutionResult>} result containing the contract event
     */
    async dappUserSolution(
        userAccount: string,
        dappAccount: string,
        requestHash: string,
        captchas: CaptchaSolution[],
        blockHash: string,
        txHash: string
    ): Promise<DappUserSolutionResult> {
        if (!(await this.dappIsActive(dappAccount))) {
            throw new ProsopoEnvError('CONTRACT.DAPP_NOT_ACTIVE', this.getPaymentInfo.name, {}, { dappAccount })
        }
        if (blockHash === '' || txHash === '') {
            throw new ProsopoEnvError(
                'API.BAD_REQUEST',
                this.getPaymentInfo.name,
                {},
                { userAccount, dappAccount, requestHash, blockHash, txHash }
            )
        }

        const paymentInfo = await this.getPaymentInfo(userAccount, blockHash, txHash)
        if (!paymentInfo) {
            throw new ProsopoEnvError(
                'API.PAYMENT_INFO_NOT_FOUND',
                this.getPaymentInfo.name,
                {},
                { userAccount, blockHash, txHash }
            )
        }
        const partialFee = paymentInfo?.partialFee
        let response: DappUserSolutionResult = {
            captchas: [],
            partialFee: '0',
            solutionApproved: false,
        }
        const { storedCaptchas, receivedCaptchas, captchaIds } =
            await this.validateReceivedCaptchasAgainstStoredCaptchas(captchas)
        const { tree, commitmentId } = await this.buildTreeAndGetCommitmentId(receivedCaptchas)
        const providerDetails = await this.contractApi.getProviderDetails(this.contractApi.pair.address)
        const commitment = await this.contractApi.getCaptchaSolutionCommitment(commitmentId)
        if (!commitment) {
            throw new ProsopoEnvError(
                'CONTRACT.CAPTCHA_SOLUTION_COMMITMENT_DOES_NOT_EXIST',
                this.dappUserSolution.name,
                {},
                { commitmentId: commitmentId }
            )
        }
        const pendingRequest = await this.validateDappUserSolutionRequestIsPending(requestHash, userAccount, captchaIds)
        // Only do stuff if the commitment is Pending on chain and in local DB (avoid using Approved commitments twice)
        if (pendingRequest && commitment.status.toString() === 'Pending') {
            await this.db.storeDappUserSolution(
                receivedCaptchas,
                commitmentId,
                userAccount,
                dappAccount,
                providerDetails.datasetId.toString()
            )
            if (compareCaptchaSolutions(receivedCaptchas, storedCaptchas)) {
                await this.contractApi.providerApprove(commitmentId, partialFee)
                response = {
                    captchas: captchaIds.map((id) => ({
                        captchaId: id,
                        proof: tree.proof(id),
                    })),
                    partialFee: partialFee.toString(),
                    solutionApproved: true,
                }
                await this.db.approveDappUserCommitment(commitmentId)
            } else {
                await this.contractApi.providerDisapprove(commitmentId)
                response = {
                    captchas: captchaIds.map((id) => ({
                        captchaId: id,
                        proof: [[]],
                    })),
                    partialFee: partialFee.toString(),
                    solutionApproved: false,
                }
            }
        }

        return response
    }

    /**
     * Validate and store the text captcha solution(s) from the Dapp User in a web2 environment
     * @param {string} userAccount
     * @param {string} dappAccount
     * @param {string} requestHash
     * @param {JSON} captchas
     * @param {string} signature
     * @return {Promise<DappUserSolutionResult>} result containing the contract event
     */
    async dappUserSolutionWeb2(
        userAccount: string,
        dappAccount: string,
        requestHash: string,
        captchas: CaptchaSolution[],
        signature: string // the signature to indicate ownership of account (web2 only)
    ): Promise<DappUserSolutionResult> {
        if (!(await this.dappIsActive(dappAccount))) {
            throw new ProsopoEnvError('CONTRACT.DAPP_NOT_ACTIVE', this.getPaymentInfo.name, {}, { dappAccount })
        }

        // check that the signature is valid (i.e. the web2 user has signed the message with their private key, proving they own their account)
        const verification = signatureVerify(stringToHex(requestHash), signature, userAccount)
        if (!verification.isValid) {
            // the signature is not valid, so the user is not the owner of the account. May have given a false account address with good reputation in an attempt to impersonate
            throw new ProsopoEnvError('GENERAL.INVALID_SIGNATURE', this.dappUserSolutionWeb2.name, {}, { userAccount })
        }

        let response: DappUserSolutionResult = {
            captchas: [],
            solutionApproved: false,
        }
        const { storedCaptchas, receivedCaptchas, captchaIds } =
            await this.validateReceivedCaptchasAgainstStoredCaptchas(captchas)
        const { tree, commitmentId } = await this.buildTreeAndGetCommitmentId(receivedCaptchas)
        const providerDetails = await this.contractApi.getProviderDetails(this.contractApi.pair.address)
        const pendingRequest = await this.validateDappUserSolutionRequestIsPending(requestHash, userAccount, captchaIds)
        // Only do stuff if the request is in the local DB
        if (pendingRequest) {
            await this.db.storeDappUserSolution(
                receivedCaptchas,
                commitmentId,
                userAccount,
                dappAccount,
                providerDetails.datasetId.toString()
            )
            if (compareCaptchaSolutions(receivedCaptchas, storedCaptchas)) {
                response = {
                    captchas: captchaIds.map((id) => ({
                        captchaId: id,
                        proof: tree.proof(id),
                    })),
                    solutionApproved: true,
                }
                await this.db.approveDappUserCommitment(commitmentId)
            } else {
                response = {
                    captchas: captchaIds.map((id) => ({
                        captchaId: id,
                        proof: [[]],
                    })),
                    solutionApproved: false,
                }
            }
        }

        return response
    }

    /**
     * Validate that the dapp is active in the contract
     */
    async dappIsActive(dappAccount: string): Promise<boolean> {
        const dapp = await this.contractApi.getDappDetails(dappAccount)
        //dapp.status.isActive doesn't work: https://substrate.stackexchange.com/questions/6333/how-do-we-work-with-polkadot-js-enums-in-typescript
        return dapp.status.toString() === 'Active'
    }

    /**
     * Validate that the provider is active in the contract
     */
    async providerIsActive(providerAccount: string): Promise<boolean> {
        const provider = await this.contractApi.getProviderDetails(providerAccount)
        return provider.status.isActive
    }

    /**
     * Validate length of received captchas array matches length of captchas found in database
     * Validate that the datasetId is the same for all captchas and is equal to the datasetId on the stored captchas
     */
    async validateReceivedCaptchasAgainstStoredCaptchas(captchas: CaptchaSolution[]): Promise<{
        storedCaptchas: Captcha[]
        receivedCaptchas: CaptchaSolution[]
        captchaIds: string[]
    }> {
        const receivedCaptchas = parseAndSortCaptchaSolutions(captchas)
        const captchaIds = receivedCaptchas.map((captcha) => captcha.captchaId)
        const storedCaptchas = await this.db.getCaptchaById(captchaIds)
        if (!storedCaptchas || receivedCaptchas.length !== storedCaptchas.length) {
            throw new ProsopoEnvError(
                'CAPTCHA.INVALID_CAPTCHA_ID',
                this.validateReceivedCaptchasAgainstStoredCaptchas.name,
                {},
                captchas
            )
        }
        if (!storedCaptchas.every((captcha) => captcha.datasetId === storedCaptchas[0].datasetId)) {
            throw new ProsopoEnvError(
                'CAPTCHA.DIFFERENT_DATASET_IDS',
                this.validateReceivedCaptchasAgainstStoredCaptchas.name,
                {},
                captchas
            )
        }
        return { storedCaptchas, receivedCaptchas, captchaIds }
    }

    /**
     * Build merkle tree and get commitment from contract, returning the tree, commitment, and commitmentId
     * @param {CaptchaSolution[]} captchaSolutions
     * @returns {Promise<{ tree: CaptchaMerkleTree, commitment: CaptchaSolutionCommitment, commitmentId: string }>}
     */
    async buildTreeAndGetCommitmentId(
        captchaSolutions: CaptchaSolution[]
    ): Promise<{ tree: CaptchaMerkleTree; commitmentId: string }> {
        const tree = new CaptchaMerkleTree()
        const solutionsHashed = captchaSolutions.map((captcha) => computeCaptchaSolutionHash(captcha))
        tree.build(solutionsHashed)
        const commitmentId = tree.root?.hash
        if (!commitmentId) {
            throw new ProsopoEnvError(
                'CONTRACT.CAPTCHA_SOLUTION_COMMITMENT_DOES_NOT_EXIST',
                this.buildTreeAndGetCommitmentId.name,
                {},
                { commitmentId: commitmentId }
            )
        }

        return { tree, commitmentId }
    }

    /**
     * Validate that a Dapp User is responding to their own pending captcha request
     * @param {string} requestHash
     * @param {string} userAccount
     * @param {string[]} captchaIds
     */
    async validateDappUserSolutionRequestIsPending(
        requestHash: string,
        userAccount: string,
        captchaIds: string[]
    ): Promise<boolean> {
        const pendingRecord = await this.db.getDappUserPending(requestHash)
        const currentTime = Date.now()
        if (pendingRecord.deadline < currentTime) {
            // deadline for responding to the captcha has expired
            this.logger.info('Deadline for responding to captcha has expired')
            return false
        }
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
    async getRandomCaptchasAndRequestHash(
        datasetId: string,
        userAccount: string
    ): Promise<{ captchas: CaptchaWithProof[]; requestHash: string }> {
        const dataset = await this.db.getDatasetDetails(datasetId)
        if (!dataset) {
            throw new ProsopoEnvError('DATABASE.DATASET_GET_FAILED')
        }

        const unsolvedCount: number = Math.abs(Math.trunc(this.captchaConfig.unsolved.count))
        const solvedCount: number = Math.abs(Math.trunc(this.captchaConfig.solved.count))

        if (!solvedCount) {
            throw new ProsopoEnvError('CONFIG.INVALID_CAPTCHA_NUMBER')
        }

        const solved = await this.getCaptchaWithProof(datasetId, true, solvedCount)
        let unsolved: CaptchaWithProof[] = []
        if (unsolvedCount) {
            unsolved = await this.getCaptchaWithProof(datasetId, false, unsolvedCount)
        }
        const captchas: CaptchaWithProof[] = shuffleArray([...solved, ...unsolved])
        const salt = randomAsHex()

        const requestHash = computePendingRequestHash(
            captchas.map((c) => c.captcha.captchaId),
            userAccount,
            salt
        )

        const currentTime = Date.now()
        const timeLimit = captchas.map((captcha) => captcha.captcha.timeLimitMs || 30000).reduce((a, b) => a + b, 0)
        const deadline = timeLimit + currentTime
        await this.db.storeDappUserPending(userAccount, requestHash, salt, deadline)
        return { captchas, requestHash }
    }

    /**
     * Apply new captcha solutions to captcha dataset and recalculate merkle tree
     */
    async calculateCaptchaSolutions(): Promise<number> {
        try {
            // Get the current datasetId from the contract
            const providerDetails = await this.contractApi.getProviderDetails(this.contractApi.pair.address)

            // Get any unsolved CAPTCHA challenges from the database for this datasetId
            const unsolvedCaptchas = await this.db.getAllCaptchasByDatasetId(
                providerDetails.datasetId.toString(),
                CaptchaStates.Unsolved
            )

            // edge case when a captcha dataset contains no unsolved CAPTCHA challenges
            if (!unsolvedCaptchas) {
                return 0
            }

            // Sort the unsolved CAPTCHA challenges by their captchaId
            const unsolvedSorted = unsolvedCaptchas.sort(captchaSort)
            consola.info(`There are ${unsolvedSorted.length} unsolved CAPTCHA challenges`)

            // Get the solution configuration from the config file
            const requiredNumberOfSolutions = this.captchaSolutionConfig.requiredNumberOfSolutions
            const winningPercentage = this.captchaSolutionConfig.solutionWinningPercentage
            const winningNumberOfSolutions = Math.round(requiredNumberOfSolutions * (winningPercentage / 100))
            if (unsolvedSorted && unsolvedSorted.length > 0) {
                const captchaIds = unsolvedSorted.map((captcha) => captcha.captchaId)
                const solutions = (await this.db.getAllDappUserSolutions(captchaIds)) || []
                const solutionsToUpdate = calculateNewSolutions(solutions, winningNumberOfSolutions)
                if (solutionsToUpdate.rows().length > 0) {
                    consola.info(
                        `There are ${solutionsToUpdate.rows().length} CAPTCHA challenges to update with solutions`
                    )
                    try {
                        const captchaIdsToUpdate = [...solutionsToUpdate['captchaId'].values()]
                        const commitmentIds = solutions
                            .filter((s) => captchaIdsToUpdate.indexOf(s.captchaId) > -1)
                            .map((s) => s.commitmentId)
                        const dataset = await this.db.getDataset(providerDetails.datasetId.toString())
                        dataset.captchas = updateSolutions(solutionsToUpdate, dataset.captchas, this.logger)
                        // store new solutions in database
                        //console.log(JSON.stringify(dataset.captchas, null, 4))
                        await this.providerAddDataset(dataset)
                        // mark user solutions as used to calculate new solutions
                        await this.db.flagUsedDappUserSolutions(captchaIdsToUpdate)
                        // mark user commitments as used to calculate new solutions
                        await this.db.flagUsedDappUserCommitments(commitmentIds)
                        // remove old captcha challenges from database
                        await this.db.removeCaptchas(captchaIdsToUpdate)
                        return solutionsToUpdate.rows().length
                    } catch (error) {
                        consola.error(error)
                    }
                }
                return 0
            } else {
                consola.info(`There are no CAPTCHA challenges that require their solutions to be updated`)
                return 0
            }
        } catch (error) {
            throw new ProsopoEnvError(error, 'GENERAL.CALCULATE_CAPTCHA_SOLUTION')
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
                        items: item.items,
                    }
                    if (item.salt in solutionObj && 'solution' in solutionObj[item.salt]) {
                        captcha.solution = solutionObj[item.salt].solution
                    }
                    return captcha
                }),
            }

            await writeJSONFile(filePath, jsonData)
            return true
        } catch (error) {
            throw new ProsopoEnvError(error, 'GENERAL.GENERATE_CPATCHAS_JSON_FAILED', {}, filePath)
        }
    }

    /**
     * Block by block search for blockNo
     */
    async isRecentBlock(contract, header, blockNo: number, depth = this.captchaSolutionConfig.captchaBlockRecency) {
        if (depth == 0) {
            return false
        }

        const headerBlockNo: number = header.number.toPrimitive()
        if (headerBlockNo == blockNo) {
            return true
        }

        const parent = await contract.api.rpc.chain.getBlock(header.parentHash)

        return this.isRecentBlock(contract, (parent.toHuman() as any).block.header, blockNo, depth - 1)
    }

    /**
     * Validate that provided `datasetId` was a result of calling `get_random_provider` method
     * @param {string} userAccount - Same user that called `get_random_provider`
     * @param {string} dappContractAccount - account of dapp that is requesting captcha
     * @param {string} datasetId - `captcha_dataset_id` from the result of `get_random_provider`
     * @param {string} blockNo - Block on which `get_random_provider` was called
     */
    async validateProviderWasRandomlyChosen(
        userAccount: string,
        dappContractAccount: string,
        datasetId: string | Hash,
        blockNo: number
    ) {
        const contract = await this.contractApi.getContract()
        if (!contract) {
            throw new ProsopoEnvError('CONTRACT.CONTRACT_UNDEFINED', this.validateProviderWasRandomlyChosen.name)
        }

        const header = await contract.api.rpc.chain.getHeader()

        const isBlockNoValid = await this.isRecentBlock(contract, header, blockNo)

        if (!isBlockNoValid) {
            throw new ProsopoEnvError(
                'CAPTCHA.INVALID_BLOCK_NO',
                this.validateProviderWasRandomlyChosen.name,
                {},
                {
                    userAccount: userAccount,
                    dappContractAccount: dappContractAccount,
                    datasetId: datasetId,
                    header: header,
                    blockNo: blockNo,
                }
            )
        }

        const block = (await contract.api.rpc.chain.getBlockHash(blockNo)) as BlockHash
        const randomProviderAndBlockNo = await this.contractApi.getRandomProvider(
            userAccount,
            dappContractAccount,
            block
        )

        if (datasetId.toString().localeCompare(randomProviderAndBlockNo.provider.datasetId.toString())) {
            throw new ProsopoEnvError(
                'DATASET.INVALID_DATASET_ID',
                this.validateProviderWasRandomlyChosen.name,
                {},
                randomProviderAndBlockNo
            )
        }
    }

    /**
     * Get payment info for a transaction
     * @param {string} userAccount
     * @param {string} blockHash
     * @param {string} txHash
     * @returns {Promise<RuntimeDispatchInfo|null>}
     */
    private async getPaymentInfo(
        userAccount: string,
        blockHash: string,
        txHash: string
    ): Promise<RuntimeDispatchInfoV1 | null> {
        // Validate block and transaction, checking that the signer matches the userAccount
        const signedBlock: SignedBlock = (await this.contractApi.api.rpc.chain.getBlock(blockHash)) as SignedBlock
        if (!signedBlock) {
            return null
        }
        const extrinsic = signedBlock.block.extrinsics.find((extrinsic) => extrinsic.hash.toString() === txHash)
        if (!extrinsic || extrinsic.signer.toString() !== userAccount) {
            return null
        }
        // Retrieve tx fee for extrinsic
        const paymentInfo = (await this.contractApi.api.rpc.payment.queryInfo(
            extrinsic.toHex(),
            blockHash
        )) as RuntimeDispatchInfoV1
        if (!paymentInfo) {
            return null
        }
        return paymentInfo
    }

    /*
     * Get dapp user solution from database
     */
    async getDappUserCommitmentById(commitmentId: string): Promise<UserCommitmentRecord> {
        const dappUserSolution = await this.db.getDappUserCommitmentById(commitmentId)
        if (!dappUserSolution) {
            throw new ProsopoEnvError(
                'CAPTCHA.DAPP_USER_SOLUTION_NOT_FOUND',
                this.getDappUserCommitmentById.name,
                {},
                { commitmentId: commitmentId }
            )
        }
        return dappUserSolution
    }

    /* Check if dapp user has verified solution in cache */
    async getDappUserCommitmentByAccount(userAccount: string): Promise<UserCommitmentRecord | undefined> {
        const dappUserSolutions = await this.db.getDappUserCommitmentByAccount(userAccount)
        if (dappUserSolutions.length > 0) {
            for (const dappUserSolution of dappUserSolutions) {
                if (dappUserSolution.approved) {
                    return dappUserSolution
                }
            }
        }
        return undefined
    }
}

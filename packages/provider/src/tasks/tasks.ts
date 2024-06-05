// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import { BlockHash, Header, RuntimeDispatchInfoV1, SignedBlock } from '@polkadot/types/interfaces'
import {
    Captcha,
    CaptchaConfig,
    CaptchaSolution,
    CaptchaSolutionConfig,
    CaptchaWithProof,
    DEFAULT_IMAGE_CAPTCHA_TIMEOUT,
    DappUserSolutionResult,
    DatasetBase,
    DatasetRaw,
    DatasetWithIds,
    Hash,
    PendingCaptchaRequest,
    PoWCaptcha,
    ProsopoConfigOutput,
    ProviderDetails,
    ProviderRegistered,
    StoredEvents,
} from '@prosopo/types'
import {
    CaptchaMerkleTree,
    buildDataset,
    compareCaptchaSolutions,
    computeCaptchaSolutionHash,
    computePendingRequestHash,
    parseAndSortCaptchaSolutions,
    parseCaptchaDataset,
} from '@prosopo/datasets'
import { CaptchaStatus, Dapp, Provider, RandomProvider } from '@prosopo/captcha-contract/types-returns'
import { ContractPromise } from '@polkadot/api-contract/promise'
import { Database, UserCommitmentRecord } from '@prosopo/types-database'
import { Logger, ProsopoContractError, ProsopoEnvError, getLogger } from '@prosopo/common'
import { ProsopoCaptchaContract, getCurrentBlockNumber, verifyRecency, wrapQuery } from '@prosopo/contract'
import { ProviderEnvironment } from '@prosopo/types-env'
import { SubmittableResult } from '@polkadot/api/submittable'
import { at } from '@prosopo/util'
import { hexToU8a } from '@polkadot/util/hex'
import { randomAsHex } from '@polkadot/util-crypto/random'
import { saveCaptchaEvent, saveCaptchas } from '@prosopo/database'
import { sha256 } from '@noble/hashes/sha256'
import { shuffleArray } from '../util.js'
import { signatureVerify } from '@polkadot/util-crypto/signature'
import { stringToHex } from '@polkadot/util/string'
import { u8aToHex } from '@polkadot/util'

const POW_SEPARATOR = '___'

/**
 * @description Tasks that are shared by the API and CLI
 */
export class Tasks {
    contract: ProsopoCaptchaContract

    db: Database

    captchaConfig: CaptchaConfig

    captchaSolutionConfig: CaptchaSolutionConfig

    logger: Logger

    config: ProsopoConfigOutput

    constructor(env: ProviderEnvironment) {
        if (!env.contractInterface) {
            throw new ProsopoEnvError('CONTRACT.CONTRACT_UNDEFINED', {
                context: { failedFuncName: this.constructor.name, contractAddress: env.contractAddress },
            })
        }
        this.config = env.config
        this.contract = env.contractInterface
        this.db = env.db as Database
        this.captchaConfig = env.config.captchas
        this.captchaSolutionConfig = env.config.captchaSolutions
        this.logger = getLogger(env.config.logLevel, 'Tasks')
    }

    async providerSetDatasetFromFile(file: JSON): Promise<SubmittableResult | undefined> {
        const datasetRaw = parseCaptchaDataset(file)
        this.logger.debug('Parsed raw data set')
        return await this.providerSetDataset(datasetRaw)
    }

    async providerSetDataset(datasetRaw: DatasetRaw): Promise<SubmittableResult | undefined> {
        // check that the number of captchas contained within dataset.captchas is greater than or equal to the total
        // number of captchas that must be served
        if (datasetRaw.captchas.length < this.config.captchas.solved.count + this.config.captchas.unsolved.count) {
            throw new ProsopoEnvError('DATASET.CAPTCHAS_COUNT_LESS_THAN_CONFIGURED', {
                context: { failedFuncName: this.providerSetDataset.name },
            })
        }

        // check that the number of solutions contained within dataset.captchas is greater than or equal to the number
        // of solved captchas that must be served
        const solutions = datasetRaw.captchas
            .map((captcha): number => (captcha.solution ? 1 : 0))
            .reduce((partialSum, b) => partialSum + b, 0)
        if (solutions < this.config.captchas.solved.count) {
            throw new ProsopoEnvError('DATASET.SOLUTIONS_COUNT_LESS_THAN_CONFIGURED', {
                context: { failedFuncName: this.providerSetDataset.name },
            })
        }
        if (solutions < this.config.captchas.unsolved.count) {
            throw new ProsopoEnvError('DATASET.SOLUTIONS_COUNT_LESS_THAN_CONFIGURED', {
                context: { failedFuncName: this.providerSetDataset.name },
            })
        }

        const dataset = await buildDataset(datasetRaw)
        if (!dataset.datasetId || !dataset.datasetContentId) {
            throw new ProsopoEnvError('DATASET.DATASET_ID_UNDEFINED', {
                context: { failedFuncName: this.providerSetDataset.name },
            })
        }

        await this.db?.storeDataset(dataset)
        // catch any errors before running the tx
        await wrapQuery(this.contract.query.providerSetDataset, this.contract.query)(
            dataset.datasetId,
            dataset.datasetContentId
        )
        const txResult = await this.contract.methods.providerSetDataset(dataset.datasetId, dataset.datasetContentId, {
            value: 0,
        })
        return txResult.result
    }

    // Other tasks

    /**
     * @description Get random captchas that are solved or not solved, along with the merkle proof for each
     * @param {string}   datasetId  the id of the data set
     * @param {boolean}  solved    `true` when captcha is solved
     * @param {number}   size       the number of records to be returned
     */
    async getCaptchaWithProof(datasetId: Hash, solved: boolean, size: number): Promise<CaptchaWithProof[]> {
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
        throw new ProsopoEnvError('DATABASE.CAPTCHA_GET_FAILED', {
            context: { failedFuncName: this.getCaptchaWithProof.name, datasetId, solved, size },
        })
    }

    /**
     * @description Generates a PoW Captcha for a given user and dapp
     *
     * @param {string} userAccount - user that is solving the captcha
     * @param {string} dappAccount - dapp that is requesting the captcha
     */
    async getPowCaptchaChallenge(userAccount: string, dappAccount: string, origin: string): Promise<PoWCaptcha> {
        // TODO: Verify that the origin matches the url of the dapp
        const difficulty = 4
        const latestHeader = await this.contract.api.rpc.chain.getHeader()
        const latestBlockNumber = latestHeader.number.toNumber()

        // Use blockhash, userAccount and dappAccount for string for challenge
        const challenge = `${latestBlockNumber}___${userAccount}___${dappAccount}`
        const signature = u8aToHex(this.contract.pair.sign(stringToHex(challenge)))

        return { challenge, difficulty, signature }
    }

    /**
     * @description Verifies a PoW Captcha for a given user and dapp
     *
     * @param {string} blockNumber - the block at which the Provider was selected
     * @param {string} challenge - the starting string for the PoW challenge
     * @param {string} difficulty - how many leading zeroes the solution must have
     * @param {string} signature - proof that the Provider provided the challenge
     * @param {string} nonce - the string that the user has found that satisfies the PoW challenge
     * @param {number} timeout - the time in milliseconds since the Provider was selected to provide the PoW captcha
     */
    async verifyPowCaptchaSolution(
        blockNumber: number,
        challenge: string,
        difficulty: number,
        signature: string,
        nonce: number,
        timeout: number
    ): Promise<boolean> {
        const recent = verifyRecency(this.contract.api, blockNumber, timeout)
        if (!recent) {
            throw new ProsopoContractError('CONTRACT.INVALID_BLOCKHASH', {
                context: {
                    ERROR: `Block in which the Provider was selected must be within the last ${timeout / 1000} seconds`,
                    failedFuncName: this.verifyPowCaptchaSolution.name,
                    blockNumber,
                },
            })
        }

        const signatureVerification = signatureVerify(stringToHex(challenge), signature, this.contract.pair.address)

        if (!signatureVerification.isValid) {
            throw new ProsopoContractError('GENERAL.INVALID_SIGNATURE', {
                context: {
                    ERROR: 'Provider signature is invalid for this message',
                    failedFuncName: this.verifyPowCaptchaSolution.name,
                    signature,
                },
            })
        }

        const solutionValid = Array.from(sha256(new TextEncoder().encode(nonce + challenge)))
            .map((byte) => byte.toString(16).padStart(2, '0'))
            .join('')
            .startsWith('0'.repeat(difficulty))

        if (!solutionValid) {
            throw new ProsopoContractError('API.CAPTCHA_FAILED', {
                context: {
                    ERROR: 'Captcha solution is invalid',
                    failedFuncName: this.verifyPowCaptchaSolution.name,
                    nonce,
                    challenge,
                    difficulty,
                },
            })
        }

        await this.db.storePowCaptchaRecord(challenge, false)

        return true
    }

    async serverVerifyPowCaptchaSolution(dappAccount: string, challenge: string, timeout: number): Promise<boolean> {
        const challengeRecord = await this.db.getPowCaptchaRecordByChallenge(challenge)
        if (!challengeRecord) {
            throw new ProsopoEnvError('DATABASE.CAPTCHA_GET_FAILED', {
                context: { failedFuncName: this.serverVerifyPowCaptchaSolution.name, challenge },
            })
        }

        if (challengeRecord.checked) {
            return false
        }

        const [blocknumber, userAccount, challengeDappAccount] = challengeRecord.challenge.split(POW_SEPARATOR)

        if (dappAccount !== challengeDappAccount) {
            throw new ProsopoEnvError('CAPTCHA.DAPP_USER_SOLUTION_NOT_FOUND', {
                context: {
                    failedFuncName: this.serverVerifyPowCaptchaSolution.name,
                    dappAccount,
                    challengeDappAccount,
                },
            })
        }

        if (!blocknumber) {
            throw new ProsopoContractError('CONTRACT.INVALID_BLOCKHASH', {
                context: {
                    ERROR: 'Block number not provided',
                    failedFuncName: this.verifyPowCaptchaSolution.name,
                    blocknumber,
                },
            })
        }
        const recent = verifyRecency(this.contract.api, parseInt(blocknumber), timeout)
        if (!recent) {
            throw new ProsopoContractError('CONTRACT.INVALID_BLOCKHASH', {
                context: {
                    ERROR: `Block in which the Provider was selected must be within the last ${timeout / 1000} seconds`,
                    failedFuncName: this.verifyPowCaptchaSolution.name,
                    blocknumber,
                },
            })
        }

        await this.db.updatePowCaptchaRecord(challengeRecord.challenge, true)
        return true
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
    async dappUserSolution(
        userAccount: string,
        dappAccount: string,
        requestHash: string,
        captchas: CaptchaSolution[],
        signature: string // the signature to indicate ownership of account
    ): Promise<DappUserSolutionResult> {
        if (!(await this.dappIsActive(dappAccount))) {
            throw new ProsopoEnvError('CONTRACT.DAPP_NOT_ACTIVE', {
                context: { failedFuncName: this.getPaymentInfo.name, dappAccount },
            })
        }

        // check that the signature is valid (i.e. the user has signed the request hash with their private key, proving they own their account)
        const verification = signatureVerify(stringToHex(requestHash), signature, userAccount)
        if (!verification.isValid) {
            // the signature is not valid, so the user is not the owner of the account. May have given a false account address with good reputation in an attempt to impersonate
            throw new ProsopoEnvError('GENERAL.INVALID_SIGNATURE', {
                context: { failedFuncName: this.dappUserSolution.name, userAccount },
            })
        }

        let response: DappUserSolutionResult = {
            captchas: [],
            verified: false,
        }
        const { storedCaptchas, receivedCaptchas, captchaIds } =
            await this.validateReceivedCaptchasAgainstStoredCaptchas(captchas)
        const { tree, commitmentId } = await this.buildTreeAndGetCommitmentId(receivedCaptchas)
        const provider = (await this.contract.methods.getProvider(this.contract.pair.address, {})).value
            .unwrap()
            .unwrap()
        const pendingRecord = await this.db.getDappUserPending(requestHash)
        const pendingRequest = await this.validateDappUserSolutionRequestIsPending(
            requestHash,
            pendingRecord,
            userAccount,
            captchaIds
        )
        // Only do stuff if the request is in the local DB
        const userSignature = hexToU8a(signature)
        const blockNumber = await getCurrentBlockNumber(this.contract.api)
        if (pendingRequest) {
            // prevent this request hash from being used twice
            await this.db.updateDappUserPendingStatus(requestHash)
            const commit: UserCommitmentRecord = {
                id: commitmentId,
                userAccount: userAccount,
                dappContract: dappAccount,
                providerAccount: this.contract.pair.address,
                datasetId: provider.datasetId.toString(),
                status: CaptchaStatus.pending,
                userSignature: Array.from(userSignature),
                requestedAt: pendingRecord.requestedAtBlock, // TODO is this correct or should it be block number?
                completedAt: blockNumber,
                processed: false,
                batched: false,
            }
            await this.db.storeDappUserSolution(receivedCaptchas, commit)
            if (compareCaptchaSolutions(receivedCaptchas, storedCaptchas)) {
                response = {
                    captchas: captchaIds.map((id) => ({
                        captchaId: id,
                        proof: tree.proof(id),
                    })),
                    verified: true,
                }
                await this.db.approveDappUserCommitment(commitmentId)
            } else {
                response = {
                    captchas: captchaIds.map((id) => ({
                        captchaId: id,
                        proof: [[]],
                    })),
                    verified: false,
                }
            }
        }

        return response
    }

    /**
     * Validate that the dapp is active in the contract
     */
    async dappIsActive(dappAccount: string): Promise<boolean> {
        const dapp: Dapp = await wrapQuery(this.contract.query.getDapp, this.contract.query)(dappAccount)
        //dapp.status.isActive doesn't work: https://substrate.stackexchange.com/questions/6333/how-do-we-work-with-polkadot-js-enums-in-typescript
        return dapp.status.toString() === 'Active'
    }

    /**
     * Gets provider status in contract
     */
    async providerStatus(): Promise<ProviderRegistered> {
        try {
            const provider: Provider = await wrapQuery(
                this.contract.query.getProvider,
                this.contract.query
            )(this.contract.pair.address)
            return { status: provider.status ? 'Registered' : 'Unregistered' }
        } catch (e) {
            return { status: 'Unregistered' }
        }
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
            throw new ProsopoEnvError('CAPTCHA.INVALID_CAPTCHA_ID', {
                context: {
                    failedFuncName: this.validateReceivedCaptchasAgainstStoredCaptchas.name,

                    captchas,
                },
            })
        }
        if (!storedCaptchas.every((captcha) => captcha.datasetId === at(storedCaptchas, 0).datasetId)) {
            throw new ProsopoEnvError('CAPTCHA.DIFFERENT_DATASET_IDS', {
                context: {
                    failedFuncName: this.validateReceivedCaptchasAgainstStoredCaptchas.name,
                    captchas,
                },
            })
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
            throw new ProsopoEnvError('CONTRACT.CAPTCHA_SOLUTION_COMMITMENT_DOES_NOT_EXIST', {
                context: {
                    failedFuncName: this.buildTreeAndGetCommitmentId.name,
                    commitmentId: commitmentId,
                },
            })
        }

        return { tree, commitmentId }
    }

    /**
     * Validate that a Dapp User is responding to their own pending captcha request
     * @param {string} requestHash
     * @param {PendingCaptchaRequest} pendingRecord
     * @param {string} userAccount
     * @param {string[]} captchaIds
     */
    async validateDappUserSolutionRequestIsPending(
        requestHash: string,
        pendingRecord: PendingCaptchaRequest,
        userAccount: string,
        captchaIds: string[]
    ): Promise<boolean> {
        const currentTime = Date.now()
        if (pendingRecord.deadlineTimestamp < currentTime) {
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
        const timeLimit = captchas
            // if 2 captchas with 30s time limit, this will add to 1 minute (30s * 2)
            .map((captcha) => captcha.captcha.timeLimitMs || DEFAULT_IMAGE_CAPTCHA_TIMEOUT)
            .reduce((a, b) => a + b, 0)
        const deadlineTs = timeLimit + currentTime
        const currentBlockNumber = await getCurrentBlockNumber(this.contract.api)
        await this.db.storeDappUserPending(userAccount, requestHash, salt, deadlineTs, currentBlockNumber)
        return { captchas, requestHash }
    }

    /**
     * Block by block search for blockNo
     */
    async isRecentBlock(
        contract: ContractPromise,
        header: Header,
        blockNo: number,
        depth = this.captchaSolutionConfig.captchaBlockRecency
    ): Promise<boolean> {
        if (depth == 0) {
            return false
        }

        const headerBlockNo = header.number.toPrimitive()
        if (headerBlockNo === blockNo) {
            return true
        }

        const parent = await contract.api.rpc.chain.getBlock(header.parentHash)

        return this.isRecentBlock(contract, parent.block.header, blockNo, depth - 1)
    }

    /**
     * Validate that provided `datasetId` was a result of calling `get_random_provider` method
     * @param {string} userAccount - Same user that called `get_random_provider`
     * @param {string} dappContractAccount - account of dapp that is requesting captcha
     * @param {string} datasetId - `captcha_dataset_id` from the result of `get_random_provider`
     * @param {string} blockNumber - Block on which `get_random_provider` was called
     */
    async validateProviderWasRandomlyChosen(
        userAccount: string,
        dappContractAccount: string,
        datasetId: string | Hash,
        blockNumber: number
    ) {
        const contract = await this.contract.contract
        if (!contract) {
            throw new ProsopoEnvError('CONTRACT.CONTRACT_UNDEFINED', {
                context: { failedFuncName: this.validateProviderWasRandomlyChosen.name },
            })
        }

        const header = await contract.api.rpc.chain.getHeader()

        const isBlockNoValid = await this.isRecentBlock(contract, header, blockNumber)

        if (!isBlockNoValid) {
            throw new ProsopoEnvError('CAPTCHA.INVALID_BLOCK_NO', {
                context: {
                    failedFuncName: this.validateProviderWasRandomlyChosen.name,
                    userAccount,
                    dappContractAccount,
                    datasetId,
                    header,
                    blockNumber,
                },
            })
        }

        const block = (await contract.api.rpc.chain.getBlockHash(blockNumber)) as BlockHash
        const randomProviderAndBlockNo = await this.contract.queryAtBlock<RandomProvider>(
            block,
            'getRandomActiveProvider',
            [userAccount, dappContractAccount]
        )

        if (datasetId.toString().localeCompare(randomProviderAndBlockNo.provider.datasetId.toString())) {
            throw new ProsopoEnvError('DATASET.INVALID_DATASET_ID', {
                context: {
                    failedFuncName: this.validateProviderWasRandomlyChosen.name,
                    randomProviderAndBlockNo,
                },
            })
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
        const signedBlock: SignedBlock = (await this.contract.api.rpc.chain.getBlock(blockHash)) as SignedBlock
        if (!signedBlock) {
            return null
        }
        const extrinsic = signedBlock.block.extrinsics.find((extrinsic) => extrinsic.hash.toString() === txHash)
        if (!extrinsic || extrinsic.signer.toString() !== userAccount) {
            return null
        }
        // Retrieve tx fee for extrinsic
        const paymentInfo = (await this.contract.api.rpc.payment.queryInfo(
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
            throw new ProsopoEnvError('CAPTCHA.DAPP_USER_SOLUTION_NOT_FOUND', {
                context: {
                    failedFuncName: this.getDappUserCommitmentById.name,
                    commitmentId: commitmentId,
                },
            })
        }
        return dappUserSolution
    }

    /* Check if dapp user has verified solution in cache */
    async getDappUserCommitmentByAccount(userAccount: string): Promise<UserCommitmentRecord | undefined> {
        const dappUserSolutions = await this.db.getDappUserCommitmentByAccount(userAccount)
        if (dappUserSolutions.length > 0) {
            for (const dappUserSolution of dappUserSolutions) {
                if (dappUserSolution.status === CaptchaStatus.approved) {
                    return dappUserSolution
                }
            }
        }
        return undefined
    }

    /* Returns public details of provider */
    async getProviderDetails(): Promise<ProviderDetails> {
        const provider: Provider = await wrapQuery(
            this.contract.query.getProvider,
            this.contract.query
        )(this.contract.pair.address)

        const dbConnectionOk = await this.getCaptchaWithProof(provider.datasetId, true, 1)
            .then(() => true)
            .catch(() => false)

        return { provider, dbConnectionOk }
    }

    /** Get the dataset from the database */
    async getProviderDataset(datasetId: string): Promise<DatasetWithIds> {
        return await this.db.getDataset(datasetId)
    }

    async saveCaptchaEvent(events: StoredEvents, accountId: string) {
        if (!this.config.devOnlyWatchEvents || !this.config.mongoEventsUri) {
            this.logger.info('Dev watch events not set to true, not saving events')
            return
        }
        await saveCaptchaEvent(events, accountId, this.config.mongoEventsUri)
    }

    async storeCommitmentsExternal(): Promise<void> {
        if (!this.config.mongoCaptchaUri) {
            this.logger.info('Mongo env not set')
            return
        }
        //Get all unstored commitments
        const commitments = await this.db.getUnstoredDappUserCommitments()

        await saveCaptchas(commitments, this.config.mongoCaptchaUri)

        const commitIds = commitments.map((commitment) => commitment.id)

        await this.db.markDappUserCommitmentsStored(commitIds)
    }
}

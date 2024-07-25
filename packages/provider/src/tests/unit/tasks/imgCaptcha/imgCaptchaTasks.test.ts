import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Captcha, CaptchaSolution, CaptchaStatus, PendingCaptchaRequest } from '@prosopo/types'
import { Database, UserCommitmentRecord } from '@prosopo/types-database'
import { Logger, ProsopoEnvError } from '@prosopo/common'
import { randomAsHex, signatureVerify } from '@polkadot/util-crypto'
import { KeyringPair } from '@polkadot/keyring/types'
import { computePendingRequestHash, compareCaptchaSolutions, parseAndSortCaptchaSolutions } from '@prosopo/datasets'
import { u8aToHex, stringToHex, hexToU8a } from '@polkadot/util'
import { ImgCaptchaManager } from '../../../../tasks/imgCaptcha/imgCaptchaTasks.js'
import { shuffleArray } from '../../../../util.js'
import { buildTreeAndGetCommitmentId } from '../../../../tasks/imgCaptcha/imgCaptchaTasksUtils.js'

// Mock dependencies
vi.mock('@prosopo/datasets', () => ({
    computePendingRequestHash: vi.fn(),
    compareCaptchaSolutions: vi.fn(),
    parseAndSortCaptchaSolutions: vi.fn(),
}))
vi.mock('@polkadot/util-crypto', () => ({
    randomAsHex: vi.fn(),
    signatureVerify: vi.fn(),
}))
vi.mock('@polkadot/util', () => ({
    u8aToHex: vi.fn(),
    stringToHex: vi.fn(),
}))
vi.mock('../../../../util.js', () => ({
    shuffleArray: vi.fn(),
}))
vi.mock('./imgCaptchaTasksUtils', () => ({
    buildTreeAndGetCommitmentId: vi.fn(),
}))

describe('ImgCaptchaManager', () => {
    let db: Database
    let pair: KeyringPair
    let logger: Logger
    let captchaConfig: any
    let imgCaptchaManager: ImgCaptchaManager

    beforeEach(() => {
        db = {
            getRandomCaptcha: vi.fn(),
            getDatasetDetails: vi.fn(),
            storeDappUserPending: vi.fn(),
            getDappUserPending: vi.fn(),
            updateDappUserPendingStatus: vi.fn(),
            storeDappUserSolution: vi.fn(),
            approveDappUserCommitment: vi.fn(),
            getCaptchaById: vi.fn(),
            getDappUserCommitmentById: vi.fn(),
            getDappUserCommitmentByAccount: vi.fn(),
        } as unknown as Database

        pair = {
            sign: vi.fn(),
            address: 'testAddress',
        } as unknown as KeyringPair

        logger = {
            info: vi.fn(),
            error: vi.fn(),
        } as unknown as Logger

        captchaConfig = {
            solved: { count: 5 },
            unsolved: { count: 5 },
        }

        imgCaptchaManager = new ImgCaptchaManager(db, pair, logger, captchaConfig)

        vi.clearAllMocks()
    })

    describe('getCaptchaWithProof', () => {
        it('should get captcha with proof', async () => {
            const datasetId = 'datasetId'
            const size = 3
            const solved = true
            const captchaDocs = [
                {
                    captchaId: 'captcha1',
                    solution: 'solution1',
                    question: 'question1',
                    options: ['option1'],
                    datasetId,
                },
            ] as unknown as Captcha[]

            ;(db.getRandomCaptcha as any).mockResolvedValue(captchaDocs)

            const result = await imgCaptchaManager.getCaptchaWithProof(datasetId, solved, size)

            expect(result).toEqual(captchaDocs)
            expect(db.getRandomCaptcha).toHaveBeenCalledWith(solved, datasetId, size)
        })

        it('should throw an error if get captcha with proof fails', async () => {
            const datasetId = 'datasetId'
            const size = 3
            const solved = true

            ;(db.getRandomCaptcha as any).mockResolvedValue(null)

            await expect(imgCaptchaManager.getCaptchaWithProof(datasetId, solved, size)).rejects.toThrow(
                new ProsopoEnvError('DATABASE.CAPTCHA_GET_FAILED', {
                    context: { failedFuncName: 'getCaptchaWithProof', datasetId, solved, size },
                })
            )
        })
    })

    describe('getRandomCaptchasAndRequestHash', () => {
        it('should get random captchas and request hash', async () => {
            const datasetId = 'datasetId'
            const userAccount = 'userAccount'
            const dataset = { datasetId, captchas: [] }

            ;(db.getDatasetDetails as any).mockResolvedValue(dataset)
            ;(db.getRandomCaptcha as any).mockResolvedValue([])
            ;(randomAsHex as any).mockReturnValue('randomSalt')
            ;(computePendingRequestHash as any).mockReturnValue('computedHash')
            ;(pair.sign as any).mockReturnValue('signedTime')
            ;(u8aToHex as any).mockReturnValue('hexSignedTime')
            ;(shuffleArray as any).mockReturnValue([])

            const result = await imgCaptchaManager.getRandomCaptchasAndRequestHash(datasetId, userAccount)

            expect(result).toEqual({
                captchas: [],
                requestHash: 'computedHash',
                timestamp: expect.any(String),
                signedTime: 'hexSignedTime',
            })
        })

        it('should throw an error if dataset details are not found', async () => {
            const datasetId = 'datasetId'
            const userAccount = 'userAccount'

            ;(db.getDatasetDetails as any).mockResolvedValue(null)

            await expect(imgCaptchaManager.getRandomCaptchasAndRequestHash(datasetId, userAccount)).rejects.toThrow(
                new ProsopoEnvError('DATABASE.DATASET_GET_FAILED', {
                    context: { failedFuncName: 'getRandomCaptchasAndRequestHash', dataset: null, datasetId },
                })
            )
        })
    })

    it('should process dapp user solution successfully', async () => {
        const userAccount = 'userAccount'
        const dappAccount = 'dappAccount'
        const requestHash = 'requestHash'
        const captchas = [
            { captchaId: 'captcha1', solution: 'solution1', salt: 'salt1' },
        ] as unknown as CaptchaSolution[]
        const signature = 'signature'
        const timestamp = 'timestamp'
        const signedTimestamp = 'signedTimestamp'

        ;(signatureVerify as any).mockReturnValueOnce({ isValid: true })
        ;(signatureVerify as any).mockReturnValueOnce({ isValid: true })
        ;(db.getCaptchaById as any).mockResolvedValue([])
        ;(parseAndSortCaptchaSolutions as any).mockReturnValue(captchas)
        ;(buildTreeAndGetCommitmentId as any).mockReturnValue({
            tree: { proof: vi.fn().mockReturnValue([]) },
            commitmentId: 'commitmentId',
        })
        ;(db.getDappUserPending as any).mockResolvedValue({ deadlineTimestamp: Date.now() + 10000, salt: 'salt' })
        ;(computePendingRequestHash as any).mockReturnValue('requestHash')
        ;(db.storeDappUserSolution as any).mockResolvedValue({})
        ;(compareCaptchaSolutions as any).mockReturnValue(true)

        const result = await imgCaptchaManager.dappUserSolution(
            userAccount,
            dappAccount,
            requestHash,
            captchas,
            signature,
            timestamp,
            signedTimestamp
        )

        expect(result.verified).toBe(true)
        expect(db.storeDappUserSolution).toHaveBeenCalled()
        expect(db.approveDappUserCommitment).toHaveBeenCalledWith('commitmentId')
    })

    it('should throw an error if signature is invalid', async () => {
        const userAccount = 'userAccount'
        const dappAccount = 'dappAccount'
        const requestHash = 'requestHash'
        const captchas = [
            { captchaId: 'captcha1', solution: 'solution1', salt: 'salt1', datasetId: 'datasetId' },
        ] as unknown as CaptchaSolution[]
        const signature = 'signature'
        const timestamp = 'timestamp'
        const signedTimestamp = 'signedTimestamp'

        ;(signatureVerify as any).mockReturnValue({ isValid: false })

        await expect(
            imgCaptchaManager.dappUserSolution(
                userAccount,
                dappAccount,
                requestHash,
                captchas,
                signature,
                timestamp,
                signedTimestamp
            )
        ).rejects.toThrow(
            new ProsopoEnvError('GENERAL.INVALID_SIGNATURE', {
                context: { failedFuncName: 'dappUserSolution', userAccount },
            })
        )
    })

    it('should validate received captchas against stored captchas', async () => {
        const captchas = [
            { captchaId: 'captcha1', solution: 'solution1', salt: 'salt1' },
        ] as unknown as CaptchaSolution[]
        const storedCaptchas = [
            {
                captchaId: 'captcha1',
                solution: 'solution1',
                question: 'question1',
                options: ['option1'],
                datasetId: 'dataset1',
            },
        ] as unknown as Captcha[]

        ;(parseAndSortCaptchaSolutions as any).mockReturnValue(captchas)
        ;(db.getCaptchaById as any).mockResolvedValue(storedCaptchas)

        const result = await imgCaptchaManager.validateReceivedCaptchasAgainstStoredCaptchas(captchas)

        expect(result).toEqual({ storedCaptchas, receivedCaptchas: captchas, captchaIds: ['captcha1'] })
    })

    it('should throw an error if received captchas length does not match stored captchas', async () => {
        const captchas = [
            { captchaId: 'captcha1', solution: 'solution1', salt: 'salt1' },
        ] as unknown as CaptchaSolution[]

        ;(parseAndSortCaptchaSolutions as any).mockReturnValue(captchas)
        ;(db.getCaptchaById as any).mockResolvedValue([])

        await expect(imgCaptchaManager.validateReceivedCaptchasAgainstStoredCaptchas(captchas)).rejects.toThrow(
            new ProsopoEnvError('CAPTCHA.INVALID_CAPTCHA_ID', {
                context: {
                    failedFuncName: 'validateReceivedCaptchasAgainstStoredCaptchas',
                    captchas,
                },
            })
        )
    })

    it('should validate dapp user solution request is pending', async () => {
        const requestHash = 'requestHash'
        const pendingRecord = {
            requestHash: 'requestHash',
            userAccount: 'userAccount',
            datasetId: 'datasetId',
            salt: 'salt',
            deadlineTimestamp: Date.now() + 10000,
            currentBlockNumber: 0,
        } as unknown as PendingCaptchaRequest
        const userAccount = 'userAccount'
        const captchaIds = ['captcha1']

        ;(computePendingRequestHash as any).mockReturnValue('requestHash')

        const result = await imgCaptchaManager.validateDappUserSolutionRequestIsPending(
            requestHash,
            pendingRecord,
            userAccount,
            captchaIds
        )

        expect(result).toBe(true)
    })

    it('should return false if deadline has expired', async () => {
        const requestHash = 'requestHash'
        const pendingRecord = {
            requestHash: 'requestHash',
            userAccount: 'userAccount',
            datasetId: 'datasetId',
            salt: 'salt',
            deadlineTimestamp: Date.now() - 10000,
            currentBlockNumber: 0,
        } as unknown as PendingCaptchaRequest
        const userAccount = 'userAccount'
        const captchaIds = ['captcha1']

        const result = await imgCaptchaManager.validateDappUserSolutionRequestIsPending(
            requestHash,
            pendingRecord,
            userAccount,
            captchaIds
        )

        expect(result).toBe(false)
        expect(logger.info).toHaveBeenCalledWith('Deadline for responding to captcha has expired')
    })

    it('should get dapp user commitment by ID', async () => {
        const commitmentId = 'commitmentId'
        const dappUserCommitment: UserCommitmentRecord = {
            id: 'commitmentId',
            userAccount: 'userAccount',
            dappContract: 'dappContract',
            providerAccount: 'providerAccount',
            datasetId: 'datasetId',
            status: CaptchaStatus.approved,
            userSignature: [],
            requestedAt: 0,
            completedAt: 0,
            processed: false,
            batched: false,
            stored: false,
            requestedAtTimestamp: 0,
        }

        ;(db.getDappUserCommitmentById as any).mockResolvedValue(dappUserCommitment)

        const result = await imgCaptchaManager.getDappUserCommitmentById(commitmentId)

        expect(result).toEqual(dappUserCommitment)
    })

    it('should throw an error if dapp user commitment is not found by ID', async () => {
        const commitmentId = 'commitmentId'

        ;(db.getDappUserCommitmentById as any).mockResolvedValue(null)

        await expect(imgCaptchaManager.getDappUserCommitmentById(commitmentId)).rejects.toThrow(
            new ProsopoEnvError('CAPTCHA.DAPP_USER_SOLUTION_NOT_FOUND', {
                context: {
                    failedFuncName: 'getDappUserCommitmentById',
                    commitmentId: commitmentId,
                },
            })
        )
    })

    it('should get dapp user commitment by account', async () => {
        const userAccount = 'userAccount'
        const dappUserCommitments: UserCommitmentRecord[] = [
            {
                id: 'commitmentId',
                userAccount: 'userAccount',
                dappContract: 'dappContract',
                providerAccount: 'providerAccount',
                datasetId: 'datasetId',
                status: CaptchaStatus.approved,
                userSignature: [],
                requestedAt: 0,
                completedAt: 0,
                processed: false,
                batched: false,
                stored: false,
                requestedAtTimestamp: 0,
            },
        ]

        ;(db.getDappUserCommitmentByAccount as any).mockResolvedValue(dappUserCommitments)

        const result = await imgCaptchaManager.getDappUserCommitmentByAccount(userAccount)

        expect(result).toEqual(dappUserCommitments[0])
    })

    it('should return undefined if no approved dapp user commitment is found by account', async () => {
        const userAccount = 'userAccount'
        const dappUserCommitments: UserCommitmentRecord[] = []

        ;(db.getDappUserCommitmentByAccount as any).mockResolvedValue(dappUserCommitments)

        const result = await imgCaptchaManager.getDappUserCommitmentByAccount(userAccount)

        expect(result).toBeUndefined()
    })
})

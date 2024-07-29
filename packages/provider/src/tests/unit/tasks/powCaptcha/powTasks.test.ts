import { describe, it, expect, vi, beforeEach } from 'vitest'
import { u8aToHex, stringToHex } from '@polkadot/util'
import { KeyringPair } from '@polkadot/keyring/types'
import { ProsopoEnvError } from '@prosopo/common'
import { Database } from '@prosopo/types-database'
import { PowCaptchaManager } from '../../../../tasks/powCaptcha/powTasks.js'
import {
    checkRecentPowSolution,
    checkPowSignature,
    checkPowSolution,
} from '../../../../tasks/powCaptcha/powTasksUtils.js'

vi.mock('@polkadot/util-crypto', () => ({
    signatureVerify: vi.fn(),
}))

vi.mock('@polkadot/util', () => ({
    u8aToHex: vi.fn(),
    stringToHex: vi.fn(),
}))

vi.mock('../../../../tasks/powCaptcha/powTasksUtils.js', () => ({
    checkRecentPowSolution: vi.fn(),
    checkPowSignature: vi.fn(),
    checkPowSolution: vi.fn(),
}))

describe('PowCaptchaManager', () => {
    let db: Database
    let pair: KeyringPair
    let powCaptchaManager: PowCaptchaManager

    beforeEach(() => {
        db = {
            storePowCaptchaRecord: vi.fn(),
            getPowCaptchaRecordByChallenge: vi.fn(),
            updatePowCaptchaRecord: vi.fn(),
        } as unknown as Database

        pair = {
            sign: vi.fn(),
            address: 'testAddress',
        } as unknown as KeyringPair

        powCaptchaManager = new PowCaptchaManager(pair, db)

        vi.clearAllMocks()
    })

    describe('getPowCaptchaChallenge', () => {
        it('should generate a PoW captcha challenge', async () => {
            const userAccount = 'userAccount'
            const dappAccount = 'dappAccount'
            const origin = 'origin'
            const timestamp = Date.now().toString()
            const challenge = `${timestamp}___${userAccount}___${dappAccount}`

            ;(pair.sign as any).mockReturnValueOnce('signedChallenge')
            ;(u8aToHex as any).mockReturnValueOnce('hexSignedChallenge')

            const result = await powCaptchaManager.getPowCaptchaChallenge(userAccount, dappAccount, origin)

            expect(result).toEqual({
                challenge,
                difficulty: 4,
                signature: 'hexSignedChallenge',
            })
            expect(pair.sign).toHaveBeenCalledWith(stringToHex(challenge))
        })
    })

    describe('verifyPowCaptchaSolution', () => {
        it('should verify a valid PoW captcha solution', async () => {
            const challenge = 'testChallenge'
            const difficulty = 4
            const signature = 'testSignature'
            const nonce = 12345
            const timeout = 1000

            ;(checkRecentPowSolution as any).mockImplementation(() => true)
            ;(checkPowSignature as any).mockImplementation(() => true)
            ;(checkPowSolution as any).mockImplementation(() => true)

            const result = await powCaptchaManager.verifyPowCaptchaSolution(
                challenge,
                difficulty,
                signature,
                nonce,
                timeout
            )

            expect(result).toBe(true)
            expect(checkRecentPowSolution).toHaveBeenCalledWith(challenge, timeout)
            expect(checkPowSignature).toHaveBeenCalledWith(challenge, signature, pair.address)
            expect(checkPowSolution).toHaveBeenCalledWith(nonce, challenge, difficulty)
            expect(db.storePowCaptchaRecord).toHaveBeenCalledWith(challenge, false)
        })

        it('should throw an error if PoW captcha solution is invalid', async () => {
            const challenge = 'testChallenge'
            const difficulty = 4
            const signature = 'testSignature'
            const nonce = 12345
            const timeout = 1000

            ;(checkRecentPowSolution as any).mockImplementation(() => {
                throw new ProsopoEnvError('CAPTCHA.INVALID_CAPTCHA_CHALLENGE', {
                    context: {
                        failedFuncName: 'verifyPowCaptchaSolution',
                    },
                })
            })

            await expect(
                powCaptchaManager.verifyPowCaptchaSolution(challenge, difficulty, signature, nonce, timeout)
            ).rejects.toThrow(
                new ProsopoEnvError('CAPTCHA.INVALID_CAPTCHA_CHALLENGE', {
                    context: {
                        failedFuncName: 'verifyPowCaptchaSolution',
                    },
                })
            )

            expect(checkRecentPowSolution).toHaveBeenCalledWith(challenge, timeout)
        })
    })

    describe('serverVerifyPowCaptchaSolution', () => {
        it('should verify a valid PoW captcha solution on the server', async () => {
            const dappAccount = 'dappAccount'
            const challenge = 'timestamp___userAccount___dappAccount'
            const timeout = 1000
            const challengeRecord = {
                challenge,
                checked: false,
            }

            ;(db.getPowCaptchaRecordByChallenge as any).mockResolvedValue(challengeRecord)
            ;(checkRecentPowSolution as any).mockImplementation(() => true)

            const result = await powCaptchaManager.serverVerifyPowCaptchaSolution(dappAccount, challenge, timeout)

            expect(result).toBe(true)
            expect(db.getPowCaptchaRecordByChallenge).toHaveBeenCalledWith(challenge)
            expect(checkRecentPowSolution).toHaveBeenCalledWith(challenge, timeout)
            expect(db.updatePowCaptchaRecord).toHaveBeenCalledWith(challenge, true)
        })

        it('should throw an error if challenge record is not found', async () => {
            const dappAccount = 'dappAccount'
            const challenge = 'timestamp___userAccount___dappAccount'
            const timeout = 1000

            ;(db.getPowCaptchaRecordByChallenge as any).mockResolvedValue(null)

            await expect(
                powCaptchaManager.serverVerifyPowCaptchaSolution(dappAccount, challenge, timeout)
            ).rejects.toThrow(
                new ProsopoEnvError('DATABASE.CAPTCHA_GET_FAILED', {
                    context: { failedFuncName: 'serverVerifyPowCaptchaSolution', challenge },
                })
            )

            expect(db.getPowCaptchaRecordByChallenge).toHaveBeenCalledWith(challenge)
        })
    })
})

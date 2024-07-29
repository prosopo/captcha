import { describe, it, expect, vi } from 'vitest'
import { signatureVerify } from '@polkadot/util-crypto'
import { ProsopoContractError } from '@prosopo/common'
import { verifyRecency } from '@prosopo/contract'
import {
    validateSolution,
    checkPowSolution,
    checkPowSignature,
    checkRecentPowSolution,
} from '../../../../tasks/powCaptcha/powTasksUtils.js'

vi.mock('@polkadot/util-crypto', () => ({
    signatureVerify: vi.fn(),
}))

vi.mock('@prosopo/contract', () => ({
    verifyRecency: vi.fn(),
}))

describe('Validation Functions', () => {
    describe('validateSolution', () => {
        it('should return true for a valid solution', () => {
            const nonce = 377
            const challenge =
                '6678154___aZZW9CeVFStJw3si91CXBqaEsGR1sk6h1bBEecJ4EBaSgsx___5C7bfXYwachNuvmasEFtWi9BMS41uBvo6KpYHVSQmad4nWzw'
            const difficulty = 4
            const validSolution = validateSolution(nonce, challenge, difficulty)
            expect(validSolution).toBe(true)
        })

        it('should return false for an invalid solution', () => {
            const nonce = 0
            const challenge = 'testChallenge'
            const difficulty = 10
            const validSolution = validateSolution(nonce, challenge, difficulty)
            expect(validSolution).toBe(false)
        })
    })

    describe('checkPowSolution', () => {
        it('should not throw an error for a valid solution', () => {
            const nonce = 377
            const challenge =
                '6678154___aZZW9CeVFStJw3si91CXBqaEsGR1sk6h1bBEecJ4EBaSgsx___5C7bfXYwachNuvmasEFtWi9BMS41uBvo6KpYHVSQmad4nWzw'
            const difficulty = 4
            expect(() => checkPowSolution(nonce, challenge, difficulty)).not.toThrow()
        })

        it('should throw an error for an invalid solution', () => {
            const nonce = 0
            const challenge = 'testChallenge'
            const difficulty = 10
            expect(() => checkPowSolution(nonce, challenge, difficulty)).toThrow(
                new ProsopoContractError('API.CAPTCHA_FAILED', {
                    context: {
                        ERROR: 'Captcha solution is invalid',
                        failedFuncName: 'checkPowSolution',
                        nonce,
                        challenge,
                        difficulty,
                    },
                })
            )
        })
    })

    describe('checkPowSignature', () => {
        it('should not throw an error for a valid signature', () => {
            const challenge = 'testChallenge'
            const signature = 'testSignature'
            const providerAddress = 'testAddress'
            ;(signatureVerify as any).mockReturnValueOnce({ isValid: true })

            expect(() => checkPowSignature(challenge, signature, providerAddress)).not.toThrow()
        })

        it('should throw an error for an invalid signature', () => {
            const challenge = 'testChallenge'
            const signature = 'testSignature'
            const providerAddress = 'testAddress'
            ;(signatureVerify as any).mockReturnValueOnce({ isValid: false })

            expect(() => checkPowSignature(challenge, signature, providerAddress)).toThrow(
                new ProsopoContractError('GENERAL.INVALID_SIGNATURE', {
                    context: {
                        ERROR: 'Provider signature is invalid for this message',
                        failedFuncName: 'checkPowSignature',
                        signature,
                    },
                })
            )
        })
    })

    describe('checkRecentPowSolution', () => {
        it('should not throw an error for a recent solution', () => {
            const challenge = 'testChallenge'
            const timeout = 1000
            ;(verifyRecency as any).mockReturnValueOnce(true)

            expect(() => checkRecentPowSolution(challenge, timeout)).not.toThrow()
        })

        it('should throw an error for a non-recent solution', () => {
            const challenge = 'testChallenge'
            const timeout = 1000
            ;(verifyRecency as any).mockReturnValueOnce(false)

            expect(() => checkRecentPowSolution(challenge, timeout)).toThrow(
                new ProsopoContractError('CONTRACT.INVALID_BLOCKHASH', {
                    context: {
                        ERROR: `Block in which the Provider was selected must be within the last ${
                            timeout / 1000
                        } seconds`,
                        failedFuncName: 'checkRecentPowSolution',
                        challenge,
                    },
                })
            )
        })
    })
})

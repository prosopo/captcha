import { sha256 } from '@noble/hashes/sha256'
import { stringToHex } from '@polkadot/util'
import { signatureVerify } from '@polkadot/util-crypto'
import { ProsopoContractError } from '@prosopo/common'
import { verifyRecency } from '@prosopo/contract'

export const validateSolution = (nonce: number, challenge: string, difficulty: number): boolean =>
    Array.from(sha256(new TextEncoder().encode(nonce + challenge)))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('')
        .startsWith('0'.repeat(difficulty))

export const checkPowSolution = (nonce: number, challenge: string, difficulty: number): void => {
    const solutionValid = validateSolution(nonce, challenge, difficulty)
    if (!solutionValid) {
        throw new ProsopoContractError('API.CAPTCHA_FAILED', {
            context: {
                ERROR: 'Captcha solution is invalid',
                failedFuncName: checkPowSolution.name,
                nonce,
                challenge,
                difficulty,
            },
        })
    }
}

export const checkPowSignature = (challenge: string, signature: string, providerAddress: string): void => {
    const signatureVerification = signatureVerify(stringToHex(challenge), signature, providerAddress)
    if (!signatureVerification.isValid) {
        throw new ProsopoContractError('GENERAL.INVALID_SIGNATURE', {
            context: {
                ERROR: 'Provider signature is invalid for this message',
                failedFuncName: checkPowSignature.name,
                signature,
            },
        })
    }
}

export const checkRecentPowSolution = (challenge: string, timeout: number): void => {
    const recent = verifyRecency(challenge, timeout)
    if (!recent) {
        throw new ProsopoContractError('CONTRACT.INVALID_BLOCKHASH', {
            context: {
                ERROR: `Block in which the Provider was selected must be within the last ${timeout / 1000} seconds`,
                failedFuncName: checkRecentPowSolution.name,
                challenge,
            },
        })
    }
}

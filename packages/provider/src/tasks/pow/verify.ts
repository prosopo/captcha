import { sha256 } from '@noble/hashes/sha256'
import { stringToHex } from '@polkadot/util'
import { signatureVerify } from '@polkadot/util-crypto'
import { ProsopoContractError } from '@prosopo/common'
import { verifyRecency } from '@prosopo/contract'

export const validatePowCaptchaSolution = async (
    challenge: string,
    difficulty: number,
    signature: string,
    nonce: number,
    providerAddress: string,
    timeout: number
) => {
    checkRecentPowSolution(challenge, timeout)
    checkPowSignature(challenge, signature, providerAddress)
    checkPowSolution(nonce, challenge, difficulty)
}

export const validateSolution = (nonce: number, challenge: string, difficulty: number) =>
    Array.from(sha256(new TextEncoder().encode(nonce + challenge)))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('')
        .startsWith('0'.repeat(difficulty))

export const checkPowSolution = (nonce: number, challenge: string, difficulty: number) => {
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

export const checkPowSignature = (challenge: string, signature: string, providerAddress: string) => {
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

export const checkRecentPowSolution = (challenge: string, timeout: number) => {
    const recent = verifyRecency(challenge, timeout)

    if (!recent) {
        throw new ProsopoContractError('CONTRACT.INVALID_BLOCKHASH', {
            //TPDP THIS SHOULDN'T BE BLOCKHASH OR CONTRACT
            context: {
                ERROR: `Block in which the Provider was selected must be within the last ${timeout / 1000} seconds`,
                failedFuncName: checkRecentPowSolution.name,
                challenge,
            },
        })
    }
}

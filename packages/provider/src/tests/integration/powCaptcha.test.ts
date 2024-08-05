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
import { describe, it, expect } from 'vitest'
import fetch from 'node-fetch'
import { ApiPaths, type PoWCaptcha, type PowCaptchaSolutionResponse } from '@prosopo/types'
import { sha256 } from '@noble/hashes/sha256'

// Define the endpoint path and base URL
const baseUrl = 'http://localhost:9229'
const getPowCaptchaChallengePath = ApiPaths.GetPowCaptchaChallenge

const bufferToHex = (buffer: Uint8Array): string =>
    Array.from(buffer)
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('')

// PoW Captcha Solver
const solvePoW = (data: string, difficulty: number): number => {
    let nonce = 0
    const prefix = '0'.repeat(difficulty)

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const message = new TextEncoder().encode(nonce + data)
        const hashHex = bufferToHex(sha256(message))

        if (hashHex.startsWith(prefix)) {
            return nonce
        }

        nonce += 1
    }
}

// PoW Captcha Incorrect Solver - avoids slim chance of accidental correct solution
const failPoW = (data: string, difficulty: number): number => {
    let nonce = 0
    const prefix = '0'.repeat(difficulty)

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const message = new TextEncoder().encode(nonce + data)
        const hashHex = bufferToHex(sha256(message))

        if (!hashHex.startsWith(prefix)) {
            return nonce
        }

        nonce += 1
    }
}

describe('PoW Integration Tests', () => {
    describe('GetPowCaptchaChallenge', () => {
        it('should supply a PoW challenge to a Dapp User', async () => {
            const userAccount = 'userAddress'
            const dappAccount = 'dappAddress'
            const origin = 'http://localhost'

            const response = await fetch(`${baseUrl}${getPowCaptchaChallengePath}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Origin: origin,
                },
                body: JSON.stringify({ user: userAccount, dapp: dappAccount }),
            })

            expect(response.status).toBe(200)

            const data = await response.json()

            expect(data).toHaveProperty('challenge')
            expect(data).toHaveProperty('difficulty')
            expect(data).toHaveProperty('signature')
        })

        it('should return an error if origin header is not provided', async () => {
            const userAccount = 'userAddress'
            const dappAccount = 'dappAddress'

            const response = await fetch(`${baseUrl}${getPowCaptchaChallengePath}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ user: userAccount, dapp: dappAccount }),
            })

            expect(response.status).toBe(400)
        })
    })
    describe('SubmitPowCaptchaSolution', () => {
        it('should verify a correctly completed PoW captcha as true', async () => {
            const userAccount = 'userAddress'
            const dappAccount = 'dappAddress'
            const origin = 'http://localhost'

            const captchaRes = await fetch(`${baseUrl}${getPowCaptchaChallengePath}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Origin: origin,
                },
                body: JSON.stringify({ user: userAccount, dapp: dappAccount }),
            })

            const challengeBody = (await captchaRes.json()) as PoWCaptcha

            const challenge = challengeBody.challenge
            const difficulty = challengeBody.difficulty
            const signature = challengeBody.signature
            const nonce = solvePoW(challenge, difficulty)

            const verifiedTimeout = 120000
            const user = 'aZZW9CeVFStJw3si91CXBqaEsGR1sk6h1bBEecJ4EBaSgsx'
            const dapp = '5C7bfXYwachNuvmasEFtWi9BMS41uBvo6KpYHVSQmad4nWzw'

            const response = await fetch(`${baseUrl}${ApiPaths.SubmitPowCaptchaSolution}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ challenge, difficulty, signature, nonce, verifiedTimeout, user, dapp }),
            })

            expect(response.status).toBe(200)

            const data = (await response.json()) as PowCaptchaSolutionResponse

            expect(data).toHaveProperty('verified')
            expect(data.verified).toBe(true)
        })

        it('should return false for incorrectly completed PoW captcha', async () => {
            const userAccount = 'userAddress'
            const dappAccount = 'dappAddress'
            const origin = 'http://localhost'

            const captchaRes = await fetch(`${baseUrl}${getPowCaptchaChallengePath}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Origin: origin,
                },
                body: JSON.stringify({ user: userAccount, dapp: dappAccount }),
            })

            const challengeBody = (await captchaRes.json()) as PoWCaptcha

            const challenge = challengeBody.challenge
            const difficulty = challengeBody.difficulty
            const signature = challengeBody.signature
            const nonce = failPoW(challenge, difficulty)

            const verifiedTimeout = 120000
            const user = 'aZZW9CeVFStJw3si91CXBqaEsGR1sk6h1bBEecJ4EBaSgsx'
            const dapp = '5C7bfXYwachNuvmasEFtWi9BMS41uBvo6KpYHVSQmad4nWzw'

            const response = await fetch(`${baseUrl}${ApiPaths.SubmitPowCaptchaSolution}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ challenge, difficulty, signature, nonce, verifiedTimeout, user, dapp }),
            })

            expect(response.status).toBe(400)

            const data = response.statusText
            expect(data).toBe('"You answered one or more captchas incorrectly. Please try again"')
        })
    })
})

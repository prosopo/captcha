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
// import { describe, it, expect, vi } from 'vitest'
// import { ProsopoContractError } from '@prosopo/common'
// import { signatureVerify } from '@polkadot/util-crypto'
// import { verifyRecency } from '@prosopo/contract'
// import {
//     validateSolution,
//     checkPowSolution,
//     checkPowSignature,
//     checkRecentPowSolution,
// } from '../../tasks/powCaptcha/powTasksUtils'

// // Mock dependencies
// vi.mock('@polkadot/util-crypto', () => ({
//     signatureVerify: vi.fn(),
// }))
// vi.mock('@prosopo/contract', () => ({
//     verifyRecency: vi.fn(),
// }))

// describe('powCaptchaUtils', () => {
//     describe('validateSolution', () => {
//         it('should return true for a valid solution', () => {
//             const nonce = 1234
//             const challenge = 'testChallenge'
//             const difficulty = 1
//             const result = validateSolution(nonce, challenge, difficulty)
//             expect(result).toBe(true)
//         })

//         it('should return false for an invalid solution', () => {
//             const nonce = 1234
//             const challenge = 'testChallenge'
//             const difficulty = 5
//             const result = validateSolution(nonce, challenge, difficulty)
//             expect(result).toBe(false)
//         })
//     })

//     describe('checkPowSignature', () => {
//         it('should not throw an error for a valid signature', () => {
//             const challenge = 'testChallenge'
//             const signature = 'validSignature'
//             const providerAddress = 'providerAddress'
//             ;(signatureVerify as any).mockReturnValue({ isValid: true })

//             expect(() => checkPowSignature(challenge, signature, providerAddress)).not.toThrow()
//         })

//         it('should throw an error for an invalid signature', () => {
//             const challenge = 'testChallenge'
//             const signature = 'invalidSignature'
//             const providerAddress = 'providerAddress'
//             ;(signatureVerify as any).mockReturnValue({ isValid: false })

//             expect(() => checkPowSignature(challenge, signature, providerAddress)).toThrow(ProsopoContractError)
//         })
//     })

//     describe('checkRecentPowSolution', () => {
//         it('should not throw an error if the solution is recent', () => {
//             const challenge = 'testChallenge'
//             const timeout = 1000
//             ;(verifyRecency as any).mockReturnValue(true)

//             expect(() => checkRecentPowSolution(challenge, timeout)).not.toThrow()
//         })

//         it('should throw an error if the solution is not recent', () => {
//             const challenge = 'testChallenge'
//             const timeout = 1000
//             ;(verifyRecency as any).mockReturnValue(false)

//             expect(() => checkRecentPowSolution(challenge, timeout)).toThrow(ProsopoContractError)
//         })
//     })
// })

// Note: this is a snippet example of unit testing with vitest
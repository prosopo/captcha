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
import { CaptchaSolutionSchema, CaptchaWithProof } from '../datasets/index.js'
import { Hash, Provider } from '@prosopo/captcha-contract/types-returns'
import { array, number, object, string, infer as zInfer } from 'zod'

// The timeframe in which a user must complete an image captcha (1 minute)
export const DEFAULT_IMAGE_CAPTCHA_TIMEOUT = 60 * 1000
// The timeframe in which a captcha remains valid on the page before timing out (2 minutes)
export const DEFAULT_IMAGE_CAPTCHA_SOLUTION_TIMEOUT = 60 * 2 * 1000
// The time in ms since a Provider is selected to provide a PoW captcha, to the point where the solution is verified (60s)
export const DEFAULT_POW_CAPTCHA_TIMEOUT = 60 * 1000
// The time in milliseconds that a cached image captcha solution is valid for (15 minutes)
export const DEFAULT_MAX_VERIFIED_TIME_CACHED = 60 * 15 * 1000
// The time in milliseconds since the last correct captcha recorded in the contract (15 minutes)
export const DEFAULT_MAX_VERIFIED_TIME_CONTRACT = 60 * 15 * 1000

export enum ApiPaths {
    GetCaptchaChallenge = '/v1/prosopo/provider/captcha',
    GetPowCaptchaChallenge = '/v1/prosopo/provider/captcha/pow',
    SubmitCaptchaSolution = '/v1/prosopo/provider/solution',
    SubmitPowCaptchaSolution = '/v1/prosopo/provider/pow/solution',
    ServerPowCaptchaVerify = '/v1/prosopo/provider/pow/server-verify',
    VerifyCaptchaSolution = '/v1/prosopo/provider/verify',
    GetProviderStatus = '/v1/prosopo/provider/status',
    GetProviderDetails = '/v1/prosopo/provider/details',
    SubmitUserEvents = '/v1/prosopo/provider/events',
}

export enum AdminApiPaths {
    BatchCommit = '/v1/prosopo/provider/admin/batch',
    UpdateDataset = '/v1/prosopo/provider/admin/dataset',
    ProviderDeregister = '/v1/prosopo/provider/admin/deregister',
    ProviderUpdate = '/v1/prosopo/provider/admin/update',
}

export enum ApiParams {
    datasetId = 'datasetId',
    user = 'user',
    dapp = 'dapp',
    provider = 'provider',
    blockNumber = 'blockNumber',
    signature = 'signature',
    requestHash = 'requestHash',
    captchas = 'captchas',
    commitmentId = 'commitmentId',
    proof = 'proof',
    providerUrl = 'providerUrl',
    procaptchaResponse = 'procaptcha-response',
    maxVerifiedTime = 'maxVerifiedTime',
    timeout = 'timeout',
    verified = 'verified',
    status = 'status',
    challenge = 'challenge',
    difficulty = 'difficulty',
    nonce = 'nonce',
}

export interface DappUserSolutionResult {
    [ApiParams.captchas]: CaptchaIdAndProof[]
    partialFee?: string
    [ApiParams.verified]: boolean
}

export interface CaptchaSolutionResponse extends DappUserSolutionResult {
    [ApiParams.status]: string
}

export interface CaptchaIdAndProof {
    captchaId: string
    proof: string[][]
}

export const CaptchaRequestBody = object({
    [ApiParams.user]: string(),
    [ApiParams.dapp]: string(),
    [ApiParams.datasetId]: string(),
    [ApiParams.blockNumber]: string(),
})

export type CaptchaRequestBodyType = zInfer<typeof CaptchaRequestBody>

export type CaptchaResponseBody = {
    [ApiParams.captchas]: CaptchaWithProof[]
    [ApiParams.requestHash]: string
}

export const CaptchaSolutionBody = object({
    [ApiParams.user]: string(),
    [ApiParams.dapp]: string(),
    [ApiParams.captchas]: array(CaptchaSolutionSchema),
    [ApiParams.requestHash]: string(),
    [ApiParams.signature]: string(), // the signature to prove account ownership
})

export type CaptchaSolutionBodyType = zInfer<typeof CaptchaSolutionBody>

export const VerifySolutionBody = object({
    [ApiParams.dapp]: string(),
    [ApiParams.user]: string(),
    [ApiParams.blockNumber]: number(),
    [ApiParams.commitmentId]: string().optional(),
    [ApiParams.maxVerifiedTime]: number().optional().default(DEFAULT_MAX_VERIFIED_TIME_CACHED),
})

export type VerifySolutionBodyType = zInfer<typeof VerifySolutionBody>

export interface PendingCaptchaRequest {
    accountId: string
    pending: boolean
    salt: string
    [ApiParams.requestHash]: string
    deadlineTimestamp: number // unix timestamp
    requestedAtBlock: number // expected block number
}

export interface ProviderRegistered {
    status: 'Registered' | 'Unregistered'
}

export interface ProviderDetails {
    provider: Provider
    dbConnectionOk: boolean
}

export interface VerificationResponse {
    [ApiParams.status]: string
    [ApiParams.verified]: boolean
}

export interface ImageVerificationResponse extends VerificationResponse {
    [ApiParams.commitmentId]: Hash
    // The block at which the captcha was requested
    [ApiParams.blockNumber]: number
}

export interface GetPowCaptchaResponse {
    [ApiParams.challenge]: string
    [ApiParams.difficulty]: number
    [ApiParams.signature]: string
}

export interface PowCaptchaSolutionResponse {
    [ApiParams.verified]: boolean
}

/**
 * Request body for the server to verify a PoW captcha solution
 * @param {string} challenge - The challenge string
 * @param {string} dapp - The dapp account (site key)
 * @param {number} recencyLimit - The maximum time in milliseconds since the Provider was selected at `blockNumber`
 */
export const ServerPowCaptchaVerifyRequestBody = object({
    [ApiParams.challenge]: string(),
    [ApiParams.dapp]: string(),
    [ApiParams.timeout]: number().optional().default(DEFAULT_POW_CAPTCHA_TIMEOUT),
})

export const GetPowCaptchaChallengeRequestBody = object({
    [ApiParams.user]: string(),
    [ApiParams.dapp]: string(),
})

export type GetPowCaptchaChallengeRequestBodyType = zInfer<typeof GetPowCaptchaChallengeRequestBody>

export type ServerPowCaptchaVerifyRequestBodyType = zInfer<typeof ServerPowCaptchaVerifyRequestBody>

export const SubmitPowCaptchaSolutionBody = object({
    [ApiParams.blockNumber]: number(),
    [ApiParams.challenge]: string(),
    [ApiParams.difficulty]: number(),
    [ApiParams.signature]: string(),
    [ApiParams.user]: string(),
    [ApiParams.dapp]: string(),
    [ApiParams.nonce]: number(),
    [ApiParams.timeout]: number().optional().default(DEFAULT_POW_CAPTCHA_TIMEOUT),
})

export type SubmitPowCaptchaSolutionBodyType = zInfer<typeof SubmitPowCaptchaSolutionBody>

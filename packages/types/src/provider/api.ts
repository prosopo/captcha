// Copyright 2021-2023 Prosopo (UK) Ltd.
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
import { CaptchaSolutionSchema } from '../datasets/index.js'
import { z } from 'zod'

export enum ApiPaths {
    GetCaptchaChallenge = '/v1/prosopo/provider/captcha',
    SubmitCaptchaSolution = '/v1/prosopo/provider/solution',
    VerifyCaptchaSolution = '/v1/prosopo/provider/verify',
    GetProviderStatus = '/v1/prosopo/provider/status',
    GetProviderDetails = '/v1/prosopo/provider/details',
}

export enum ApiParams {
    datasetId = 'datasetId',
    user = 'user',
    dapp = 'dapp',
    blockNumber = 'blockNumber',
    signature = 'signature',
    requestHash = 'requestHash',
    captchas = 'captchas',
    commitmentId = 'commitmentId',
    providerUrl = 'providerUrl',
    procaptchaResponse = 'procaptcha-response',
}

export interface DappUserSolutionResult {
    [ApiParams.captchas]: CaptchaIdAndProof[]
    partialFee?: string
    solutionApproved: boolean
}

export interface CaptchaIdAndProof {
    captchaId: string
    proof: string[][]
}

export const CaptchaRequestBody = z.object({
    [ApiParams.user]: z.string(),
    [ApiParams.dapp]: z.string(),
    [ApiParams.datasetId]: z.string(),
    [ApiParams.blockNumber]: z.string(),
})

export type CaptchaRequestBodyType = z.infer<typeof CaptchaRequestBody>

export const CaptchaSolutionBody = z.object({
    [ApiParams.user]: z.string(),
    [ApiParams.dapp]: z.string(),
    [ApiParams.captchas]: z.array(CaptchaSolutionSchema),
    [ApiParams.requestHash]: z.string(),
    [ApiParams.signature]: z.string(), // the signature to prove account ownership
})

export type CaptchaSolutionBodyType = z.infer<typeof CaptchaSolutionBody>

export const VerifySolutionBody = z.object({
    [ApiParams.user]: z.string(),
    [ApiParams.commitmentId]: z.string().optional(),
})

export type VerifySolutionBodyType = z.infer<typeof VerifySolutionBody>

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

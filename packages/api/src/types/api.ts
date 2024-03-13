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

import { Captcha, MerkleProof } from '@prosopo/types'

export interface ProsopoRandomProviderResponse {
    providerId: string
    blockNumber: string
    provider: ProposoProvider
}

export type CaptchaSolutionCommitmentId = string

export type ProsopoDappOperatorIsHumanUserResponse = boolean

export interface ProposoProvider {
    balance: string
    datasetId: string
    datasetIdContent: string
    fee: string
    payee: string
    serviceOrigin: string
    status: string
}

export interface CaptchaResponseCaptcha {
    captcha: Omit<Captcha, 'solution'>
    proof: MerkleProof
}

export interface GetCaptchaResponse {
    captchas: CaptchaResponseCaptcha[]
    requestHash: string
}

export interface GetPowCaptchaResponse {
    challenge: string
    difficulty: number
    signature: string
}

export interface VerificationResponse {
    status: string
    solutionApproved: boolean
    commitmentId: CaptchaSolutionCommitmentId
    // The block at which the captcha was requested
    blockNumber: number
}

export interface CaptchaSolutionResponse {
    captchas: CaptchaResponseCaptcha[]
    status: string
    partialFee: string
    solutionApproved: boolean
}

export interface PowCaptchaSolutionResponse {
    verified: boolean
}

export interface AccountCreatorConfig {
    area: { width: number; height: number }
    offsetParameter: number
    multiplier: number
    fontSizeFactor: number
    maxShadowBlur: number
    numberOfRounds: number
    seed: number
}

export interface ProsopoNetwork {
    endpoint: string
    contract: {
        address: string
        name: string
    }
    dappAccount: {
        address: string
        name: string
    }
}

export interface ProviderRegistered {
    status: 'Registered' | 'Unregistered'
}

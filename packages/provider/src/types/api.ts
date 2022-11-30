// Copyright 2021-2022 Prosopo (UK) Ltd.
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
import { z } from 'zod'
import { CaptchaSolutionArraySchema } from '@prosopo/datasets'
import { AnyJson } from '@polkadot/types/types/codec'
import { CaptchaWithProof } from '@prosopo/datasets'

export type CaptchaResponse = CaptchaWithProof[]

export interface DappUserSolutionResult {
    captchas: CaptchaIdAndProof[]
    partialFee?: string
    solutionApproved: boolean
}

export interface CaptchaIdAndProof {
    captchaId: string
    proof: string[][]
}

export const CaptchaSolutionBody = z.object({
    userAccount: z.string(),
    dappAccount: z.string(),
    captchas: CaptchaSolutionArraySchema,
    requestHash: z.string(),
    blockHash: z.string().optional(),
    txHash: z.string().optional(),
    web2: z.boolean().optional().default(false),
    signature: z.string().optional(), // the signature of the signed message (web2 only)
    signedMessage: z.string().optional(), // the signed message, signed by the user's account (web2 only)
})

export const VerifySolutionBody = z.object({
    userAccount: z.string(),
    commitmentId: z.string().optional(),
})

export interface PendingCaptchaRequest {
    accountId: string
    pending: boolean
    salt: string
    requestHash: string
}

export interface AccountsResponse {
    accounts: AnyJson
}

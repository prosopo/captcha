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
import { Captcha, CaptchaSolutionSchema, Override, RawSolution } from '@prosopo/contract'
import { AnyJson } from '@polkadot/types/types/codec'

export interface CaptchaWithProof {
    captcha: Override<Captcha, { solution?: RawSolution[] }>
    proof: string[][]
}

export type CaptchaResponse = CaptchaWithProof[]

export interface DappUserSolutionResult {
    captchas: CaptchaIdAndProof[]
    partialFee: string
}

export interface CaptchaIdAndProof {
    captchaId: string
    proof: string[][]
}

export const CaptchaSolutionBody = z.object({
    userAccount: z.string(),
    dappAccount: z.string(),
    captchas: CaptchaSolutionSchema,
    requestHash: z.string(),
    blockHash: z.string(),
    txHash: z.string(),
})

export interface PendingCaptchaRequest {
    accountId: string,
    pending: boolean,
    salt: string
}

export interface AccountsResponse {
    accounts: AnyJson
}

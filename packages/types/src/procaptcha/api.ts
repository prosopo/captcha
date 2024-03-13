// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of procaptcha <https://github.com/prosopo/procaptcha>.
//
// procaptcha is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// procaptcha is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with procaptcha.  If not, see <http://www.gnu.org/licenses/>.
// declare module "*.json" {
//   const value: any;
//   export default value;
// }

import type { Captcha, MerkleProof } from '../index.js'

export interface ProsopoRandomProviderResponse {
    providerId: string
    blockNumber: string
    provider: ProposoProvider
}

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

// TODO de-duplicate. This is a duplicate of CaptchaWithProof from @prosopo/provider
export interface CaptchaResponseCaptcha {
    captcha: Omit<Captcha, 'solution'>
    proof: MerkleProof
}

export interface GetCaptchaResponse {
    captchas: CaptchaResponseCaptcha[]
    requestHash: string
}

export interface GetVerificationResponse {
    status: string
    solutionApproved: boolean
}

export interface CaptchaSolutionResponse {
    captchas: CaptchaResponseCaptcha[]
    status: string
    partialFee: string
    solutionApproved: boolean
}

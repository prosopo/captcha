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

import { AccountId } from '@prosopo/captcha-contract'
import {
    CaptchaResponseBody,
    CaptchaSolutionResponse,
    GetPowCaptchaResponse,
    ImageVerificationResponse,
    PowCaptchaSolutionResponse,
    ProviderRegistered,
} from '../provider/index.js'
import { CaptchaSolution } from '../datasets/index.js'
import { Provider, RandomProvider } from '@prosopo/captcha-contract/types-returns'
import { StoredEvents } from '../procaptcha/index.js'

export interface ProviderApiInterface {
    getCaptchaChallenge(userAccount: AccountId, randomProvider: RandomProvider): Promise<CaptchaResponseBody>
    submitCaptchaSolution(
        captchas: CaptchaSolution[],
        requestHash: string,
        userAccount: AccountId,
        salt: string,
        timestamp: string,
        signedTimestamp: string,
        signature?: string
    ): Promise<CaptchaSolutionResponse>
    verifyDappUser(
        dapp: AccountId,
        userAccount: AccountId,
        blockNumber: number,
        dappUserSignature: string,
        commitmentId?: string,
        maxVerifiedTime?: number
    ): Promise<ImageVerificationResponse>
    verifyUser(
        dapp: AccountId,
        userAccount: AccountId,
        blockNumber: number,
        dappUserSignature: string,
        commitmentId?: string,
        maxVerifiedTime?: number
    ): Promise<ImageVerificationResponse>
    getPowCaptchaChallenge(userAccount: AccountId, dappAccount: AccountId): Promise<GetPowCaptchaResponse>
    submitPowCaptchaSolution(
        challenge: GetPowCaptchaResponse,
        userAccount: AccountId,
        dappAccount: AccountId,
        randomProvider: RandomProvider,
        nonce: number
    ): Promise<PowCaptchaSolutionResponse>
    submitUserEvents(events: StoredEvents, accountId: AccountId): Promise<unknown>
    getProviderStatus(): Promise<ProviderRegistered>
    getProviderDetails(): Promise<Provider>
}

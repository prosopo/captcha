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
    ApiPaths,
    CaptchaResponseBody,
    CaptchaSolution,
    CaptchaSolutionBody,
    CaptchaSolutionBodyType,
    CaptchaSolutionResponse,
    GetPowCaptchaResponse,
    NetworkConfig,
    PowCaptchaSolutionResponse,
    ProviderRegistered,
    StoredEvents,
    VerificationResponse,
    VerifySolutionBodyType,
} from '@prosopo/types'
import { Provider, RandomProvider } from '@prosopo/captcha-contract/types-returns'
import HttpClientBase from './HttpClientBase.js'

export default class ProviderApi extends HttpClientBase implements ProviderApi {
    private network: NetworkConfig
    private account: AccountId

    constructor(network: NetworkConfig, providerUrl: string, account: AccountId) {
        if (!providerUrl.startsWith('http')) {
            providerUrl = `https://${providerUrl}`
        }
        super(providerUrl)
        this.network = network
        this.account = account
    }

    public getCaptchaChallenge(userAccount: AccountId, randomProvider: RandomProvider): Promise<CaptchaResponseBody> {
        const { provider, blockNumber } = randomProvider
        const dappAccount = this.account
        const url = `${ApiPaths.GetCaptchaChallenge}/${provider.datasetId}/${userAccount}/${dappAccount}/${blockNumber
            .toString()
            .replace(/,/g, '')}`
        return this.fetch(url)
    }

    public submitCaptchaSolution(
        captchas: CaptchaSolution[],
        requestHash: string,
        userAccount: AccountId,
        salt: string,
        signature?: string
    ): Promise<CaptchaSolutionResponse> {
        const captchaSolutionBody: CaptchaSolutionBodyType = CaptchaSolutionBody.parse({
            captchas,
            requestHash,
            user: userAccount,
            dapp: this.account,
            salt,
            signature,
        })
        return this.post(ApiPaths.SubmitCaptchaSolution, captchaSolutionBody)
    }

    public verifyDappUser(
        dapp: AccountId,
        userAccount: AccountId,
        commitmentId?: string,
        maxVerifiedTime?: number
    ): Promise<VerificationResponse> {
        const payload: {
            dapp: AccountId
            user: AccountId
            commitmentId?: string
            maxVerifiedTime?: number
        } = { dapp: dapp, user: userAccount }
        if (commitmentId) {
            payload['commitmentId'] = commitmentId
        }
        if (maxVerifiedTime) {
            payload['maxVerifiedTime'] = maxVerifiedTime
        }
        return this.post(ApiPaths.VerifyCaptchaSolution, payload as VerifySolutionBodyType)
    }

    public getPowCaptchaChallenge(userAccount: AccountId, dappAccount: AccountId): Promise<GetPowCaptchaResponse> {
        return this.post(ApiPaths.GetPowCaptchaChallenge, { userAccount, dappAccount })
    }

    public submitPowCaptchaSolution(
        challenge: GetPowCaptchaResponse,
        userAccount: AccountId,
        dappAccount: AccountId,
        randomProvider: RandomProvider,
        nonce: number
    ): Promise<PowCaptchaSolutionResponse> {
        const { provider, blockNumber } = randomProvider
        return this.post(ApiPaths.SubmitPowCaptchaSolution, {
            blockNumber,
            challenge: challenge.challenge,
            difficulty: challenge.difficulty,
            signature: challenge.signature,
            userAccount,
            dappAccount,
            provider,
            nonce,
        })
    }

    public submitUserEvents(events: StoredEvents, accountId: AccountId) {
        return this.post(ApiPaths.SubmitUserEvents, { events, accountId })
    }

    public getProviderStatus(): Promise<ProviderRegistered> {
        return this.fetch(ApiPaths.GetProviderStatus)
    }

    public getProviderDetails(): Promise<Provider> {
        return this.fetch(ApiPaths.GetProviderDetails)
    }
}

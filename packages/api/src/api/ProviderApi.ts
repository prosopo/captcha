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
import {
    AccountId,
    ApiPaths,
    CaptchaSolution,
    CaptchaSolutionBody,
    CaptchaSolutionBodyType,
    Provider,
    RandomProvider,
    VerifySolutionBodyType,
} from '@prosopo/types'
import {
    CaptchaSolutionResponse,
    GetCaptchaResponse,
    ProviderRegistered,
    VerificationResponse,
} from '../types/index.js'
import { NetworkConfig } from '@prosopo/types'
import HttpClientBase from './HttpClientBase.js'

export default class ProviderApi extends HttpClientBase {
    private network: NetworkConfig
    private account: AccountId

    constructor(network: NetworkConfig, providerUrl: string, account: AccountId) {
        if (!providerUrl.startsWith('http')) {
            providerUrl = `https://${providerUrl}`
        }
        console.log('ProviderApi', providerUrl)
        super(providerUrl)
        this.network = network
        this.account = account
    }

    public getCaptchaChallenge(userAccount: string, randomProvider: RandomProvider): Promise<GetCaptchaResponse> {
        const { provider } = randomProvider
        const { blockNumber } = randomProvider
        const dappAccount = this.account
        const url = `${ApiPaths.GetCaptchaChallenge}/${provider.datasetId}/${userAccount}/${dappAccount}/${blockNumber
            .toString()
            .replace(/,/g, '')}`
        console.log(url)
        return this.axios.get(url)
    }

    public submitCaptchaSolution(
        captchas: CaptchaSolution[],
        requestHash: string,
        userAccount: string,
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
        return this.axios.post(ApiPaths.SubmitCaptchaSolution, captchaSolutionBody)
    }

    public verifyDappUser(userAccount: string, commitmentId?: string): Promise<VerificationResponse> {
        const payload = { user: userAccount }
        if (commitmentId) {
            payload['commitmentId'] = commitmentId
        }
        return this.axios.post(ApiPaths.VerifyCaptchaSolution, payload as VerifySolutionBodyType)
    }

    public getProviderStatus(): Promise<ProviderRegistered> {
        return this.axios.get(ApiPaths.GetProviderStatus)
    }

    public getProviderDetails(): Promise<Provider> {
        return this.axios.get(ApiPaths.GetProviderDetails)
    }
}

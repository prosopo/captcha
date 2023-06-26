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
import {
    AccountId,
    ApiPaths,
    CaptchaSolution,
    CaptchaSolutionBody,
    CaptchaSolutionBodyType,
    RandomProvider,
    VerifySolutionBodyType,
} from '@prosopo/types'
import { CaptchaSolutionResponse, GetCaptchaResponse, VerificationResponse } from '../types'
import { NetworkConfig } from '@prosopo/types'
import HttpClientBase from './HttpClientBase'

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
}

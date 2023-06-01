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
import { CaptchaSolution, CaptchaSolutionBodyType, RandomProvider, VerifySolutionBodyType } from '@prosopo/types'
import { CaptchaSolutionResponse, GetCaptchaResponse, ProsopoNetwork, VerificationResponse } from '../types'
import HttpClientBase from './HttpClientBase'

export default class ProviderApi extends HttpClientBase {
    private network: ProsopoNetwork

    constructor(network: ProsopoNetwork, providerUrl: string) {
        super(providerUrl)
        this.network = network
    }

    public getCaptchaChallenge(userAccount: string, randomProvider: RandomProvider): Promise<GetCaptchaResponse> {
        const { provider } = randomProvider
        const { blockNumber } = randomProvider
        const dappAccount = this.network.dappContract.address

        return this.axios.get(
            `/v1/prosopo/provider/captcha/${provider.datasetId}/${userAccount}/${dappAccount}/${blockNumber
                .toString()
                .replace(/,/g, '')}`
        )
    }

    public submitCaptchaSolution(
        captchas: CaptchaSolution[],
        requestHash: string,
        userAccount: string,
        salt: string,
        signature?: string
    ): Promise<CaptchaSolutionResponse> {
        return this.axios.post(`/v1/prosopo/provider/solution`, {
            captchas,
            requestHash,
            userAccount,
            dappAccount: this.network.dappContract.address,
            salt,
            signature,
        } as CaptchaSolutionBodyType)
    }

    public verifyDappUser(userAccount: string, commitmentId?: string): Promise<VerificationResponse> {
        const payload = { userAccount }
        if (commitmentId) {
            payload['commitmentId'] = commitmentId
        }
        return this.axios.post(`/v1/prosopo/provider/verify`, payload as VerifySolutionBodyType)
    }
}

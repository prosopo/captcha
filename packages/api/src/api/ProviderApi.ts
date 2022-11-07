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
import HttpClientBase from './HttpClientBase'
import {
    CaptchaSolutionResponse,
    GetCaptchaResponse,
    GetVerificationResponse,
    ProsopoNetwork,
    ProsopoRandomProviderResponse,
} from '../types'
import { CaptchaSolution } from '@prosopo/datasets'

export class ProviderApi extends HttpClientBase {
    private network: ProsopoNetwork

    constructor(network: ProsopoNetwork, providerUrl: string) {
        super(providerUrl)
        this.network = network
    }

    public getProviders(): Promise<{ accounts: string[] }> {
        return this.axios.get(`/v1/prosopo/providers`)
    }

    public getCaptchaChallenge(
        userAccount: string,
        randomProvider: ProsopoRandomProviderResponse
    ): Promise<GetCaptchaResponse> {
        const { provider } = randomProvider
        let { blockNumber } = randomProvider
        blockNumber = blockNumber.replace(/,/g, '')
        return this.axios.get(
            `/v1/prosopo/provider/captcha/${provider.datasetId}/${userAccount}/${this.network.dappContract.address}/${blockNumber}`
        )
    }

    public submitCaptchaSolution(
        captchas: CaptchaSolution[],
        requestHash: string,
        userAccount: string,
        salt: string,
        blockHash?: string,
        txHash?: string,
        web2?: boolean
    ): Promise<CaptchaSolutionResponse> {
        return this.axios.post(`/v1/prosopo/provider/solution`, {
            blockHash,
            captchas,
            requestHash,
            txHash,
            userAccount,
            dappAccount: this.network.dappContract.address,
            web2,
            salt,
        })
    }

    public verifySolution(userAccount: string, commitmentId: string): Promise<GetVerificationResponse> {
        return this.axios.get(`/v1/prosopo/provider/verify/${userAccount}/${commitmentId}`)
    }
}

export default ProviderApi

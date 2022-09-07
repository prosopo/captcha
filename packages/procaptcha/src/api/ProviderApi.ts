// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of procaptcha <https://github.com/prosopo-io/procaptcha>.
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
import HttpClientBase from "./HttpClientBase";
import Storage from "../modules/storage";
import {
    ProsopoCaptchaConfig,
    ProsopoRandomProviderResponse,
    GetCaptchaResponse,
    CaptchaSolution,
    CaptchaSolutionResponse
} from '../types';

export class ProviderApi extends HttpClientBase {

    private config: ProsopoCaptchaConfig;

    constructor(config: ProsopoCaptchaConfig) {
        super(config['providerApi.baseURL'], config['providerApi.prefix']);
        this.config = config;
    }

    public getProviders(): Promise<{ accounts: string[] }> {
        return this.axios.get(`/providers`);
    }

    public getContractAddress(): Promise<{ contractAddress: string }> {
        return this.axios.get(`/contract_address`);
    }

    public getCaptchaChallenge(randomProvider: ProsopoRandomProviderResponse): Promise<GetCaptchaResponse> {
        const {provider} = randomProvider;
        let {blockNumber} = randomProvider;
        blockNumber = blockNumber.replace(/,/g, '');
        const userAccount = Storage.getAccount();
        return this.axios.get(`/provider/captcha/${provider.captchaDatasetId}/${userAccount}/${this.config['dappAccount']}/${blockNumber}`);
    }

    public submitCaptchaSolution(captchas: CaptchaSolution[], requestHash: string, userAccount: string, blockHash?: string, txHash?: string): Promise<CaptchaSolutionResponse> {
        return this.axios.post(`/provider/solution`, {
            blockHash,
            captchas,
            requestHash,
            txHash,
            userAccount,
            dappAccount: this.config['dappAccount']
        });
    }

}

export default ProviderApi;

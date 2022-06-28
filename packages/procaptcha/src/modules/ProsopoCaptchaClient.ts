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
import { ICaptchaContextReducer, CaptchaEventCallbacks, TExtensionAccount, ICaptchaStatusReducer, IExtensionInterface } from "../types/client";
import { ProsopoRandomProviderResponse } from "../types/api";

import { ProsopoContract } from "../api/ProsopoContract";
import { getProsopoContract, getWsProvider } from "./contract";
import { getExtension } from "./extension";
import { ProviderApi } from "../api/ProviderApi";
import { ProsopoCaptchaApi } from "./ProsopoCaptchaApi";
// import { Extension } from "../api";


export class ProsopoCaptchaClient {

    public manager: ICaptchaContextReducer;
    public status: ICaptchaStatusReducer;
    public callbacks: CaptchaEventCallbacks | undefined;
    public providerApi: ProviderApi;

    private static extension: IExtensionInterface;
    private static contract: ProsopoContract | undefined;
    private static provider: ProsopoRandomProviderResponse | undefined;
    private static captchaApi: ProsopoCaptchaApi | undefined;

    constructor(manager: ICaptchaContextReducer, status: ICaptchaStatusReducer, callbacks?: CaptchaEventCallbacks) {
        this.manager = manager;
        this.status = status;
        this.callbacks = callbacks;
        this.providerApi = new ProviderApi(manager.state.config);
    }

    public getExtension() {
        return ProsopoCaptchaClient.extension;
    }

    public setExtension(extension: IExtensionInterface) {
        return ProsopoCaptchaClient.extension = extension;
    }

    public getContract() {
        return ProsopoCaptchaClient.contract;
    }

    public getProvider() {
        return ProsopoCaptchaClient.provider;
    }

    public getCaptchaApi() {
        return ProsopoCaptchaClient.captchaApi;
    }

    public async onLoad() {
        let contractAddress = ProsopoCaptchaClient.contract?.address;
    
        if (!ProsopoCaptchaClient.extension || !contractAddress) {
            try {
                [ProsopoCaptchaClient.extension, { contractAddress }] = await Promise.all([getExtension(), this.providerApi.getContractAddress()]);
            } catch (err) {
                throw new Error(err);
            }
        }

        if (this.callbacks?.onLoad) {
            this.callbacks.onLoad(ProsopoCaptchaClient.extension, contractAddress);
        }

        this.manager.update({ contractAddress });
    }

    public async onAccountChange(account?: TExtensionAccount) {
        if (!account) {
            this.onAccountUnset();
            return;
        }

        try {
            ProsopoCaptchaClient.extension.setAccount(account.address);
        } catch (err) {
            throw new Error(err);
        }

        try {
            ProsopoCaptchaClient.contract = await getProsopoContract(this.manager.state.contractAddress!, this.manager.state.config['dappAccount'], account, 
                getWsProvider(this.manager.state.config['dappUrl']));
        } catch (err) {
            throw new Error(err);
        }

        try {
            ProsopoCaptchaClient.provider = await ProsopoCaptchaClient.contract.getRandomProvider(); // TODO how often should provider change?
        } catch (err) {
            throw new Error(err);
        }

        ProsopoCaptchaClient.captchaApi = new ProsopoCaptchaApi(ProsopoCaptchaClient.contract, ProsopoCaptchaClient.provider, this.providerApi);

        if (this.callbacks?.onAccountChange) {
            this.callbacks.onAccountChange(account);
        }

        this.manager.update({ account });
    }

    public onAccountUnset() {
        ProsopoCaptchaClient.contract = undefined;
        ProsopoCaptchaClient.provider = undefined;
        ProsopoCaptchaClient.captchaApi = undefined;

        if (this.callbacks?.onAccountChange) {
            this.callbacks.onAccountChange(undefined);
        }

        this.manager.update({ account: undefined });
    }

}

export default ProsopoCaptchaClient;

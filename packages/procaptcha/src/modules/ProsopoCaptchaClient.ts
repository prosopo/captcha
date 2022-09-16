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
import {
    ICaptchaContextReducer,
    CaptchaEventCallbacks,
    TExtensionAccount,
    ICaptchaStatusReducer,
    IExtensionInterface
} from "../types/client";
import {ProsopoRandomProviderResponse} from "../types/api";
import {ProsopoContract} from "../api/ProsopoContract";
import {getProsopoContract, getWsProvider} from "./contract";
import {getExtension} from "./extension";
import {ProviderApi} from "../api/ProviderApi";
import {ProsopoCaptchaApi} from "./ProsopoCaptchaApi";
import {ProsopoEnvError} from "@prosopo/contract";
import {InjectedAccountWithMeta} from "@polkadot/extension-inject/types";

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
        console.log("getExtension", ProsopoCaptchaClient.extension)
        return ProsopoCaptchaClient.extension;
    }

    public setExtension(extension: IExtensionInterface) {
        ProsopoCaptchaClient.extension = extension;
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

    public async onLoad(createAccount?: boolean) {

        if (!ProsopoCaptchaClient.extension) {
            try {
                ProsopoCaptchaClient.extension = await getExtension(this.manager.state.config['web3']);
                console.log("extension", ProsopoCaptchaClient.extension)
            } catch (err) {
                throw new ProsopoEnvError(err);
            }
        }

        if (this.callbacks?.onLoad) {
            this.callbacks.onLoad(ProsopoCaptchaClient.extension, this.manager.state.config['prosopoContractAccount']);
            this.manager.update({ contractAddress: this.manager.state.config['prosopoContractAccount'] });
        }

        if (createAccount) {
            const account = await this.getExtension().createAccount()
            await this.onAccountChange(account);
        }

    }

    public async onAccountChange(account?: TExtensionAccount) {
        console.log("onAccountChange state", this.manager.state)

        if (!account) {
            this.onAccountUnset();
            return;
        }

        try {
            ProsopoCaptchaClient.extension.setAccount(account.address);
        } catch (err) {
            throw new ProsopoEnvError(err);
        }

        try {
            ProsopoCaptchaClient.contract = await getProsopoContract(
                this.manager.state.config['prosopoContractAccount'],
                this.manager.state.config['dappAccount'],
                account,
                getWsProvider(this.manager.state.config['dappUrl'])
            );
        } catch (err) {
            throw new ProsopoEnvError(err);
        }

        try {
            ProsopoCaptchaClient.provider = await ProsopoCaptchaClient.contract.getRandomProvider();
        } catch (err) {
            throw new ProsopoEnvError(err);
        }

        ProsopoCaptchaClient.captchaApi = new ProsopoCaptchaApi(ProsopoCaptchaClient.contract,
            ProsopoCaptchaClient.provider,
            this.providerApi,
            this.manager.state.config['web3']
        );

        if (this.callbacks?.onAccountChange) {
            this.callbacks.onAccountChange(account);
        }

        this.manager.update({account});
    }

    public onAccountUnset() {
        ProsopoCaptchaClient.contract = undefined;
        ProsopoCaptchaClient.provider = undefined;
        ProsopoCaptchaClient.captchaApi = undefined;

        if (this.callbacks?.onAccountChange) {
            this.callbacks.onAccountChange(undefined);
        }

        this.manager.update({account: undefined});
    }

}

export default ProsopoCaptchaClient;

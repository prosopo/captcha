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
import {AccountCreator} from "../api/AccountCreator";
import {InjectedAccountWithMeta} from "@polkadot/extension-inject/types";
import storage from "./storage";
// import { Extension } from "../api";


export class ProsopoCaptchaClient {

    public manager: ICaptchaContextReducer;
    public status: ICaptchaStatusReducer;
    public callbacks: CaptchaEventCallbacks | undefined;
    public providerApi: ProviderApi;
    // public config: ProsopoCaptchaConfig;

    private static extension: IExtensionInterface;
    private static contract: ProsopoContract | undefined;
    private static provider: ProsopoRandomProviderResponse | undefined;
    private static captchaApi: ProsopoCaptchaApi | undefined;

    constructor(manager: ICaptchaContextReducer, status: ICaptchaStatusReducer, callbacks?: CaptchaEventCallbacks) {
        this.manager = manager;
        this.status = status;
        this.callbacks = callbacks;
        this.providerApi = new ProviderApi(manager.state.config);
        // this.config = manager.state.config;
    }

    public getExtension() {
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

    public async onLoad() {
        let contractAddress = ProsopoCaptchaClient.contract?.address;
        let account: InjectedAccountWithMeta | undefined
        console.log(this.manager.state)
        console.log('web3: ', this.manager.state.config['web3']);

        if (!this.manager.state.config['web3']) {
            const accountCreator = await AccountCreator.create(getWsProvider(this.manager.state.config['dappUrl']));
            const storedAccount = storage.getAccount();
            account = await accountCreator.createAccount(undefined, storedAccount)

        }

        if (!ProsopoCaptchaClient.extension) {
            try {
                const accounts = (!this.manager.state.config['web3'] && account) ? [account] : undefined
                ProsopoCaptchaClient.extension = await getExtension(this.manager.state.config['web3'], accounts);
            } catch (err) {
                throw new ProsopoEnvError(err);
            }
        }

        if (contractAddress === undefined) {

            ({contractAddress} = await this.providerApi.getContractAddress());
            console.log("onLoad contract address: ", contractAddress);

        }
        console.log("Updating contract address in manager: ", contractAddress);
        if (contractAddress) {
            this.manager.update({contractAddress});
            console.log(JSON.stringify(this.manager.state))
        }

        if (this.callbacks?.onLoad) {
            this.callbacks.onLoad(ProsopoCaptchaClient.extension, contractAddress);
        }



        if (account && contractAddress) {
            console.log("Update account: ", account);
            this.manager.update({account: account});
            console.log(JSON.stringify(this.manager.state))
            await this.onAccountChange(account);
        }

    }

    public async onAccountChange(account?: TExtensionAccount) {
        console.log("onAccountChange state", this.manager.state)
        if(!this.manager.state.contractAddress){
            throw new ProsopoEnvError(`Contract address is not set`, 'onAccountChange', this.manager.state);
        }

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
            ProsopoCaptchaClient.contract = await getProsopoContract(this.manager.state.contractAddress!, this.manager.state.config['dappAccount'], account,
                getWsProvider(this.manager.state.config['dappUrl']));
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

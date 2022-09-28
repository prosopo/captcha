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
import { web3Enable, web3FromSource, web3Accounts } from "@polkadot/extension-dapp";
import { InjectedAccountWithMeta, InjectedExtension } from "@polkadot/extension-inject/types"
import storage from "../modules/storage";
import { IExtensionInterface } from "../types/client";
import AsyncFactory from "./AsyncFactory";
import {ProsopoEnvError} from "@prosopo/contract";


export class ExtensionWeb3 extends AsyncFactory implements IExtensionInterface {

    private extension: InjectedExtension;
    private account: InjectedAccountWithMeta | undefined;
    private accounts: InjectedAccountWithMeta[];
    private injectedExtensions: InjectedExtension[];

    public async init() {
        await this.checkExtension();
        await this.setAccounts();
        await this.setExtension();
        return this;
    }

    public async checkExtension() {
        try {
            this.injectedExtensions = await web3Enable('Prosopo');
        } catch (err) {
            throw new ProsopoEnvError(err);
        }
        if (!this.injectedExtensions.length) {
            throw new ProsopoEnvError("WIDGET.NO_EXTENSION_FOUND");
        }
    }

    public getExtension() {
        return this.extension;
    }

    private async setExtension() {
        try {
            // https://polkadot.js.org/docs/extension/cookbook/
            this.extension = await web3FromSource(this.accounts[0].meta.source);
        } catch (err) {
            throw new ProsopoEnvError(err);
        }
        if (!this.extension) {
            throw new ProsopoEnvError("WIDGET.EXTENSION_NOT_FOUND");
        }
    }

    public getAccounts() {
        return this.accounts;
    }

    private async setAccounts() {
        try {
            this.accounts = await web3Accounts();
        } catch (err) {
            throw new ProsopoEnvError(err);
        }
        this.setDefaultAccount();
    }

    public getAccount() {
        return this.account;
    }

    public setAccount(address: string) {
        if (!this.accounts.length) {
            throw new ProsopoEnvError("WIDGET.NO_ACCOUNTS_FOUND");
        }
        const account = this.accounts.find(acc => acc.address === address);
        if (!account) {
            throw new ProsopoEnvError("WIDGET.ACCOUNT_NOT_FOUND");
        }
        this.account = account;
        storage.setAccount(account.address);
    }

    public unsetAccount() {
        this.account = undefined;
        storage.setAccount("");
    }

    public getDefaultAccount() {
        const defaultAccount = storage.getAccount();
        return this.accounts.find(acc => acc.address === defaultAccount);
    }

    public setDefaultAccount() {
        const defaultAccount = storage.getAccount();
        if (defaultAccount) {
            this.setAccount(defaultAccount);
        }
    }

    public async createAccount() {
        return undefined
    }


    // public async signRaw(raw: SignerPayloadRaw) {
    //     if (!this.extension.signer) {
    //         throw new ProsopoEnvError("No signer found");
    //     }
    //     return this.extension.signer?.signRaw!({ ...raw, address: this.account!.address });
    // }

}

export default ExtensionWeb3;

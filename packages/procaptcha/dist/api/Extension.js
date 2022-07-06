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
import storage from "../modules/storage";
import AsyncFactory from "./AsyncFactory";
export class Extension extends AsyncFactory {
    extension;
    account;
    accounts;
    injectedExtensions;
    async init() {
        await this.checkExtension();
        await this.setAccounts();
        await this.setExtension();
        return this;
    }
    async checkExtension() {
        try {
            this.injectedExtensions = await web3Enable('Prosopo');
        }
        catch (err) {
            throw new Error(err);
        }
        if (!this.injectedExtensions.length) {
            throw new Error("No extension found");
        }
    }
    getExtension() {
        return this.extension;
    }
    async setExtension() {
        try {
            // https://polkadot.js.org/docs/extension/cookbook/
            this.extension = await web3FromSource(this.accounts[0].meta.source);
        }
        catch (err) {
            throw new Error(err);
        }
        if (!this.extension) {
            throw new Error("Extension not found");
        }
    }
    getAccounts() {
        return this.accounts;
    }
    async setAccounts() {
        try {
            this.accounts = await web3Accounts();
        }
        catch (err) {
            throw new Error(err);
        }
        this.setDefaultAccount();
    }
    getAccount() {
        return this.account;
    }
    setAccount(address) {
        if (!this.accounts.length) {
            throw new Error("No accounts found");
        }
        const account = this.accounts.find(acc => acc.address === address);
        if (!account) {
            throw new Error("Account not found");
        }
        this.account = account;
        storage.setAccount(account.address);
    }
    unsetAccount() {
        this.account = undefined;
        storage.setAccount("");
    }
    getDefaultAccount() {
        const defaultAccount = storage.getAccount();
        return this.accounts.find(acc => acc.address === defaultAccount);
    }
    setDefaultAccount() {
        const defaultAccount = storage.getAccount();
        if (defaultAccount) {
            this.setAccount(defaultAccount);
        }
    }
}
export default Extension;
//# sourceMappingURL=Extension.js.map
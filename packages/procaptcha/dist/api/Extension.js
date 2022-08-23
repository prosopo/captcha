"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Extension = void 0;
const tslib_1 = require("tslib");
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
const extension_dapp_1 = require("@polkadot/extension-dapp");
const storage_1 = tslib_1.__importDefault(require("../modules/storage"));
const AsyncFactory_1 = tslib_1.__importDefault(require("./AsyncFactory"));
class Extension extends AsyncFactory_1.default {
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
            this.injectedExtensions = await (0, extension_dapp_1.web3Enable)('Prosopo');
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
            this.extension = await (0, extension_dapp_1.web3FromSource)(this.accounts[0].meta.source);
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
            this.accounts = await (0, extension_dapp_1.web3Accounts)();
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
        storage_1.default.setAccount(account.address);
    }
    unsetAccount() {
        this.account = undefined;
        storage_1.default.setAccount("");
    }
    getDefaultAccount() {
        const defaultAccount = storage_1.default.getAccount();
        return this.accounts.find(acc => acc.address === defaultAccount);
    }
    setDefaultAccount() {
        const defaultAccount = storage_1.default.getAccount();
        if (defaultAccount) {
            this.setAccount(defaultAccount);
        }
    }
}
exports.Extension = Extension;
exports.default = Extension;
//# sourceMappingURL=Extension.js.map
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
import { web3Enable, web3FromSource, web3Accounts, web3FromAddress } from "@polkadot/extension-dapp";
import { InjectedAccountWithMeta, InjectedExtension } from "@polkadot/extension-inject/types"
import storage from "../modules/storage";
import { IExtensionInterface } from "../types/client";
import AsyncFactory from "./AsyncFactory";
import {ProsopoEnvError} from "@prosopo/contract";

/**
 * Class to discover web3 accounts from browser extensions
 */
export class ExtensionWeb3 extends AsyncFactory implements IExtensionInterface {

    // the extension for the currently selected account, if any
    private extension?: InjectedExtension;
    // the currently selected account, if any
    private account: InjectedAccountWithMeta | undefined;
    // the discovered accounts
    private accounts: InjectedAccountWithMeta[];
    // the discovered extensions
    private injectedExtensions: InjectedExtension[];

    public async init() {
        await this.checkExtension();
        await this.setAccounts();
        await this.setExtension();
        return this;
    }

    public async checkExtension() {
        // enables extension discovery - must be called before anything else to do with web3 accounts!
        this.injectedExtensions = await web3Enable('Prosopo');
    }

    /**
     * Get the extension for the selected account.
     * @returns the extension holding the selected account. Undefined if no account selected.
     */
    public getExtension() {
        return this.extension;
    }

    /**
     * Set the extension for the selected account.
     */
    private async setExtension() {
        // if account is selected
        if(this.account) {
            // then there will be an extension providing said account
            this.extension = await web3FromAddress(this.account.address);
        } else {
            // no account selected, so set extension to undefined
            this.extension = undefined;
        }
    }

    /**
     * Get all accounts across all extensions.
     * @returns all accounts across all extensions.
     */
    public getAccounts() {
        return this.accounts;
    }

    /**
     * Discover accounts across all extensions.
     */
    private async setAccounts() {
        this.accounts = await web3Accounts();
        // get the last used account address from storage
        const lastUsedAccountAddress = storage.getAccount();
        // lookup this account in the discovered accounts
        const account = this.accounts.find(acc => acc.address === lastUsedAccountAddress);
        // if found then set it
        if(account) {
            this.account = account;
        } else {
            this.account = undefined;
        }
    }

    /**
     * Get the selected account.
     * @returns the selected account.
     */
    public getAccount() {
        return this.account;
    }

    /**
     * Set the selected account.
     * @param address the address of the account to be selected.
     */
    public setAccount(address: string) {
        if(!this.accounts.length) {
            throw new ProsopoEnvError(`Cannot set account for address ${address}, no accounts found`)
        }
        const account = this.accounts.find(acc => acc.address === address);
        if (!account) {
            throw new ProsopoEnvError(`Account ${address} not found in ${this.accounts}`);
        }
        this.account = account;
        storage.setAccount(account.address);
    }

    public unsetAccount() {
        this.account = undefined;
        // update the last used account to empty
        storage.setAccount("");
    }

    /**
     * Get the last used account via the address held in local storage.
     * @returns the account associated with the address held in storage.
     */
    public getDefaultAccount() {
        const defaultAccount = storage.getAccount();
        return this.accounts.find(acc => acc.address === defaultAccount);
    }

    /**
     * Select the account using the last used account address held in local storage.
     */
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

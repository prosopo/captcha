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
    InjectedAccounts,
    InjectedAccountWithMeta,
    InjectedExtension,
    InjectedMetadata, InjectedProvider
} from "@polkadot/extension-inject/types"
import storage from "../modules/storage";
import {IExtensionInterface} from "../types/client";
import AsyncFactory from "./AsyncFactory";
import {ProsopoEnvError} from "@prosopo/contract";
import {AccountCreator} from "./AccountCreator";
import {WsProvider} from "@polkadot/rpc-provider";
import Signer from "@polkadot/extension-base/page/Signer";
import {
    MessageTypesWithNullRequest,
} from "@polkadot/extension-base/background/types";

export class ExtensionWeb2 extends AsyncFactory implements IExtensionInterface {

    private extension?: InjectedExtension;
    private account: InjectedAccountWithMeta | undefined;
    private accounts: InjectedAccountWithMeta[];

    protected wsProvider: WsProvider

    public async init(wsProvider: WsProvider) {
        await this.setExtension();
        this.wsProvider = wsProvider;
        return this;
    }

    public async checkExtension() {
        return
    }

    public getExtension() {
        return this.extension;
    }

    private async setExtension() {
        /*
        InjectedAccounts
        get: (anyType?: boolean) => Promise<InjectedAccount[]>;
        subscribe: (cb: (accounts: InjectedAccount[]) => void | Promise<void>) => Unsubcall;
         */
        const injectedAccounts = {
            get: () => Promise.resolve([]), subscribe: () => () => {
            }
        }

        async function sendMessage<TMessageType extends MessageTypesWithNullRequest, TResponse>(message: TMessageType): Promise<void> {
            return new Promise<void>((resolve, reject) => {

                resolve();

            });
        }

        await sendMessage('pub(authorize.tab)' as MessageTypesWithNullRequest);
        const signer = new Signer(sendMessage)
        this.extension = {
            name: "polkadot-js-web2",
            version: "procaptcha",
            accounts: injectedAccounts,
            signer: signer,
        }
        return
    }

    public getAccounts() {
        return this.accounts;
    }

    private async setAccounts(accounts: InjectedAccountWithMeta[]) {
        try {
            this.accounts = accounts;
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
            throw new ProsopoEnvError("No accounts found");
        }

        const account = this.accounts.find(acc => acc.address === address);
        if (!account) {
            throw new ProsopoEnvError("Account not found");
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
        const accountCreator = await AccountCreator.create(this.wsProvider);
        const storedAccount = storage.getAccount();
        const account = await accountCreator.createAccount(undefined, storedAccount)
        await this.setAccounts([account])
        this.setAccount(account.address)
        return account
    }

}

export default ExtensionWeb2;

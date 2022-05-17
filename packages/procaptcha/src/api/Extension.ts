import { web3Enable, web3FromSource, web3Accounts } from "@polkadot/extension-dapp";
import { InjectedAccountWithMeta, InjectedExtension } from "@polkadot/extension-inject/types"
import { SignerPayloadRaw } from "@polkadot/types/types";
import storage from "../modules/storage";
import { IExtensionInterface } from "../types/client";
import AsyncFactory from "./AsyncFactory";


export class Extension extends AsyncFactory implements IExtensionInterface {

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
            throw new Error(err);
        }
        if (!this.injectedExtensions.length) {
            throw new Error("No extension found");
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
            throw new Error(err);
        }
        if (!this.extension) {
            throw new Error("Extension not found");
        }
    }

    public getAccounts() {
        return this.accounts;
    }

    private async setAccounts() {
        try {
            this.accounts = await web3Accounts();
        } catch (err) {
            throw new Error(err);
        }
        this.setDefaultAccount();
    }

    public getAccount() {
        return this.account;
    }

    public setAccount(address: string) {
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

    // public async signRaw(raw: SignerPayloadRaw) {
    //     if (!this.extension.signer) {
    //         throw new Error("No signer found");
    //     }
    //     return this.extension.signer?.signRaw!({ ...raw, address: this.account!.address });
    // }

}

export default Extension;

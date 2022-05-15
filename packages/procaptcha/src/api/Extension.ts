import { web3Enable, web3FromSource, web3Accounts } from "@polkadot/extension-dapp";
import { InjectedAccountWithMeta, InjectedExtension } from "@polkadot/extension-inject/types"
import { SignerPayloadRaw } from "@polkadot/types/types";
import storage from "../modules/storage";
import AsyncFactory from "./AsyncFactory";


export type NoExtensionCallback = () => void | Promise<void>;

export class Extension extends AsyncFactory {

    private account: InjectedAccountWithMeta;
    private injectedAccounts: InjectedAccountWithMeta[];
    private injectedExtension: InjectedExtension;

    public async init() {
        await this.checkExtension();
        await this.setInjectedAccounts();
        await this.setInjectedExtension();
        return this;
    }

    public async checkExtension() {
        let injectedExtensions: InjectedExtension[];
        try {
            injectedExtensions = await web3Enable('Prosopo');
        } catch (err) {
            throw new Error(err);
        }
        if (!injectedExtensions.length) {
            throw new Error("No extension found");
        }
    }

    public getInjectedExtension() {
        return this.injectedExtension;
    }

    private async setInjectedExtension() {
        try {
            this.injectedExtension = await web3FromSource(this.account.meta.source);
        } catch (err) {
            throw new Error(err);
        }
        if (!this.injectedExtension) {
            throw new Error("Extension not found");
        }
    }

    public getInjectedAcounts() {
        return this.injectedAccounts;
    }

    private async setInjectedAccounts() {
        try {
            this.injectedAccounts = await web3Accounts();
        } catch (err) {
            throw new Error(err);
        }
        this.setDefaultAccount();
    }

    public getAccount() {
        return this.account;
    }

    public setAccount(address: string) {
        if (!this.injectedAccounts.length) {
            throw new Error("No accounts found");
        }
        const account = this.injectedAccounts.find(acc => acc.address === address);
        if (!account) {
            throw new Error("Account not found");
        }
        this.account = account;
        storage.setAccount(account.address);
    }

    private setDefaultAccount() {
        this.setAccount(storage.getAccount() || this.injectedAccounts[0]?.address);
    }

    public async signRaw(raw: SignerPayloadRaw) {
        if (!this.injectedExtension.signer) {
            throw new Error("No signer found");
        }
        return this.injectedExtension.signer.signRaw!({ ...raw, address: this.account.address });
    }

}

export default Extension;

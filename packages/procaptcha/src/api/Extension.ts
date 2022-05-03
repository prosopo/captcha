import {
    web3Enable,
    web3FromSource,
    web3Accounts,
} from "@polkadot/extension-dapp";
import { InjectedAccountWithMeta, InjectedExtension } from "@polkadot/extension-inject/types"
import { SignerPayloadRaw } from "@polkadot/types/types";
import storage from "../modules/storage";
import AsyncFactory from "./AsyncFactory";

/**
 * type for callback when no extension was found
 */
export type NoExtensionCallback = () => void | Promise<void>;

class Extension extends AsyncFactory {

    private account: InjectedAccountWithMeta;
    private injected: InjectedExtension;
    private allAccounts: InjectedAccountWithMeta[];

    /**
     * @param noExtCb - callback when no extension was found
     */
    public async init(noExtCb?: NoExtensionCallback) {
        await this.checkExtensions(noExtCb || (() => { }));
        this.allAccounts = await web3Accounts();
        await this._loadAccount();
        console.log(this.account)
        this.injected = await web3FromSource(this.account.meta.source);
        return this;
    }

    public async checkExtensions(cb: NoExtensionCallback, compatInits?: (() => Promise<boolean>)[]) {
        // this call fires up the authorization popup
        const extensions = await web3Enable('Prosopo', compatInits);

        if (extensions.length === 0) {
            // no extension installed, or the user did not accept the authorization
            // in this case we should inform the use and give a link to the extension
            await cb();
            return;
        }
    }

    private async _loadAccount() {
        const defaultAccount = storage.getAccount();

        const account = this.allAccounts.find(acc => acc.address === defaultAccount)

        return this.account = account || this.allAccounts[0];
    }

    public async loadAccount() {
        return this._loadAccount();
    }

    public async setAccount(address: string): Promise<InjectedAccountWithMeta> {
        const account = this.allAccounts.find(acc => acc.address === address);
        if (!account) {
            throw new Error("Account doesn't exist")
        }
        storage.setAccount(address);
        return this.account = account;
    }

    public getAccount() {
        return this.account;
    }

    public getAllAcounts() {
        return this.allAccounts;
    }

    public getInjected() {
        return this.injected;
    }

    public async signRaw(raw: Omit<SignerPayloadRaw, "address">) {
        return (this.injected.signer && this.injected.signer.signRaw && this.injected.signer.signRaw({
            address: this.account.address,
            ...raw
        }))
    }
}

export default Extension;

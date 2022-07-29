import { InjectedAccountWithMeta, InjectedExtension } from "@polkadot/extension-inject/types";
import { IExtensionInterface } from "../types/client";
import AsyncFactory from "./AsyncFactory";
export declare class Extension extends AsyncFactory implements IExtensionInterface {
    private extension;
    private account;
    private accounts;
    private injectedExtensions;
    init(): Promise<this>;
    checkExtension(): Promise<void>;
    getExtension(): InjectedExtension;
    private setExtension;
    getAccounts(): InjectedAccountWithMeta[];
    private setAccounts;
    getAccount(): InjectedAccountWithMeta | undefined;
    setAccount(address: string): void;
    unsetAccount(): void;
    getDefaultAccount(): InjectedAccountWithMeta | undefined;
    setDefaultAccount(): void;
}
export default Extension;
//# sourceMappingURL=Extension.d.ts.map
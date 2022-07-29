import { KeyringPair as PolkadotKeyringPair } from "@polkadot/keyring/types";
import { Signer as PolkadotSigner } from "@polkadot/api/types";
export interface LocalKeyringPair extends PolkadotKeyringPair {
    suri?: string;
}
export declare type IAccountSigner = PolkadotSigner;
export interface Signer extends PolkadotSigner {
    addPair: (pair: LocalKeyringPair) => void;
    accountSigner: IAccountSigner;
    address: string;
    pair: LocalKeyringPair;
}
export declare type NetworkAccountsUserConfig = string[];
//# sourceMappingURL=signer.d.ts.map
import {KeyringPair as PolkadotKeyringPair} from "@polkadot/keyring/types";
import {Signer as PolkadotSigner} from "@polkadot/api/types";
import {Signer as AccountSigner} from "../signer/account-signer";

export interface LocalKeyringPair extends PolkadotKeyringPair {
    suri?: string;
}

export interface Signer extends PolkadotSigner {
    address: string;
    accountSigner: AccountSigner;
    pair: LocalKeyringPair;
}

export type NetworkAccountsUserConfig = string[]

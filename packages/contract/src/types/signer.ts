import {KeyringPair as PolkadotKeyringPair} from "@polkadot/keyring/types";
import {Signer as PolkadotSigner} from "@polkadot/api/types";
// import { LocalKeyringPair } from "../signer/signer";

export interface LocalKeyringPair extends PolkadotKeyringPair {
    suri?: string;
}


export interface IAccountSigner extends PolkadotSigner {

}

export interface Signer extends PolkadotSigner {
    addPair: (pair: LocalKeyringPair) => void;
    accountSigner: IAccountSigner;
    address: string;
    pair: LocalKeyringPair;
}

export type NetworkAccountsUserConfig = string[];

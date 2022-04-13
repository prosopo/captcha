import {WsProvider} from "@polkadot/rpc-provider/ws";
import {ApiPromise} from "@polkadot/api";
import {Registry} from "@polkadot/types/types";
import {KeyringInstance, KeyringPair} from "@polkadot/keyring/types";
import {NetworkAccountsUserConfig} from "./signer";
import BN from "bn.js";
import {Signer} from "../signer/account-signer";

export interface Network {
    provider: WsProvider
    api: ApiPromise
    registry: Registry
    keyring: KeyringInstance,
    keyringPair: KeyringPair
    signer: Signer
}

export interface NetworkUserConfig {
    endpoint?: string;
    httpHeaders?: Record<string, string>;
    accounts?: NetworkAccountsUserConfig;
    gasLimit?: string | number | BN;
    from?: string;
}

// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of contract <https://github.com/prosopo/contract>.
//
// contract is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// contract is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with contract. If not, see <http://www.gnu.org/licenses/>.
import BN from "bn.js";
import {WsProvider} from "@polkadot/rpc-provider/ws";
import {ApiPromise} from "@polkadot/api";
import {Registry} from "@polkadot/types/types";
import {KeyringInstance, KeyringPair} from "@polkadot/keyring/types";
import {NetworkAccountsUserConfig, Signer} from "./signer";
import {AccountSigner} from "../signer/accountsigner";

export interface Network {
    provider: WsProvider
    api: ApiPromise
    registry: Registry
    keyring: KeyringInstance,
    keyringPair: KeyringPair
    signer: AccountSigner
}

export interface NetworkUserConfig {
    endpoint?: string;
    httpHeaders?: Record<string, string>;
    accounts?: NetworkAccountsUserConfig;
    gasLimit?: string | number | BN;
    from?: string;
}

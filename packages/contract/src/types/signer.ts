// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of contract <https://github.com/prosopo-io/contract>.
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
import {KeyringPair as PolkadotKeyringPair} from "@polkadot/keyring/types";
import {Signer as PolkadotSigner} from "@polkadot/api/types";
// import { LocalKeyringPair } from "../signer/signer";

export interface LocalKeyringPair extends PolkadotKeyringPair {
    suri?: string;
}


export type IAccountSigner = PolkadotSigner

export interface Signer extends PolkadotSigner {
    addPair: (pair: LocalKeyringPair) => void;
    accountSigner: IAccountSigner;
    address: string;
    pair: LocalKeyringPair;
}

export type NetworkAccountsUserConfig = string[];

// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of procaptcha <https://github.com/prosopo-io/procaptcha>.
//
// procaptcha is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// procaptcha is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with procaptcha.  If not, see <http://www.gnu.org/licenses/>.
import {ApiPromise} from "@polkadot/api";
import {InjectedAccountWithMeta} from "@polkadot/extension-inject/types";
import AsyncFactory from "./AsyncFactory";
import {decodeAddress, encodeAddress, Keyring} from "@polkadot/keyring";
import {KeyringPair} from "@polkadot/keyring/types";
import {cryptoWaitReady, mnemonicGenerate} from "@polkadot/util-crypto";
import { ProviderInterface } from "@polkadot/rpc-provider/types";

export class AccountCreator extends AsyncFactory {

    protected api: ApiPromise;

    /**
     * @param providerInterface
     */
    public async init(providerInterface: ProviderInterface) {
        this.api = await ApiPromise.create({provider: providerInterface});
        return this;
    }

    public async generateMnemonic(keyring: Keyring): Promise<KeyringPair> {
        await cryptoWaitReady();
        const mnemonic = mnemonicGenerate();
        return keyring.addFromMnemonic(mnemonic)
    }

    public async createAccount(keyring?: Keyring, address?: string): Promise<InjectedAccountWithMeta> {
        const source = 'procaptcha';

        if (!keyring) {
            keyring = new Keyring({type: 'sr25519', ss58Format: this.api.registry.chainSS58});
        }


        if (address) {
            return {address: address, meta: {source, name: address}}
        } else {
            const account = await this.generateMnemonic(keyring);
            return {
                address: account.address.length === 42
                    ? account.address
                    : encodeAddress(decodeAddress(account.address), this.api.registry.chainSS58),
                meta: {source, name: account.address},
            }
        }


    }

}

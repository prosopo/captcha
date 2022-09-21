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
import {ProviderInterface} from "@polkadot/rpc-provider/types";
import FingerprintJS from '@fingerprintjs/fingerprintjs'
import {entropyToMnemonic} from "@polkadot/util-crypto/mnemonic/bip39";
import {stringToU8a} from "@polkadot/util";
import {picassoCanvas} from "../modules/canvas";

export class AccountCreator extends AsyncFactory {

    protected api: ApiPromise;

    /**
     * @param providerInterface
     */
    public async init(providerInterface: ProviderInterface) {
        this.api = await ApiPromise.create({provider: providerInterface});
        return this;
    }

    public async generateMnemonic(keyring: Keyring, entropy?: string): Promise<KeyringPair> {
        await cryptoWaitReady();
        const mnemonic = mnemonicGenerate();
        return keyring.addFromMnemonic(mnemonic)
    }

    public async createAccount(keyring?: Keyring, address?: string): Promise<InjectedAccountWithMeta> {
        const source = 'procaptcha';
        const area = {width: 300, height: 300};
        const offsetParameter = 2001000001
        const multiplier = 15000
        const fontSizeFactor = 1.5
        const maxShadowBlur = 50
        const numberOfRounds = 5
        const seed = 42
        const params = {area, offsetParameter, multiplier, fontSizeFactor, maxShadowBlur}
        //const entropy = await this.getFingerprint();
        const entropy = picassoCanvas(numberOfRounds, seed, params);
        console.log("entropy", entropy);
        const u8Entropy = stringToU8a(entropy);
        const mnemonic = entropyToMnemonic(u8Entropy);

        if (!keyring) {
            keyring = new Keyring({type: 'sr25519', ss58Format: this.api.registry.chainSS58});
        }

        await cryptoWaitReady()
        if (address) {
            return {address: address, meta: {source, name: address}}
        } else {
            const account = keyring?.addFromMnemonic(mnemonic);
            return {
                address: account.address.length === 42
                    ? account.address
                    : encodeAddress(decodeAddress(account.address), this.api.registry.chainSS58),
                meta: {source, name: account.address},
            }
        }


    }

    public async getFingerprint(): Promise<string> {
        // Initialize an agent at application startup.
        const fpPromise = FingerprintJS.load()
        // Get the visitor identifier when you need it.
        const fp = await fpPromise
        const result = await fp.get()
        console.log(result);
        return result.visitorId
    }
}



// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of procaptcha <https://github.com/prosopo/procaptcha>.
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
import FingerprintJS, {componentsToDebugString, hashComponents} from '@fingerprintjs/fingerprintjs'
import {entropyToMnemonic} from "@polkadot/util-crypto/mnemonic/bip39";
import {stringToU8a} from "@polkadot/util";
import {picassoCanvas} from "../modules/canvas";
import {AccountCreatorConfig} from "../types/index";
import {hexHash} from "@prosopo/datasets";

export class AccountCreator extends AsyncFactory {

    protected api: ApiPromise;
    protected config: AccountCreatorConfig;
    protected source: string;

    /**
     * @param providerInterface
     * @param config
     */
    public async init(providerInterface: ProviderInterface, config: AccountCreatorConfig, source: string) {
        this.api = await ApiPromise.create({provider: providerInterface});
        this.source = source;
        this.config = config;
        return this;
    }

    public async generateMnemonic(keyring: Keyring, entropy?: string): Promise<KeyringPair> {
        await cryptoWaitReady();
        const mnemonic = mnemonicGenerate();
        return keyring.addFromMnemonic(mnemonic)
    }

    public async createAccount(keyring?: Keyring, address?: string): Promise<InjectedAccountWithMeta> {
        const params = {
            area: this.config.area,
            offsetParameter: this.config.offsetParameter,
            multiplier: this.config.multiplier,
            fontSizeFactor: this.config.fontSizeFactor,
            maxShadowBlur: this.config.maxShadowBlur
        }

        const browserEntropy = await this.getFingerprint();
        const canvasEntropy = picassoCanvas(this.config.numberOfRounds, this.config.seed, params);
        const entropy = hexHash([canvasEntropy , browserEntropy].join(""), 128).slice(2);
        console.log("canvas entropy", canvasEntropy)
        console.log("browserEntropy", browserEntropy)
        console.log("entropy", entropy)
        const u8Entropy = stringToU8a(entropy);
        const mnemonic = entropyToMnemonic(u8Entropy);

        if (!keyring) {
            keyring = new Keyring({type: 'sr25519', ss58Format: this.api.registry.chainSS58});
        }

        await cryptoWaitReady()
        if (address) {
            return {address: address, meta: {source: this.source, name: address}}
        } else {
            const account = keyring?.addFromMnemonic(mnemonic);
            return {
                address: account.address.length === 42
                    ? account.address
                    : encodeAddress(decodeAddress(account.address), this.api.registry.chainSS58),
                meta: {source: this.source, name: account.address},
            }
        }


    }

    public async getFingerprint(): Promise<string> {
        // Initialize an agent at application startup.
        const fpPromise = FingerprintJS.load()
        // Get the visitor identifier when you need it.
        const fp = await fpPromise
        const result = await fp.get()
        // strip out the components that change in incognito mode
        const {screenFrame, ...componentsReduced} = result.components
        return hashComponents(componentsReduced)
    }
}



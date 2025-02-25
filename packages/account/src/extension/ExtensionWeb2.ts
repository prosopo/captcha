// Copyright 2021-2025 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import type { InjectedAccount } from "@polkadot/extension-inject/types";
import type { InjectedExtension } from "@polkadot/extension-inject/types";
import type { KeyringPair } from "@polkadot/keyring/types";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import type { KeypairType } from "@polkadot/util-crypto/types";
import { stringToU8a } from "@polkadot/util/string";
import { u8aToHex } from "@polkadot/util/u8a";
import { hexHash } from "@prosopo/common";
import { getFingerprint } from "@prosopo/fingerprint";
import type { Account, ProcaptchaClientConfigOutput } from "@prosopo/types";
import { version } from "@prosopo/util";
import { Extension } from "./Extension.js";

const SignerLoader = async () =>
	(await import("@polkadot/extension-base/page/Signer")).default;
const KeyringLoader = async () => (await import("@polkadot/keyring")).Keyring;
const EntropyToMnemonicLoader = async () =>
	(await import("@polkadot/util-crypto/mnemonic/bip39")).entropyToMnemonic;

type AccountWithKeyPair = InjectedAccount & { keypair: KeyringPair };

/**
 * Class for interfacing with web3 accounts.
 */
export class ExtensionWeb2 extends Extension {
	public async getAccount(
		config: ProcaptchaClientConfigOutput,
	): Promise<Account> {
		const account = await this.createAccount(config);
		const extension: InjectedExtension = await this.createExtension(account);

		return {
			account,
			extension,
		};
	}

	private async createExtension(
		account: AccountWithKeyPair,
	): Promise<InjectedExtension> {
		const Signer = await SignerLoader();
		const signer = new Signer(async () => {
			return;
		});

		// signing carried out by the keypair. Signs the data with the private key, creating a signature. Other people can verify this signature given the message and the public key, proving that the message was indeed signed by account and proving ownership of the account.
		signer.signRaw = async (payload) => {
			const signature = account.keypair.sign(payload.data);
			return {
				id: 1, // the id of the request to sign. This should be incremented each time and adjust the signature, but we're hacking around this. Hence the signature will always be the same given the same payload.
				signature: u8aToHex(signature),
			};
		};

		return {
			accounts: {
				get: async () => {
					// there is only ever 1 account
					return [account];
				},
				subscribe: () => {
					// do nothing, there will never be account changes
					return () => {
						return;
					};
				},
			},
			name: "procaptcha-web2",
			version,
			signer,
		};
	}

	private async createAccount(
		config: ProcaptchaClientConfigOutput,
	): Promise<AccountWithKeyPair> {
		await cryptoWaitReady();
		const Keyring = await KeyringLoader();
		const browserEntropy = await getFingerprint();
		const entropy = hexHash(browserEntropy, 128).slice(2);
		const u8Entropy = stringToU8a(entropy);
		const entropyToMnemonic = await EntropyToMnemonicLoader();
		const mnemonic = entropyToMnemonic(u8Entropy);
		const type: KeypairType = "sr25519";
		const keyring = new Keyring({
			type,
		});
		const keypair = keyring.addFromMnemonic(mnemonic);
		const address = keypair.address;
		return {
			address,
			name: address,
			keypair,
		};
	}
}

// Copyright 2021-2026 Prosopo (UK) Ltd.
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

import Signer from "@polkadot/extension-base/page/Signer";
import type { InjectedAccount } from "@polkadot/extension-inject/types";
import type { InjectedExtension } from "@polkadot/extension-inject/types";
import { stringToU8a } from "@polkadot/util";
import { getFingerprint, prefetchFingerprint } from "@prosopo/fingerprint";
import { Keyring } from "@prosopo/keyring";
import type { KeyringPair } from "@prosopo/types";
import type { Account, ProcaptchaClientConfigOutput } from "@prosopo/types";
import { u8aToHex, version } from "@prosopo/util";
import { hexHash } from "@prosopo/util-crypto";
import type { KeypairType } from "@prosopo/util-crypto";
import { getCryptoWorkerManager } from "../workers/CryptoWorkerManager.js";
import { Extension } from "./Extension.js";

prefetchFingerprint();
getCryptoWorkerManager().prewarm();

const EntropyToMnemonicLoader = async () =>
	(await import("@prosopo/util-crypto")).entropyToMnemonic;

type AccountWithKeyPair = InjectedAccount & { keypair: KeyringPair };

/**
 * Class for interfacing with web3 accounts.
 */
export class ExtensionWeb2 extends Extension {
	public async getAccount(
		config: ProcaptchaClientConfigOutput,
	): Promise<Account> {
		const account = await this.createAccount(config);
		const extension: InjectedExtension = this.createExtension(account);

		return {
			account,
			extension,
		};
	}

	private createExtension(account: AccountWithKeyPair): InjectedExtension {
		const signer = new Signer(async () => {
			return;
		});

		// signing carried out by the keypair. Signs the data with the private key, creating a signature. Other people can verify this signature given the message and the public key, proving that the message was indeed signed by account and proving ownership of the account.
		signer.signRaw = async (payload) => {
			const signature = account.keypair.sign(payload.data);
			return {
				id: 1, // the id of the request to sign. This should be incremented each time and adjust the signature, but we're hacking around this. Hence the signature will always be the same given the same payload.
				signature: u8aToHex(signature) as `0x${string}`,
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
		const browserEntropy = await getFingerprint();

		// hash the entropy and remove 0x
		const entropy = hexHash(browserEntropy, 128).slice(2);

		const u8Entropy = stringToU8a(entropy);

		const type: KeypairType = "sr25519";
		const keyring = new Keyring({ type });
		const workerManager = getCryptoWorkerManager();

		// Two paths, in order of preference:
		//
		// 1. Worker path: entropy → mnemonic → sr25519 keypair in ONE fused
		//    worker round-trip. sr25519 derivation is a ~500ms scalar-mul
		//    on mid-tier hardware and was the biggest main-thread cost in
		//    the frictionless critical path pre-worker. Doing it in the
		//    worker lets it overlap with BotScoreWorker and main-thread
		//    detectors. We wrap the raw keypair bytes on main via
		//    `addFromPair` (cheap packaging — no ECC work).
		//
		// 2. Fallback path (worker refused to boot / CSP): synchronous
		//    derivation on main thread. Preserves behaviour for browsers
		//    that block workers.
		try {
			const { publicKey, secretKey } =
				await workerManager.entropyToKeypair(u8Entropy);
			const keypair = keyring.addFromPair({ publicKey, secretKey }, {}, type);
			const address = keypair.address;
			return { address, name: address, keypair };
		} catch (workerError) {
			const entropyToMnemonic = await EntropyToMnemonicLoader();
			const mnemonic = entropyToMnemonic(u8Entropy);
			const keypair = keyring.addFromMnemonic(mnemonic);
			const address = keypair.address;
			return { address, name: address, keypair };
		}
	}
}

export default ExtensionWeb2;

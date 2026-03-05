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

import type { InjectedAccount } from "@polkadot/extension-inject/types";
import type { InjectedExtension } from "@polkadot/extension-inject/types";
import { stringToU8a } from "@polkadot/util";
import { CaptchaMerkleTree } from "@prosopo/datasets";
import { getFingerprint } from "@prosopo/fingerprint";
import { Keyring } from "@prosopo/keyring";
import type {
	FingerprintLeafProof,
	FingerprintMerkleState,
	KeyringPair,
} from "@prosopo/types";
import { FINGERPRINT_SOURCE_NAMES } from "@prosopo/types";
import type { Account, ProcaptchaClientConfigOutput } from "@prosopo/types";
import { u8aToHex, version } from "@prosopo/util";
import { hexHash } from "@prosopo/util-crypto";
import type { KeypairType } from "@prosopo/util-crypto";
import { getCryptoWorkerManager } from "../workers/CryptoWorkerManager.js";
import { Extension } from "./Extension.js";

const SignerLoader = async () =>
	(await import("@polkadot/extension-base/page/Signer")).default;
const EntropyToMnemonicLoader = async () =>
	(await import("@prosopo/util-crypto")).entropyToMnemonic;

type AccountWithKeyPair = InjectedAccount & { keypair: KeyringPair };

/**
 * Class for interfacing with web3 accounts.
 */
export class ExtensionWeb2 extends Extension {
	private merkleState: FingerprintMerkleState | undefined;
	private merkleTree: CaptchaMerkleTree | undefined;

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

	/**
	 * Returns the fingerprint Merkle state after account creation.
	 * This is used to attach to FrictionlessState for proof generation.
	 */
	public getFingerprintMerkleState(): FingerprintMerkleState | undefined {
		return this.merkleState;
	}

	/**
	 * Generates Merkle proofs for the requested leaf indices.
	 * Called when the provider challenges the client to prove specific fingerprint components.
	 */
	public generateFingerprintProofs(
		requestedLeaves: number[],
	): FingerprintLeafProof[] {
		if (!this.merkleTree || !this.merkleState) {
			throw new Error(
				"Fingerprint Merkle tree not initialized. Call getAccount() first.",
			);
		}

		const proofs = requestedLeaves.map((leafIndex) => {
			const leafHash = this.merkleState?.leafHashes[leafIndex];
			const componentValue = this.merkleState?.componentValues[leafIndex];
			if (leafHash === undefined || componentValue === undefined) {
				throw new Error(
					`Invalid leaf index ${leafIndex}. Must be 0-${FINGERPRINT_SOURCE_NAMES.length - 1}.`,
				);
			}
			const proof = this.merkleTree?.proof(leafHash);
			if (!proof) {
				throw new Error(
					`Failed to generate proof for leaf index ${leafIndex}.`,
				);
			}
			return {
				leafIndex,
				value: componentValue,
				proof,
			};
		});
		return proofs;
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
		const fingerprintResult = await getFingerprint();

		// Build Merkle tree from individual component hashes
		const componentValues: string[] = [];
		const leafHashes: string[] = [];

		for (const sourceName of FINGERPRINT_SOURCE_NAMES) {
			const component = fingerprintResult.components[sourceName];
			// JSON.stringify(undefined) returns undefined (not a string),
			// so we must guard against components with value: undefined
			// (e.g. osCpu on browsers where navigator.oscpu is deprecated)
			let valueStr: string;
			if (
				component &&
				"value" in component &&
				component.value !== undefined
			) {
				valueStr = JSON.stringify(component.value);
			} else {
				valueStr = "error";
			}
			componentValues.push(valueStr);
			leafHashes.push(hexHash(valueStr));
		}

		// Build the Merkle tree
		const tree = new CaptchaMerkleTree();
		tree.build(leafHashes);
		const merkleRoot = tree.getRoot().hash;

		// Store tree and state for later proof generation
		this.merkleTree = tree;
		this.merkleState = {
			merkleRoot,
			leafHashes,
			componentValues,
		};

		// Derive account from Merkle root instead of visitorId
		const entropy = hexHash(merkleRoot, 128).slice(2);

		const u8Entropy = stringToU8a(entropy);

		let mnemonic: string;

		// Try to use Web Worker for entropy-to-mnemonic conversion to avoid blocking
		try {
			const workerManager = getCryptoWorkerManager();
			mnemonic = await workerManager.entropyToMnemonic(u8Entropy);
		} catch (workerError) {
			const entropyToMnemonic = await EntropyToMnemonicLoader();
			mnemonic = entropyToMnemonic(u8Entropy);
		}

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

export default ExtensionWeb2;

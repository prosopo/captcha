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

// cryptoWorker.ts

import {
	entropyToMnemonic,
	mnemonicToMiniSecret,
	sr25519FromSeed,
} from "@prosopo/util-crypto";

interface CryptoWorkerMessage {
	taskId: string;
	task: "entropyToMnemonic" | "entropyToKeypair" | "test";
	data: {
		entropy?: Uint8Array;
	};
}

interface EntropyToKeypairResult {
	mnemonic: string;
	publicKey: Uint8Array;
	secretKey: Uint8Array;
}

interface CryptoWorkerResponse {
	taskId: string;
	result?: string | EntropyToKeypairResult;
	error?: string;
}

// The main message listener runs in the worker's global scope
self.addEventListener(
	"message",
	async (event: MessageEvent<CryptoWorkerMessage>) => {
		const { taskId, task, data } = event.data;

		try {
			let result: string | EntropyToKeypairResult;

			switch (task) {
				case "test":
					// Respond to test message to confirm worker is ready
					result = "ready";
					break;
				case "entropyToMnemonic":
					if (!data.entropy) {
						throw new Error("Entropy data is required");
					}
					result = entropyToMnemonic(data.entropy);
					break;
				case "entropyToKeypair":
					// Fused: entropy → mnemonic → sr25519 keypair in one worker
					// round-trip. Saves the postMessage transit on the frictionless
					// critical path (~30–80ms per hop on constrained hardware).
					// Called by ExtensionWeb2.createAccount when the caller doesn't
					// need the mnemonic string for any other purpose than deriving
					// the pair. sr25519 derivation is a scalar multiplication on
					// Ristretto25519 — ~500ms mid-tier, ~800ms mobile — and was the
					// single biggest main-thread cost pre-worker.
					if (!data.entropy) {
						throw new Error("Entropy data is required");
					}
					result = processEntropyToKeypair(data.entropy);
					break;
				default:
					throw new Error(`Unknown task: ${task}`);
			}

			const response: CryptoWorkerResponse = { taskId, result };
			self.postMessage(response);
		} catch (error) {
			const response: CryptoWorkerResponse = {
				taskId,
				error: error instanceof Error ? error.message : "Unknown error",
			};
			self.postMessage(response);
		}
	},
);

function processEntropyToKeypair(entropy: Uint8Array): EntropyToKeypairResult {
	const mnemonic = entropyToMnemonic(entropy);
	const seed = mnemonicToMiniSecret(mnemonic);
	const { publicKey, secretKey } = sr25519FromSeed(seed);
	return { mnemonic, publicKey, secretKey };
}

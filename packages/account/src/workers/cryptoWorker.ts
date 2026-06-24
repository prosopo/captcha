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

import { entropyToMnemonic } from "@prosopo/util-crypto";

interface CryptoWorkerMessage {
	taskId: string;
	task: "entropyToMnemonic" | "test";
	data: {
		entropy?: Uint8Array;
	};
}

interface CryptoWorkerResponse {
	taskId: string;
	result?: string;
	error?: string;
}

// The main message listener runs in the worker's global scope
self.addEventListener(
	"message",
	async (event: MessageEvent<CryptoWorkerMessage>) => {
		const { taskId, task, data } = event.data;

		try {
			let result: string;

			switch (task) {
				case "test":
					// Respond to test message to confirm worker is ready
					result = "ready";
					break;
				case "entropyToMnemonic":
					if (!data.entropy) {
						throw new Error("Entropy data is required");
					}
					result = await processEntropyToMnemonic(data.entropy);
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

// Helper function remains async for consistency, even if entropyToMnemonic is sync
async function processEntropyToMnemonic(entropy: Uint8Array): Promise<string> {
	try {
		// Convert entropy to mnemonic (Vite/Rollup ensures this import is resolved and bundled)
		return entropyToMnemonic(entropy);
	} catch (error) {
		throw new Error(
			`Failed to process entropy: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

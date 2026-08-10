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

import CryptoWorkerConstructor from "./cryptoWorker.js?worker&inline";

interface CryptoWorkerMessage {
	taskId: string;
	task: string;
	data: Record<string, string | Uint8Array>;
}

export interface KeypairBytes {
	publicKey: Uint8Array;
	secretKey: Uint8Array;
}

export interface EntropyToKeypairResult extends KeypairBytes {
	mnemonic: string;
}

type CryptoWorkerResult = string | KeypairBytes | EntropyToKeypairResult;

interface CryptoWorkerResponse {
	taskId: string;
	result?: CryptoWorkerResult;
	error?: string;
}

/**
 * Manages Web Worker for cryptographic operations to prevent blocking the main thread
 */
export class CryptoWorkerManager {
	private worker: Worker | null = null;
	private isInitializing = false;

	/**
	 * Initialize the worker. No test round-trip — construction failure throws
	 * synchronously (caught below); post-construction failures surface via
	 * `worker.onerror` (cleans up so the next call retries); anything that
	 * gets past both surfaces via `runTask`'s timeout + reject path, which
	 * already falls back to main-thread crypto. The prior `testWorker()` ping
	 * was a Blob-URL-era defensive check that no longer earns its ~30–80ms
	 * critical-path cost under Vite's `?worker&inline` constructor.
	 */
	private initWorker(): void {
		if (this.worker || this.isInitializing) {
			return;
		}

		this.isInitializing = true;

		try {
			this.worker = new CryptoWorkerConstructor({ type: "module" });

			this.worker.onerror = () => {
				// Terminate the failed worker; the next runTask will re-init.
				this.cleanup();
			};
		} catch {
			this.cleanup();
		} finally {
			this.isInitializing = false;
		}
	}

	/**
	 * Eagerly spawn the worker so the first runTask() doesn't pay the
	 * worker-spawn + module-parse cost. Synchronous now — construction is
	 * fire-and-forget with cleanup via `worker.onerror`.
	 */
	prewarm(): void {
		this.initWorker();
	}

	/**
	 * Run a task in the Web Worker
	 */
	async runTask<T>(
		task: string,
		data: Record<string, string | Uint8Array>,
	): Promise<T> {
		this.initWorker();

		if (!this.worker) {
			throw new Error("Failed to initialize worker");
		}

		const worker = this.worker;

		return new Promise((resolve, reject) => {
			const taskId = Math.random().toString(36).substr(2, 9);
			const timeoutId = setTimeout(() => {
				// Clean up listeners on timeout
				worker.removeEventListener("message", handleMessage);
				worker.removeEventListener("error", handleError);
				reject(new Error(`Worker task ${task} timeout (Task ID: ${taskId})`));
			}, 10000);

			const handleMessage = (event: MessageEvent<CryptoWorkerResponse>) => {
				if (event.data.taskId === taskId) {
					clearTimeout(timeoutId);
					worker.removeEventListener("message", handleMessage);
					worker.removeEventListener("error", handleError);

					if (event.data.error) {
						// Reject with the error message sent back by the worker
						reject(new Error(`Worker task failed: ${event.data.error}`));
					} else {
						resolve(event.data.result as T); // Type assertion for clean resolution
					}
				}
			};

			const handleError = (error: ErrorEvent) => {
				clearTimeout(timeoutId);
				worker.removeEventListener("message", handleMessage);
				worker.removeEventListener("error", handleError);
				// Reject on global worker error while task is pending
				reject(new Error(`Worker error during task: ${error.message}`));
			};

			worker.addEventListener("message", handleMessage);
			worker.addEventListener("error", handleError);

			const message: CryptoWorkerMessage = { taskId, task, data };
			worker.postMessage(message);
		});
	}

	/**
	 * Convert entropy to mnemonic using Web Worker
	 */
	async entropyToMnemonic(entropy: Uint8Array): Promise<string> {
		return this.runTask<string>("entropyToMnemonic", { entropy });
	}

	/**
	 * Fused: entropy → mnemonic → sr25519 keypair in a single worker
	 * round-trip. Callers that don't need the mnemonic separately should
	 * prefer this over two `entropyToMnemonic + keypairFromMnemonic` hops —
	 * saves one postMessage transit (~30–80ms on constrained hardware / under
	 * throttle) on the frictionless critical path. sr25519 derivation is a
	 * ~500ms main-thread cost otherwise.
	 */
	async entropyToKeypair(entropy: Uint8Array): Promise<EntropyToKeypairResult> {
		return this.runTask<EntropyToKeypairResult>("entropyToKeypair", {
			entropy,
		});
	}

	/**
	 * Clean up worker resources
	 */
	private cleanup(): void {
		if (this.worker) {
			this.worker.terminate();
		}
		this.worker = null;
		this.isInitializing = false;
	}

	/**
	 * Public dispose method
	 */
	public dispose(): void {
		this.cleanup();
	}
}

// Create a singleton instance for reuse
let workerManagerInstance: CryptoWorkerManager | null = null;

/**
 * Get the singleton CryptoWorkerManager instance
 */
export function getCryptoWorkerManager(): CryptoWorkerManager {
	if (!workerManagerInstance) {
		workerManagerInstance = new CryptoWorkerManager();
	}
	return workerManagerInstance;
}

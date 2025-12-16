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

// Imports remain correct, assuming the declaration file is set up
import CryptoWorkerConstructor from "./cryptoWorker.ts?worker&inline";

interface CryptoWorkerMessage {
	taskId: string;
	task: string;
	data: Record<string, string | Uint8Array>;
}

interface CryptoWorkerResponse {
	taskId: string;
	result?: Record<string, string>;
	error?: string;
}

/**
 * Manages Web Worker for cryptographic operations to prevent blocking the main thread
 */
export class CryptoWorkerManager {
	// We update the type of 'worker' to use the constructor's type
	// to ensure type safety, though 'Worker' is sufficient here.
	private worker: Worker | null = null;
	private isInitializing = false;

	/**
	 * Initialize the worker
	 */
	private async initWorker(): Promise<void> {
		if (this.worker || this.isInitializing) {
			return;
		}

		this.isInitializing = true;

		try {
			// 1. Instantiate the worker using the Vite-provided constructor.
			// This handles the bundling and inlining to avoid CORS/import errors.
			this.worker = new CryptoWorkerConstructor({ type: "module" });

			// 2. Add an IMMEDIATE global error handler for initialization failures (e.g., failed parsing)
			this.worker.onerror = (errorEvent: ErrorEvent) => {
				// Terminate the failed worker and mark for re-initialization
				this.cleanup();
				// The specific runTask/testWorker promise will reject via their local handleError
			};

			// 3. Test if worker is working
			await this.testWorker();
		} catch (error) {
			this.cleanup(); // Clean up if instantiation itself fails
			throw error; // Re-throw to propagate failure
		} finally {
			// We don't want to set isInitializing to false here if the worker started,
			// but we can if the test fails or construction fails.
			if (!this.worker) {
				this.isInitializing = false;
			}
		}
	}

	/**
	 * Test if the worker is functioning properly
	 */
	private async testWorker(): Promise<void> {
		if (!this.worker) {
			throw new Error("Worker not initialized");
		}

		const worker = this.worker;

		return new Promise((resolve, reject) => {
			const testTimeout = setTimeout(() => {
				// Clean up event listeners on timeout
				worker.removeEventListener("message", handleMessage);
				worker.removeEventListener("error", handleError);
				reject(new Error("Worker test timeout"));
			}, 5000);

			const handleMessage = (event: MessageEvent) => {
				const { taskId, error, result } = event.data;
				if (taskId === "test") {
					clearTimeout(testTimeout);
					worker.removeEventListener("message", handleMessage);
					worker.removeEventListener("error", handleError); // Also remove error listener

					if (error || result !== "ready") {
						reject(
							new Error(
								`Worker test failed: ${error || 'Did not return "ready"'}`,
							),
						);
					} else {
						resolve();
					}
				}
			};

			const handleError = (error: ErrorEvent) => {
				clearTimeout(testTimeout);
				worker.removeEventListener("message", handleMessage);
				worker.removeEventListener("error", handleError);
				reject(
					new Error(`Worker test failed with error event: ${error.message}`),
				);
			};

			worker.addEventListener("message", handleMessage);
			worker.addEventListener("error", handleError); // Catch errors during test

			// Send a test message
			worker.postMessage({ taskId: "test", task: "test", data: {} });
		});
	}

	/**
	 * Run a task in the Web Worker
	 */
	async runTask<T>(
		task: string,
		data: Record<string, string | Uint8Array>,
	): Promise<T> {
		await this.initWorker();

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

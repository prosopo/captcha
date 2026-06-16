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
import { solvePoW } from "@prosopo/util";
import type { PowWorkerRequest, PowWorkerResponse } from "./powWorker.js";

// Hardcoded, build-time substituted number of web workers used to solve a PoW
// challenge in parallel. Each worker explores a disjoint slice of the nonce
// space (see solvePoWOffset / divide-and-conquer below).
const POW_WORKER_COUNT = Number.parseInt(
	process.env.PROSOPO_POW_WORKERS || "8",
	10,
);

/**
 * Number of workers to use, guaranteed to be a sane positive integer.
 */
const getWorkerCount = (): number =>
	Number.isFinite(POW_WORKER_COUNT) && POW_WORKER_COUNT > 0
		? Math.floor(POW_WORKER_COUNT)
		: 1;

/**
 * Spawn a single PoW web worker.
 *
 * Kept as a separate function so the orchestrator can be tested/mocked and so
 * environments without web worker support (e.g. SSR) fail fast and fall back to
 * the synchronous solver.
 */
const spawnWorker = (): Worker =>
	new Worker(new URL("./powWorker.js", import.meta.url), { type: "module" });

/**
 * Solve a PoW challenge across a pool of web workers.
 *
 * The nonce space is divided and conquered: with `n` workers, worker `i` only
 * tries nonces `i, i + n, i + 2n, ...`, so the workers collectively cover every
 * nonce exactly once with no overlap. The first worker to find a valid nonce
 * wins; all workers are then terminated and its nonce is returned.
 *
 * Falls back to the synchronous single-threaded solver when web workers are not
 * available (e.g. server-side rendering) or only a single worker is configured.
 */
export const solvePoWParallel = (
	data: string,
	difficulty: number,
): Promise<number> => {
	const workerCount = getWorkerCount();

	if (workerCount <= 1 || typeof Worker === "undefined") {
		return Promise.resolve(solvePoW(data, difficulty));
	}

	return new Promise<number>((resolve, reject) => {
		let workers: Worker[] = [];
		let settled = false;

		const cleanup = (): void => {
			for (const worker of workers) {
				worker.terminate();
			}
			workers = [];
		};

		try {
			for (let i = 0; i < workerCount; i++) {
				const worker = spawnWorker();

				worker.onmessage = (
					event: MessageEvent<PowWorkerResponse>,
				): void => {
					if (settled) {
						return;
					}
					settled = true;
					cleanup();
					resolve(event.data);
				};

				worker.onerror = (event: ErrorEvent): void => {
					if (settled) {
						return;
					}
					settled = true;
					cleanup();
					reject(
						event.error instanceof Error
							? event.error
							: new Error(event.message || "PoW worker error"),
					);
				};

				const request: PowWorkerRequest = {
					data,
					difficulty,
					start: i,
					step: workerCount,
				};
				worker.postMessage(request);

				workers.push(worker);
			}
		} catch (error) {
			cleanup();
			reject(error instanceof Error ? error : new Error(String(error)));
		}
	});
};

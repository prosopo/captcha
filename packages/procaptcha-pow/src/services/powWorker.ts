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
import { solvePoWOffset } from "@prosopo/util";

/**
 * Work assigned to a single PoW worker. The worker only tries the nonces
 * `start, start + step, start + 2*step, ...` so that, across a pool of `step`
 * workers (each with a distinct `start` in `0..step-1`), every nonce is covered
 * exactly once with no overlap.
 */
export interface PowWorkerRequest {
	data: string;
	difficulty: number;
	start: number;
	step: number;
}

/**
 * The solved nonce, posted back to the main thread by whichever worker finds it
 * first.
 */
export type PowWorkerResponse = number;

interface PowWorkerGlobalScope {
	postMessage(message: PowWorkerResponse): void;
	onmessage: ((event: MessageEvent<PowWorkerRequest>) => void) | null;
}

const ctx = self as unknown as PowWorkerGlobalScope;

ctx.onmessage = (event: MessageEvent<PowWorkerRequest>): void => {
	const { data, difficulty, start, step } = event.data;
	const nonce = solvePoWOffset(data, difficulty, start, step);
	ctx.postMessage(nonce);
};

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
export type SimdOpCategory = "FP" | "INT" | "BIT" | "PERM";

export type SimdOpReadingRecord = {
	name: string;
	category: SimdOpCategory;
	bestNs: number;
	medianNs: number;
	iters: number;
	// i32 bit pattern of lane 0 returned by the WASM run() — deterministic for
	// integer/bitwise ops, useful as a sanity check against engine bugs or
	// spoofed WASM runtimes.
	resultLane: number;
};

// Per-CPU WASM SIMD fingerprint readings collected by the catcher client.
// Collection-only — the dataset is built up server-side for later
// classification work. See packages/catcher/src/collecters/simd/.
export type SimdReadings =
	| { supported: false; reason: string }
	| {
			supported: true;
			schema: number;
			timerResolutionMs: number;
			runsPerOp: number;
			durationMs: number;
			ops: SimdOpReadingRecord[];
	  };

export type DetectorResult = {
	score: number;
	timestamp: number;
	providerSelectEntropy: number;
	userId: string;
	userAgent: string;
	isWebView?: boolean;
	isIframe?: boolean;
	decryptedHeadHash: string;
	triggeredDetectors?: number[];
	// True when the client-side shadow-DOM detector tripped and contributed a
	// hard penalty to `score`. Undefined for clients that predate the field.
	shadowDomPenalty?: boolean;
};

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

/**
 * One value in a {@link DetectorData} bag.
 *
 * `unknown` rather than a recursive JSON union for two reasons. It is
 * truthful — this is client-controlled data whose shape nothing here knows,
 * and a reader that wants a string should have to check for one. And a
 * self-referential type here is expanded eagerly wherever `Session` is used as
 * a generic argument, which puts the Mongoose schema for `Session` past
 * TypeScript's instantiation depth limit.
 *
 * `sanitiseDetectorData` in the provider package is what guarantees that
 * whatever arrives is JSON-shaped and safe to persist.
 */
export type DetectorDataValue = unknown;

/**
 * Open bag of client-reported detection signals, keyed by signal name.
 *
 * Forwarded from the detector to the session record and on into decision- and
 * routing-machine input verbatim, so an operator's rules can read signals that
 * no type in this repo names. Adding, removing or reshaping a signal is a
 * detector concern alone — it needs no release of `types` or `provider`.
 */
export type DetectorData = Record<string, DetectorDataValue>;

export type DetectorResult = {
	score: number;
	timestamp: number;
	userId: string;
	userAgent: string;
	isWebView?: boolean;
	isIframe?: boolean;
	decryptedHeadHash: string;
	triggeredDetectors?: number[];
	// True when the client-side shadow-DOM detector tripped and contributed a
	// hard penalty to `score`. Undefined for clients that predate the field.
	shadowDomPenalty?: boolean;
	// Everything else the detector reported. Absent when it reported nothing.
	d?: DetectorData;
};

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

import {
	type SimdReadings,
	decodeSimdReadings,
	encodeSimdReadings,
} from "@prosopo/types";
import { describe, expect, it } from "vitest";

const PAYLOAD_DELIMITER = "|";

const sample: SimdReadings = {
	supported: true,
	schema: 1,
	timerResolutionMs: 0.0001,
	runsPerOp: 3,
	durationMs: 87.4,
	ops: [
		{
			name: "f32x4_div",
			category: "FP",
			bestNs: 2.01,
			medianNs: 2.02,
			iters: 1_000_000,
			resultLane: 42,
		},
		{
			name: "i32x4_add",
			category: "INT",
			bestNs: 0.43,
			medianNs: 0.44,
			iters: 4_000_000,
			resultLane: -7,
		},
	],
};

describe("simdReadingsCodec (shared @prosopo/types codec)", () => {
	it("round-trips supported readings without losing structural fields", () => {
		const encoded = encodeSimdReadings(sample);
		const decoded = decodeSimdReadings(encoded);
		expect(decoded).toBeDefined();
		if (!decoded?.supported) throw new Error("expected supported reading");
		expect(decoded.schema).toBe(1);
		expect(decoded.runsPerOp).toBe(3);
		expect(decoded.ops).toHaveLength(2);
		expect(decoded.ops[0]?.name).toBe("f32x4_div");
		expect(decoded.ops[0]?.category).toBe("FP");
		expect(decoded.ops[1]?.resultLane).toBe(-7);
	});

	it("round-trips the unsupported branch", () => {
		const encoded = encodeSimdReadings({
			supported: false,
			reason: "wasm-simd-unsupported",
		});
		expect(decodeSimdReadings(encoded)).toEqual({
			supported: false,
			reason: "wasm-simd-unsupported",
		});
	});

	it("returns undefined for malformed input rather than throwing", () => {
		expect(decodeSimdReadings(undefined)).toBeUndefined();
		expect(decodeSimdReadings("")).toBeUndefined();
		expect(decodeSimdReadings("totally-garbage")).toBeUndefined();
		// Right header shape but wrong category enum value:
		expect(decodeSimdReadings("S1;0;3;1;name:WAT:1:1:1:0")).toBeUndefined();
	});

	it("never produces a '|' in the encoded form (pipe-safe for the payload)", () => {
		const encoded = encodeSimdReadings(sample);
		expect(encoded.includes(PAYLOAD_DELIMITER)).toBe(false);
	});
});

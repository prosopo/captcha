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

import { describe, expect, it } from "vitest";
import { summariseProfile } from "../../../api/cpuProfiler.js";

const frame = (id: number, functionName: string, line: number) => ({
	id,
	callFrame: { functionName, url: "file:///app/thing.js", lineNumber: line },
});

describe("summariseProfile", () => {
	// Deltas are microseconds and each is charged to the sample it precedes.
	const profile = {
		nodes: [
			frame(1, "(root)", 0),
			frame(2, "decodePayload", 10),
			frame(3, "generateBackground", 20),
			frame(4, "(idle)", 0),
		],
		samples: [2, 3, 2, 4, 2],
		timeDeltas: [1000, 500, 1000, 4000, 1000],
		startTime: 0,
		endTime: 7_500,
	};

	it("ranks frames by self time, busiest first", () => {
		const summary = summariseProfile(profile, 10);
		expect(summary.top.map((f) => f.fn)).toEqual([
			"decodePayload",
			"generateBackground",
		]);
		expect(summary.top[0]?.selfMs).toBe(3);
		expect(summary.top[1]?.selfMs).toBe(0.5);
	});

	it("reports percentages against busy time, not wall time", () => {
		const summary = summariseProfile(profile, 10);
		// 3 ms of 3.5 ms busy, not of the 7.5 ms window.
		expect(summary.top[0]?.pct).toBeCloseTo((3 / 3.5) * 100, 5);
	});

	it("keeps idle out of the ranking and reports it as headroom", () => {
		const summary = summariseProfile(profile, 10);
		expect(summary.top.some((f) => f.fn === "(idle)")).toBe(false);
		expect(summary.idlePct).toBeCloseTo((4000 / 7500) * 100, 5);
	});

	it("honours the top-n limit", () => {
		expect(summariseProfile(profile, 1).top).toHaveLength(1);
	});

	it("survives a profile with no samples", () => {
		const summary = summariseProfile(
			{ ...profile, samples: [], timeDeltas: [] },
			10,
		);
		expect(summary.top).toEqual([]);
		expect(summary.idlePct).toBe(0);
	});
});

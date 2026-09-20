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

import { beforeEach, describe, expect, it } from "vitest";
import { getMetrics, measureSync } from "../../../api/metrics.js";

const readCounter = async (
	name: "sync_span_cpu_seconds_total" | "sync_span_calls_total",
	span: string,
): Promise<number> => {
	const metric = await getMetrics()
		.registry.getSingleMetric(`prosopo_${name}`)
		?.get();
	const sample = metric?.values.find((value) => value.labels.span === span);
	return typeof sample?.value === "number" ? sample.value : 0;
};

// The registry is a process-wide singleton, so assertions are on the delta
// across a call rather than on absolute values.
describe("measureSync", () => {
	let callsBefore: number;
	let cpuBefore: number;

	beforeEach(async () => {
		callsBefore = await readCounter("sync_span_calls_total", "merkle_build");
		cpuBefore = await readCounter(
			"sync_span_cpu_seconds_total",
			"merkle_build",
		);
	});

	it("returns the callback's value untouched", () => {
		expect(measureSync("merkle_build", () => 42)).toBe(42);
	});

	it("bills CPU to the span", async () => {
		measureSync("merkle_build", () => {
			// Enough arithmetic to register above the clock's resolution.
			let total = 0;
			for (let i = 0; i < 5_000_000; i++) total += i % 7;
			return total;
		});
		expect(
			await readCounter("sync_span_cpu_seconds_total", "merkle_build"),
		).toBeGreaterThan(cpuBefore);
	});

	it("counts a span that throws, and rethrows", async () => {
		const boom = new Error("decoder handed the wrong key");
		expect(() =>
			measureSync("merkle_build", () => {
				throw boom;
			}),
		).toThrow(boom);
		expect(await readCounter("sync_span_calls_total", "merkle_build")).toBe(
			callsBefore + 1,
		);
	});
});

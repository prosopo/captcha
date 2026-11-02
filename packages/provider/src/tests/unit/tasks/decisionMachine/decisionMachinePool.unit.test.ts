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

import { afterEach, describe, expect, it } from "vitest";
import {
	runDecisionMachine,
	shutdownDecisionMachinePool,
} from "../../../../tasks/decisionMachine/decisionMachinePool.js";

const run = (source: string, timeoutMs = 500) =>
	runDecisionMachine({
		source,
		exportNames: ["decide", "default"],
		input: { value: 2 },
		timeoutMs,
		loadTimeoutMs: 1000,
	});

describe("decisionMachinePool", () => {
	afterEach(() => shutdownDecisionMachinePool());

	it("returns the machine's result", async () => {
		const result = await run(
			"module.exports.decide = (i) => ({ doubled: i.value * 2 })",
		);
		expect(result).toMatchObject({
			found: true,
			name: "decide",
			result: { doubled: 4 },
		});
	});

	it("awaits an async machine", async () => {
		const result = await run("module.exports = async (i) => i.value");
		expect(result).toMatchObject({ found: true, result: 2 });
	});

	it("reports a missing export", async () => {
		expect(await run("module.exports.other = () => 1")).toEqual({
			found: false,
		});
	});

	it("rejects with the machine's error", async () => {
		await expect(
			run("module.exports.decide = () => { throw new Error('boom') }"),
		).rejects.toThrow("boom");
	});

	it("kills a looping machine without blocking the main thread, then recovers", async () => {
		let ticks = 0;
		const ticker = setInterval(() => {
			ticks++;
		}, 10);
		const started = Date.now();
		await expect(
			run("module.exports.decide = () => { for (;;); }", 200),
		).rejects.toThrow("Decision machine timeout");
		clearInterval(ticker);

		expect(Date.now() - started).toBeLessThan(1000);
		expect(ticks).toBeGreaterThan(5);
		expect(await run("module.exports.decide = () => 1")).toMatchObject({
			result: 1,
		});
	});

	it("times out queued work when every worker is stuck", async () => {
		const loop = "module.exports.decide = () => { for (;;); }";
		const results = await Promise.allSettled([
			run(loop, 200),
			run(loop, 200),
			run(loop, 200),
		]);
		expect(results.map((r) => r.status)).toEqual([
			"rejected",
			"rejected",
			"rejected",
		]);
	});
});

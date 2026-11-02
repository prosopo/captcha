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
import type { ProviderEnvironment } from "@prosopo/env";
import { describe, expect, it, vi } from "vitest";
import { retryWithBackoff, waitForEnvironment } from "../retryWithBackoff.js";

const failTimes = (failures: number): (() => Promise<string>) => {
	let calls = 0;
	return async () => {
		calls++;
		if (calls <= failures) {
			throw new Error(`failure ${calls}`);
		}
		return "ready";
	};
};

const fakeClock = () => {
	let time = 0;
	const delays: number[] = [];
	return {
		delays,
		now: () => time,
		sleep: async (ms: number) => {
			delays.push(ms);
			time += ms;
		},
	};
};

describe("retryWithBackoff", () => {
	it("returns without sleeping when the first attempt works", async () => {
		const clock = fakeClock();
		await expect(retryWithBackoff(failTimes(0), clock)).resolves.toBe("ready");
		expect(clock.delays).toEqual([]);
	});

	it("succeeds after several failures and reports each retry", async () => {
		const clock = fakeClock();
		const onRetry = vi.fn();
		await expect(
			retryWithBackoff(failTimes(3), { ...clock, onRetry, random: () => 1 }),
		).resolves.toBe("ready");
		expect(onRetry.mock.calls.map(([event]) => event.attempt)).toEqual([
			1, 2, 3,
		]);
	});

	it("doubles the delay up to the cap", async () => {
		const clock = fakeClock();
		await retryWithBackoff(failTimes(8), { ...clock, random: () => 1 });
		expect(clock.delays).toEqual([100, 200, 400, 800, 1600, 3200, 5000, 5000]);
	});

	it("keeps at least half of the delay when jitter is lowest", async () => {
		const clock = fakeClock();
		await retryWithBackoff(failTimes(2), { ...clock, random: () => 0 });
		expect(clock.delays).toEqual([50, 100]);
	});

	it("gives up with the last error once time runs out", async () => {
		const clock = fakeClock();
		await expect(
			retryWithBackoff(failTimes(Number.POSITIVE_INFINITY), {
				...clock,
				maxElapsedMs: 1000,
				random: () => 1,
			}),
		).rejects.toThrow("failure 4");
		expect(clock.delays).toEqual([100, 200, 400]);
	});
});

describe("waitForEnvironment", () => {
	it("logs a retry and resolves once the environment is ready", async () => {
		vi.useFakeTimers();
		const warn = vi.fn();
		const isReady = vi
			.fn<ProviderEnvironment["isReady"]>()
			.mockRejectedValueOnce(new Error("ECONNREFUSED"))
			.mockResolvedValue(undefined);
		const waiting = waitForEnvironment({ isReady, logger: { warn } });
		await vi.runAllTimersAsync();
		await waiting;
		vi.useRealTimers();
		expect(isReady).toHaveBeenCalledTimes(2);
		expect(warn).toHaveBeenCalledTimes(1);
	});
});

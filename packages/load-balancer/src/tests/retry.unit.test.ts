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

import { describe, expect, it, vi } from "vitest";
import { getBackoffDelayMs, retryWithBackoff } from "../retry.js";

const noopSleep = (_ms: number): Promise<void> => Promise.resolve();

describe("getBackoffDelayMs", () => {
	it("scales the delay cap exponentially with the attempt index", () => {
		// random=1 → returns the full cap so the exponent is observable.
		expect(getBackoffDelayMs(0, 100, 10_000, () => 1)).toBe(100);
		expect(getBackoffDelayMs(1, 100, 10_000, () => 1)).toBe(200);
		expect(getBackoffDelayMs(2, 100, 10_000, () => 1)).toBe(400);
		expect(getBackoffDelayMs(3, 100, 10_000, () => 1)).toBe(800);
	});

	it("caps the delay at maxDelayMs even for large attempt indices", () => {
		expect(getBackoffDelayMs(10, 100, 1_000, () => 1)).toBe(1_000);
		expect(getBackoffDelayMs(20, 100, 1_000, () => 1)).toBe(1_000);
	});

	it("clamps negative or fractional attempt indices to zero", () => {
		expect(getBackoffDelayMs(-5, 100, 10_000, () => 1)).toBe(100);
		expect(getBackoffDelayMs(0.9, 100, 10_000, () => 1)).toBe(100);
	});

	it("uses full jitter — random=0 yields 0, random=1 yields the cap", () => {
		expect(getBackoffDelayMs(2, 100, 10_000, () => 0)).toBe(0);
		expect(getBackoffDelayMs(2, 100, 10_000, () => 0.5)).toBe(200);
		expect(getBackoffDelayMs(2, 100, 10_000, () => 1)).toBe(400);
	});
});

describe("retryWithBackoff", () => {
	it("returns the value on the first successful attempt without sleeping", async () => {
		const sleep = vi.fn(noopSleep);
		const fn = vi.fn(async () => "ok");
		const result = await retryWithBackoff(fn, {
			maxAttempts: 3,
			baseDelayMs: 100,
			maxDelayMs: 1_000,
			sleep,
		});
		expect(result).toBe("ok");
		expect(fn).toHaveBeenCalledTimes(1);
		expect(sleep).not.toHaveBeenCalled();
	});

	it("retries on failure and returns on the eventual success", async () => {
		const sleep = vi.fn(noopSleep);
		let call = 0;
		const fn = vi.fn(async () => {
			call++;
			if (call < 3) throw new Error(`transient ${call}`);
			return "ok";
		});
		const result = await retryWithBackoff(fn, {
			maxAttempts: 5,
			baseDelayMs: 100,
			maxDelayMs: 1_000,
			random: () => 0.5,
			sleep,
		});
		expect(result).toBe("ok");
		expect(fn).toHaveBeenCalledTimes(3);
		// Sleeps only between attempts, so N-1 sleeps for N-attempts-until-success.
		expect(sleep).toHaveBeenCalledTimes(2);
	});

	it("throws the final error after maxAttempts exhausted", async () => {
		const sleep = vi.fn(noopSleep);
		let call = 0;
		const fn = vi.fn(async () => {
			call++;
			throw new Error(`fail ${call}`);
		});
		await expect(
			retryWithBackoff(fn, {
				maxAttempts: 3,
				baseDelayMs: 100,
				maxDelayMs: 1_000,
				sleep,
			}),
		).rejects.toThrow("fail 3");
		expect(fn).toHaveBeenCalledTimes(3);
		// Sleeps after attempts 1 and 2, but not after the final attempt.
		expect(sleep).toHaveBeenCalledTimes(2);
	});

	it("normalises non-Error throws into an Error before rethrowing", async () => {
		const fn = vi.fn(async () => {
			throw "string thrown";
		});
		await expect(
			retryWithBackoff(fn, {
				maxAttempts: 2,
				baseDelayMs: 0,
				maxDelayMs: 0,
				sleep: noopSleep,
			}),
		).rejects.toThrow("string thrown");
	});

	it("passes exponentially-growing delays to sleep", async () => {
		const sleep = vi.fn(noopSleep);
		const fn = vi.fn(async () => {
			throw new Error("boom");
		});
		await expect(
			retryWithBackoff(fn, {
				maxAttempts: 4,
				baseDelayMs: 100,
				maxDelayMs: 10_000,
				random: () => 1,
				sleep,
			}),
		).rejects.toThrow("boom");
		// random=1 → delays equal the cap: 100, 200, 400.
		const delays = sleep.mock.calls.map(([ms]) => ms);
		expect(delays).toEqual([100, 200, 400]);
	});

	it("does not retry when maxAttempts is 1 (retry disabled)", async () => {
		const sleep = vi.fn(noopSleep);
		const fn = vi.fn(async () => {
			throw new Error("nope");
		});
		await expect(
			retryWithBackoff(fn, {
				maxAttempts: 1,
				baseDelayMs: 100,
				maxDelayMs: 1_000,
				sleep,
			}),
		).rejects.toThrow("nope");
		expect(fn).toHaveBeenCalledTimes(1);
		expect(sleep).not.toHaveBeenCalled();
	});
});

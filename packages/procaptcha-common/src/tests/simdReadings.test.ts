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

import { afterEach, describe, expect, it, vi } from "vitest";
import {
	SIMD_READINGS_SUBMIT_TIMEOUT_MS,
	type SimdReadingsSource,
	getSimdReadingsForSubmit,
} from "../simdReadings.js";

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe("getSimdReadingsForSubmit", () => {
	it("blocks on the readings and returns them", async () => {
		const getSimdReadings = vi.fn<
			(timeoutMs?: number) => Promise<string | undefined>
		>(async () => "ENCODED_SIMD");
		const source: SimdReadingsSource = { getSimdReadings };

		await expect(getSimdReadingsForSubmit(source)).resolves.toBe(
			"ENCODED_SIMD",
		);
	});

	it("passes the submit timeout budget down to the detector", async () => {
		const getSimdReadings = vi.fn<
			(timeoutMs?: number) => Promise<string | undefined>
		>(async () => "ENCODED_SIMD");

		await getSimdReadingsForSubmit({ getSimdReadings });

		expect(getSimdReadings).toHaveBeenCalledWith(
			SIMD_READINGS_SUBMIT_TIMEOUT_MS,
		);
		expect(SIMD_READINGS_SUBMIT_TIMEOUT_MS).toBe(5000);
	});

	it("waits for slow readings that still land inside the budget", async () => {
		vi.useFakeTimers();
		const getSimdReadings = vi.fn<
			(timeoutMs?: number) => Promise<string | undefined>
		>(
			() =>
				new Promise<string>((resolve) => {
					setTimeout(() => resolve("LATE_SIMD"), 4000);
				}),
		);

		const pending = getSimdReadingsForSubmit({ getSimdReadings });
		await vi.advanceTimersByTimeAsync(4000);

		await expect(pending).resolves.toBe("LATE_SIMD");
	});

	it("gives up at the timeout when the detector never resolves", async () => {
		vi.useFakeTimers();
		const getSimdReadings = vi.fn<
			(timeoutMs?: number) => Promise<string | undefined>
		>(() => new Promise<string>(() => undefined));

		const pending = getSimdReadingsForSubmit({ getSimdReadings });
		await vi.advanceTimersByTimeAsync(SIMD_READINGS_SUBMIT_TIMEOUT_MS);

		await expect(pending).resolves.toBeUndefined();
	});

	it("honours an explicit timeout override", async () => {
		vi.useFakeTimers();
		const getSimdReadings = vi.fn<
			(timeoutMs?: number) => Promise<string | undefined>
		>(() => new Promise<string>(() => undefined));

		const pending = getSimdReadingsForSubmit({ getSimdReadings }, 100);
		await vi.advanceTimersByTimeAsync(100);

		await expect(pending).resolves.toBeUndefined();
		expect(getSimdReadings).toHaveBeenCalledWith(100);
	});

	it("resolves undefined when the readings promise rejects", async () => {
		const getSimdReadings = vi.fn<
			(timeoutMs?: number) => Promise<string | undefined>
		>(async () => {
			throw new Error("benchmark failed");
		});

		await expect(
			getSimdReadingsForSubmit({ getSimdReadings }),
		).resolves.toBeUndefined();
	});

	it("resolves undefined when the accessor throws synchronously", async () => {
		const getSimdReadings = vi.fn<
			(timeoutMs?: number) => Promise<string | undefined>
		>(() => {
			throw new Error("detector exploded");
		});

		await expect(
			getSimdReadingsForSubmit({ getSimdReadings }),
		).resolves.toBeUndefined();
	});

	it("resolves undefined without a source or accessor", async () => {
		await expect(getSimdReadingsForSubmit(undefined)).resolves.toBeUndefined();
		await expect(getSimdReadingsForSubmit({})).resolves.toBeUndefined();
	});

	it("calls the accessor with the source as `this`", async () => {
		// The detector ships prebuilt; its accessor may be a method relying on
		// its own receiver, so it must not be invoked detached.
		const source = {
			marker: "SIMD_FROM_THIS",
			getSimdReadings(this: { marker: string }): Promise<string | undefined> {
				return Promise.resolve(this.marker);
			},
		};

		await expect(getSimdReadingsForSubmit(source)).resolves.toBe(
			"SIMD_FROM_THIS",
		);
	});

	it("clears the timeout timer once readings arrive", async () => {
		vi.useFakeTimers();
		const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
		const getSimdReadings = vi.fn<
			(timeoutMs?: number) => Promise<string | undefined>
		>(async () => "ENCODED_SIMD");

		await getSimdReadingsForSubmit({ getSimdReadings });

		expect(clearTimeoutSpy).toHaveBeenCalled();
	});
});

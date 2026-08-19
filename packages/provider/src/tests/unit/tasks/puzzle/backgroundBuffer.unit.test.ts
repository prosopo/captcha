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
	createPuzzleBackgroundBuffer,
	getPuzzleBackgroundBuffer,
	initPuzzleBackgroundBuffer,
	resetPuzzleBackgroundBuffer,
} from "../../../../tasks/puzzle/backgroundBuffer.js";

// A small geometry keeps generation cheap; the properties under test are
// independent of image size. The buffer only holds bare backgrounds — decoy
// paint and the real cut happen downstream during render, so no render
// settings are needed here.
const GEOMETRY = { width: 40, height: 30, notchSize: 12 };

afterEach(() => {
	resetPuzzleBackgroundBuffer();
});

describe("puzzle background buffer", () => {
	it("primes to capacity so the first request pays nothing", () => {
		const buffer = createPuzzleBackgroundBuffer({
			capacity: 4,
			geometry: GEOMETRY,
		});
		expect(buffer.depth()).toBe(4);
		buffer.stop();
	});

	it("never hands the same background out twice", () => {
		// Single use is a security property, not an optimisation: two composites
		// sharing a background can be diffed to reveal both notch positions.
		const buffer = createPuzzleBackgroundBuffer({
			capacity: 6,
			geometry: GEOMETRY,
			refillIntervalMs: 1_000_000,
		});

		const seen = new Set<string>();
		for (let i = 0; i < 6; i++) {
			const image = buffer.take();
			expect(image).not.toBeNull();
			if (!image) throw new Error("unreachable");
			const digest = image.data.toString("base64");
			expect(seen.has(digest)).toBe(false);
			seen.add(digest);
		}
		expect(seen.size).toBe(6);
		buffer.stop();
	});

	it("drains as it is consumed", () => {
		const buffer = createPuzzleBackgroundBuffer({
			capacity: 3,
			geometry: GEOMETRY,
			refillIntervalMs: 1_000_000,
		});
		buffer.take();
		expect(buffer.depth()).toBe(2);
		buffer.take();
		buffer.take();
		expect(buffer.depth()).toBe(0);
		buffer.stop();
	});

	it("still serves a background when it has run dry, and counts the starvation", () => {
		const buffer = createPuzzleBackgroundBuffer({
			capacity: 1,
			geometry: GEOMETRY,
			refillIntervalMs: 1_000_000,
		});
		buffer.take();
		expect(buffer.starvations()).toBe(0);

		// Empty: generated inline rather than failing the request.
		const image = buffer.take();
		expect(image).not.toBeNull();
		expect(buffer.starvations()).toBe(1);
		buffer.stop();
	});

	it("exposes a process-wide buffer only once initialised", () => {
		expect(getPuzzleBackgroundBuffer()).toBeNull();
		const buffer = initPuzzleBackgroundBuffer({
			capacity: 2,
			geometry: GEOMETRY,
		});
		expect(getPuzzleBackgroundBuffer()).toBe(buffer);
		resetPuzzleBackgroundBuffer();
		expect(getPuzzleBackgroundBuffer()).toBeNull();
	});

	it("replaces the previous buffer on re-init", () => {
		const first = initPuzzleBackgroundBuffer({
			capacity: 2,
			geometry: GEOMETRY,
		});
		const second = initPuzzleBackgroundBuffer({
			capacity: 2,
			geometry: GEOMETRY,
		});
		expect(second).not.toBe(first);
		expect(getPuzzleBackgroundBuffer()).toBe(second);
	});
});

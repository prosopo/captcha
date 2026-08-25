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
	type AudioRenderSettings,
	DEFAULT_RENDER_SETTINGS,
} from "@prosopo/audio-assets";
import { afterEach, describe, expect, test } from "vitest";
import {
	type AudioChallengeBuffer,
	createAudioChallengeBuffer,
} from "../../../../tasks/audio/audioBuffer.js";
import { resolveAudioRenderSettings } from "../../../../tasks/audio/audioRenderer.js";

// Small clips keep these tests fast — synthesis is real DSP, not a stub.
const fastSettings: AudioRenderSettings = {
	...DEFAULT_RENDER_SETTINGS,
	digitCount: 3,
	babbleVoices: 0,
	babbleGain: 0,
	reverbMix: 0,
};

let buffer: AudioChallengeBuffer | undefined;

afterEach(() => {
	buffer?.stop();
	buffer = undefined;
});

describe("createAudioChallengeBuffer", () => {
	test("primes synchronously so the first take does not pay for synthesis", () => {
		buffer = createAudioChallengeBuffer({
			capacity: 3,
			primeSettings: fastSettings,
		});
		expect(buffer.depth()).toBe(3);
		expect(buffer.starvations()).toBe(0);
	});

	test("never hands out the same challenge twice", () => {
		// This is the security property, not an optimisation: a repeated
		// clip is a free labelled training pair for an attacker.
		buffer = createAudioChallengeBuffer({
			capacity: 6,
			primeSettings: fastSettings,
		});
		const seen = new Set<string>();
		for (let i = 0; i < 12; i++) {
			const challenge = buffer.take(fastSettings);
			const digest = challenge.wav.toString("base64");
			expect(seen.has(digest)).toBe(false);
			seen.add(digest);
		}
		expect(seen.size).toBe(12);
	});

	test("serves inline rather than failing once drained, and counts it", () => {
		buffer = createAudioChallengeBuffer({
			capacity: 2,
			// Long interval so the timer cannot refill mid-test.
			refillIntervalMs: 1_000_000,
			primeSettings: fastSettings,
		});
		expect(buffer.depth()).toBe(2);
		buffer.take(fastSettings);
		buffer.take(fastSettings);
		expect(buffer.depth()).toBe(0);
		expect(buffer.starvations()).toBe(0);

		const drained = buffer.take(fastSettings);
		expect(drained.answer).toHaveLength(fastSettings.digitCount);
		expect(drained.wav.length).toBeGreaterThan(44);
		expect(buffer.starvations()).toBe(1);
	});

	test("takes honour the requested settings, not the primed ones", () => {
		// A site that customised digitCount must not be served a clip
		// rendered with someone else's value.
		buffer = createAudioChallengeBuffer({
			capacity: 1,
			refillIntervalMs: 1_000_000,
			primeSettings: fastSettings,
		});
		const other: AudioRenderSettings = { ...fastSettings, digitCount: 6 };
		expect(buffer.take(other).answer).toHaveLength(6);
		expect(buffer.take(fastSettings).answer).toHaveLength(3);
	});

	test("caps the number of settings variants it will hold", () => {
		buffer = createAudioChallengeBuffer({
			capacity: 1,
			refillIntervalMs: 1_000_000,
			maxVariants: 2,
			primeSettings: fastSettings,
		});
		// Three distinct variants against a cap of two: the buffer must
		// evict rather than grow, or a hostile spread of settings values
		// becomes an unbounded memory sink.
		for (const digitCount of [3, 4, 5, 6, 7, 8]) {
			buffer.take({ ...fastSettings, digitCount });
		}
		expect(buffer.depth()).toBeLessThanOrEqual(2);
	});

	test("stop() halts refilling", () => {
		buffer = createAudioChallengeBuffer({
			capacity: 1,
			refillIntervalMs: 1,
			primeSettings: fastSettings,
		});
		buffer.stop();
		buffer.take(fastSettings);
		expect(buffer.depth()).toBe(0);
	});
});

describe("resolveAudioRenderSettings", () => {
	test("returns the asset defaults when given nothing", () => {
		expect(resolveAudioRenderSettings()).toEqual(DEFAULT_RENDER_SETTINGS);
	});

	test("ignores undefined sources and undefined fields", () => {
		expect(resolveAudioRenderSettings(undefined, {})).toEqual(
			DEFAULT_RENDER_SETTINGS,
		);
		expect(resolveAudioRenderSettings({ digitCount: undefined })).toEqual(
			DEFAULT_RENDER_SETTINGS,
		);
	});

	test("later sources win, field by field", () => {
		// The cascade the provider relies on: asset defaults <- client
		// settings <- traffic-filter category override. A partial override
		// must not wipe the fields it does not mention.
		const resolved = resolveAudioRenderSettings(
			{ digitCount: 6, noiseSnrDb: 20 },
			{ noiseSnrDb: 9 },
		);
		expect(resolved.digitCount).toBe(6);
		expect(resolved.noiseSnrDb).toBe(9);
		expect(resolved.babbleGain).toBe(DEFAULT_RENDER_SETTINGS.babbleGain);
		expect(resolved.gapMs).toBe(DEFAULT_RENDER_SETTINGS.gapMs);
	});
});

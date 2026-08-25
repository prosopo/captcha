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

import { describe, expect, test } from "vitest";
import {
	ANSWER_ALPHABET,
	type AudioRenderSettings,
	DEFAULT_RENDER_SETTINGS,
	DIGITS,
	SAMPLE_RATE,
	addNoiseBed,
	createPrng,
	createSeed,
	encodeWav,
	randomVoice,
	renderAudioChallenge,
	rms,
	synthesiseUtterance,
	toDataUri,
} from "../index.js";

const cleanSettings = (
	overrides: Partial<AudioRenderSettings> = {},
): AudioRenderSettings => ({
	...DEFAULT_RENDER_SETTINGS,
	noiseSnrDb: 60,
	babbleGain: 0,
	babbleVoices: 0,
	reverbMix: 0,
	...overrides,
});

/** Decode the samples back out of a WAV so assertions can look at audio. */
const decodeWav = (wav: Buffer): Float32Array => {
	const dataBytes = wav.readUInt32LE(40);
	const out = new Float32Array(dataBytes / 2);
	for (let n = 0; n < out.length; n++) {
		out[n] = wav.readInt16LE(44 + n * 2) / 0x7fff;
	}
	return out;
};

describe("phoneme table", () => {
	test("covers every decimal digit exactly once", () => {
		const answers = DIGITS.map((d) => d.answer);
		expect(answers.sort()).toEqual([
			"0",
			"1",
			"2",
			"3",
			"4",
			"5",
			"6",
			"7",
			"8",
			"9",
		]);
		expect(new Set(answers).size).toBe(DIGITS.length);
	});

	test("every digit has at least one phoneme and a positive duration", () => {
		for (const digit of DIGITS) {
			expect(digit.phonemes.length).toBeGreaterThan(0);
			const total = digit.phonemes.reduce((sum, p) => sum + p.durationMs, 0);
			expect(total).toBeGreaterThan(0);
		}
	});

	test("ANSWER_ALPHABET matches the table", () => {
		for (const digit of DIGITS) {
			expect(ANSWER_ALPHABET).toContain(digit.answer);
		}
		expect(ANSWER_ALPHABET.length).toBe(DIGITS.length);
	});
});

describe("synthesiseUtterance", () => {
	test("produces audible, finite, in-range samples", () => {
		const prng = createPrng(createSeed());
		const voice = randomVoice(prng);
		for (const digit of DIGITS) {
			const buffer = synthesiseUtterance(digit, voice, prng, SAMPLE_RATE);
			expect(buffer.sampleRate).toBe(SAMPLE_RATE);
			expect(buffer.samples.length).toBeGreaterThan(0);
			for (const sample of buffer.samples) {
				expect(Number.isFinite(sample)).toBe(true);
				expect(Math.abs(sample)).toBeLessThanOrEqual(1.0001);
			}
			// Not silence. A phoneme table typo that produced an unfilterable
			// excitation would otherwise pass every other assertion here.
			expect(rms(buffer.samples)).toBeGreaterThan(0.01);
		}
	});

	test("digit durations sit in a plausible speech range", () => {
		const prng = createPrng(createSeed());
		const voice = randomVoice(prng);
		for (const digit of DIGITS) {
			const buffer = synthesiseUtterance(digit, voice, prng, SAMPLE_RATE);
			const ms = (buffer.samples.length / SAMPLE_RATE) * 1000;
			expect(ms).toBeGreaterThan(120);
			expect(ms).toBeLessThan(900);
		}
	});

	test("the same seed reproduces the same audio", () => {
		const seed = createSeed();
		const render = (): Float32Array => {
			const prng = createPrng(seed);
			const voice = randomVoice(prng);
			const first = DIGITS[0];
			if (!first) throw new Error("empty digit table");
			return synthesiseUtterance(first, voice, prng, SAMPLE_RATE).samples;
		};
		expect(Array.from(render())).toEqual(Array.from(render()));
	});

	test("different seeds produce different audio", () => {
		// The whole security argument rests on challenges not repeating.
		const render = (): Float32Array => {
			const prng = createPrng(createSeed());
			const voice = randomVoice(prng);
			const first = DIGITS[0];
			if (!first) throw new Error("empty digit table");
			return synthesiseUtterance(first, voice, prng, SAMPLE_RATE).samples;
		};
		expect(Array.from(render())).not.toEqual(Array.from(render()));
	});

	test("starts and ends near silence so there is no click", () => {
		const prng = createPrng(createSeed());
		const voice = randomVoice(prng);
		const digit = DIGITS[5];
		if (!digit) throw new Error("missing digit");
		const { samples } = synthesiseUtterance(digit, voice, prng, SAMPLE_RATE);
		expect(Math.abs(samples[0] ?? 1)).toBeLessThan(0.02);
		expect(Math.abs(samples[samples.length - 1] ?? 1)).toBeLessThan(0.02);
	});
});

describe("renderAudioChallenge", () => {
	test("answer length matches digitCount and uses only the alphabet", () => {
		for (const digitCount of [3, 5, 8]) {
			const challenge = renderAudioChallenge(cleanSettings({ digitCount }));
			expect(challenge.answer).toHaveLength(digitCount);
			for (const character of challenge.answer) {
				expect(ANSWER_ALPHABET).toContain(character);
			}
		}
	});

	test("emits a valid RIFF/WAVE header the reported length agrees with", () => {
		const challenge = renderAudioChallenge(cleanSettings());
		const { wav } = challenge;

		expect(wav.subarray(0, 4).toString("ascii")).toBe("RIFF");
		expect(wav.subarray(8, 12).toString("ascii")).toBe("WAVE");
		expect(wav.subarray(12, 16).toString("ascii")).toBe("fmt ");
		expect(wav.readUInt16LE(20)).toBe(1); // PCM
		expect(wav.readUInt16LE(22)).toBe(1); // mono
		expect(wav.readUInt32LE(24)).toBe(SAMPLE_RATE);
		expect(wav.readUInt16LE(34)).toBe(16); // bit depth
		expect(wav.subarray(36, 40).toString("ascii")).toBe("data");

		// Header's declared sizes must agree with the actual buffer, or
		// browsers reject or truncate the clip.
		const dataBytes = wav.readUInt32LE(40);
		expect(wav.length).toBe(44 + dataBytes);
		expect(wav.readUInt32LE(4)).toBe(36 + dataBytes);

		const durationMs = (dataBytes / 2 / SAMPLE_RATE) * 1000;
		expect(Math.abs(durationMs - challenge.durationMs)).toBeLessThan(2);
	});

	test("clip is long enough to hold every digit but stays reasonable", () => {
		const challenge = renderAudioChallenge(cleanSettings({ digitCount: 5 }));
		expect(challenge.durationMs).toBeGreaterThan(1500);
		expect(challenge.durationMs).toBeLessThan(12000);
	});

	test("consecutive challenges differ in both answer and audio", () => {
		// A repeated clip is a free training pair for an attacker, so this
		// is a security property rather than a quality one.
		const answers = new Set<string>();
		const digests = new Set<string>();
		for (let i = 0; i < 12; i++) {
			const challenge = renderAudioChallenge(cleanSettings());
			answers.add(challenge.answer);
			digests.add(challenge.wav.toString("base64").slice(0, 256));
		}
		expect(answers.size).toBeGreaterThan(1);
		expect(digests.size).toBe(12);
	});

	test("does not clip: no sample is pinned at the rail", () => {
		const challenge = renderAudioChallenge(DEFAULT_RENDER_SETTINGS);
		const samples = decodeWav(challenge.wav);
		let pinned = 0;
		for (const sample of samples) {
			if (Math.abs(sample) >= 0.999) pinned++;
		}
		// A handful of samples at the peak is normal after normalisation;
		// a run of them means the mix overflowed.
		expect(pinned).toBeLessThan(samples.length * 0.001);
	});

	test("babble adds energy without swamping the foreground", () => {
		const withoutBabble = renderAudioChallenge(
			cleanSettings({ digitCount: 4 }),
		);
		const withBabble = renderAudioChallenge(
			cleanSettings({ digitCount: 4, babbleGain: 0.2, babbleVoices: 2 }),
		);
		// Both are peak-normalised so RMS is the meaningful comparison: a
		// babble track raises the average level without raising the peak.
		expect(rms(decodeWav(withBabble.wav))).toBeGreaterThan(
			rms(decodeWav(withoutBabble.wav)) * 0.5,
		);
	});
});

describe("addNoiseBed", () => {
	test("hits the requested SNR", () => {
		for (const snrDb of [6, 14, 24]) {
			const prng = createPrng(createSeed());
			const signal = new Float32Array(SAMPLE_RATE);
			for (let n = 0; n < signal.length; n++) {
				signal[n] = 0.5 * Math.sin((2 * Math.PI * 440 * n) / SAMPLE_RATE);
			}
			const clean = Float32Array.from(signal);
			const before = rms(clean);

			const buffer = { samples: signal, sampleRate: SAMPLE_RATE };
			addNoiseBed(buffer, prng, snrDb);

			// Recover the noise by differencing rather than by subtracting
			// powers. `after^2 - before^2` only gives the noise power when
			// signal and noise are exactly uncorrelated; over a finite
			// window pink noise has real correlation with a 440 Hz sine
			// (most of its energy is low-frequency), so that estimate
			// carries a cross-term and the test goes flaky. addNoiseBed
			// adds in place, so the difference IS the noise, exactly.
			const noise = new Float32Array(clean.length);
			for (let n = 0; n < noise.length; n++) {
				noise[n] = (buffer.samples[n] ?? 0) - (clean[n] ?? 0);
			}

			const measured = 20 * Math.log10(before / rms(noise));
			expect(Math.abs(measured - snrDb)).toBeLessThan(0.5);
		}
	});

	test("leaves silence alone rather than dividing by zero", () => {
		const prng = createPrng(createSeed());
		const buffer = {
			samples: new Float32Array(1000),
			sampleRate: SAMPLE_RATE,
		};
		addNoiseBed(buffer, prng, 10);
		expect(rms(buffer.samples)).toBe(0);
	});
});

describe("encodeWav", () => {
	test("round-trips samples within 16-bit quantisation error", () => {
		const samples = new Float32Array([0, 0.5, -0.5, 0.999, -0.999]);
		const decoded = decodeWav(encodeWav({ samples, sampleRate: SAMPLE_RATE }));
		for (let n = 0; n < samples.length; n++) {
			expect(Math.abs((decoded[n] ?? 0) - (samples[n] ?? 0))).toBeLessThan(
				1 / 32767,
			);
		}
	});

	test("saturates out-of-range samples instead of wrapping", () => {
		// Wrapping would turn an overshoot into a full-scale click of the
		// opposite sign — the loudest possible artefact.
		const samples = new Float32Array([2, -2]);
		const decoded = decodeWav(encodeWav({ samples, sampleRate: SAMPLE_RATE }));
		expect(decoded[0]).toBeGreaterThan(0.99);
		expect(decoded[1]).toBeLessThan(-0.99);
	});

	test("toDataUri produces a playable audio/wav URI", () => {
		const challenge = renderAudioChallenge(cleanSettings({ digitCount: 2 }));
		const uri = toDataUri(challenge.wav);
		expect(uri.startsWith("data:audio/wav;base64,")).toBe(true);
		const decoded = Buffer.from(uri.split(",")[1] ?? "", "base64");
		expect(decoded.equals(challenge.wav)).toBe(true);
	});
});

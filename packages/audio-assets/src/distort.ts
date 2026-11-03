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

/**
 * Obfuscation on top of the clean speech. Past a low threshold each extra dB
 * of noise costs a human far more than a bot, and audio users are mostly
 * people the visual challenge failed, so defaults favour intelligibility.
 * Babble is the exception worth keeping: overlapping speech is a
 * source-separation problem, which humans are unusually good at.
 */

import type { Prng } from "@prosopo/puzzle-assets";
import { normalise, rms } from "./levels.js";
import type { AudioBuffer } from "./types.js";

const REVERB_COMB_DELAYS_MS = [29.7, 37.1, 41.1, 43.7];
const REVERB_COMB_FEEDBACK = 0.72;
const REVERB_ALLPASS_DELAYS_MS = [5.0, 1.7];
const REVERB_ALLPASS_FEEDBACK = 0.5;
const SOFT_CLIP_DRIVE = 1.2;
const OUTPUT_PEAK = 0.92;

/** Adds `source` into `target` from `offset`; anything past the end is dropped. */
export const mixInto = (
	target: Float32Array,
	source: Float32Array,
	offset: number,
	gain: number,
): void => {
	const start = Math.max(0, Math.floor(offset));
	const count = Math.min(source.length, target.length - start);
	for (let n = 0; n < count; n++) {
		target[start + n] = (target[start + n] ?? 0) + (source[n] ?? 0) * gain;
	}
};

/**
 * Pink-ish noise at `snrDb` below the signal's RMS. Pink rather than white
 * because white noise spends its energy above the formants and masks little.
 */
export const addNoiseBed = (
	buffer: AudioBuffer,
	prng: Prng,
	snrDb: number,
): void => {
	const signalRms = rms(buffer.samples);
	if (signalRms === 0) return;

	const targetRms = signalRms / 10 ** (snrDb / 20);

	// Paul Kellet's economy pink-noise filter (~1/f).
	let b0 = 0;
	let b1 = 0;
	let b2 = 0;
	const noise = new Float32Array(buffer.samples.length);
	for (let n = 0; n < noise.length; n++) {
		const white = prng.next() * 2 - 1;
		b0 = 0.99765 * b0 + white * 0.099;
		b1 = 0.963 * b1 + white * 0.2965;
		b2 = 0.57 * b2 + white * 1.0526;
		noise[n] = (b0 + b1 + b2 + white * 0.1848) * 0.2;
	}

	const noiseRms = rms(noise);
	if (noiseRms === 0) return;
	mixInto(buffer.samples, noise, 0, targetRms / noiseRms);
};

const delaySamples = (delayMs: number, sampleRate: number): number =>
	Math.max(1, Math.round((delayMs / 1000) * sampleRate));

/**
 * Schroeder reverb: parallel combs into series allpasses. Its purpose is to
 * smear onsets, which otherwise make it easy to chop the clip into
 * one-digit segments and classify each in isolation.
 */
export const addReverb = (buffer: AudioBuffer, mix: number): void => {
	if (mix <= 0) return;

	const { samples, sampleRate } = buffer;
	const wet = new Float32Array(samples.length);

	for (const delayMs of REVERB_COMB_DELAYS_MS) {
		const delay = delaySamples(delayMs, sampleRate);
		const line = new Float32Array(delay);
		let index = 0;
		for (let n = 0; n < samples.length; n++) {
			const delayed = line[index] ?? 0;
			wet[n] = (wet[n] ?? 0) + delayed / REVERB_COMB_DELAYS_MS.length;
			line[index] = (samples[n] ?? 0) + delayed * REVERB_COMB_FEEDBACK;
			index = (index + 1) % delay;
		}
	}

	for (const delayMs of REVERB_ALLPASS_DELAYS_MS) {
		const delay = delaySamples(delayMs, sampleRate);
		const line = new Float32Array(delay);
		let index = 0;
		for (let n = 0; n < wet.length; n++) {
			const input = wet[n] ?? 0;
			const delayed = line[index] ?? 0;
			line[index] = input + delayed * REVERB_ALLPASS_FEEDBACK;
			wet[n] = -input * REVERB_ALLPASS_FEEDBACK + delayed;
			index = (index + 1) % delay;
		}
	}

	for (let n = 0; n < samples.length; n++) {
		samples[n] = (samples[n] ?? 0) * (1 - mix) + (wet[n] ?? 0) * mix;
	}
};

/**
 * tanh soft clip, then normalise: hard clipping at 16-bit conversion is
 * audibly nasty and a distinctive artefact.
 */
export const finalise = (buffer: AudioBuffer): void => {
	const { samples } = buffer;
	for (let n = 0; n < samples.length; n++) {
		samples[n] = Math.tanh((samples[n] ?? 0) * SOFT_CLIP_DRIVE);
	}
	normalise(samples, OUTPUT_PEAK);
};

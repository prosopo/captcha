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
 * Obfuscation applied on top of the clean speech.
 *
 * READ THIS BEFORE TURNING THE KNOBS UP.
 *
 * Additive noise does not buy what it looks like it buys. Modern speech
 * recognisers are trained on deliberately augmented audio — noise, reverb,
 * band-limiting, speed perturbation are all standard augmentations — so
 * they degrade far more slowly under exactly these distortions than a
 * human listener does. Past a fairly low threshold, every extra decibel
 * of noise costs a real user more than it costs an attacker, and for this
 * challenge the real users are disproportionately people who chose the
 * audio path because the visual one was not available to them.
 *
 * The defaults are therefore set for intelligibility, not for maximum
 * difficulty, and the durable difficulty work is expected to come from
 * varying *what is asked* rather than from burying the answer in hiss.
 * See the tracking issue.
 *
 * Babble is the one exception worth keeping: overlapping speech is a
 * source-separation problem rather than a denoising one, which is a
 * materially harder class of task, and human listeners are unusually good
 * at it.
 */

import type { Prng } from "./prng.js";
import { normalise } from "./synth.js";
import type { AudioBuffer } from "./types.js";

/** Root-mean-square level. The perceptually useful measure of loudness. */
export const rms = (samples: Float32Array): number => {
	if (samples.length === 0) return 0;
	let total = 0;
	for (let n = 0; n < samples.length; n++) {
		const value = samples[n] ?? 0;
		total += value * value;
	}
	return Math.sqrt(total / samples.length);
};

/**
 * Mix `source` into `target` at `gain`, starting at sample `offset`.
 * Anything past the end of `target` is dropped.
 */
export const mixInto = (
	target: Float32Array,
	source: Float32Array,
	offset: number,
	gain: number,
): void => {
	const start = Math.max(0, Math.floor(offset));
	const count = Math.min(source.length, target.length - start);
	for (let n = 0; n < count; n++) {
		const existing = target[start + n] ?? 0;
		target[start + n] = existing + (source[n] ?? 0) * gain;
	}
};

/**
 * Pink-ish noise bed at the requested SNR relative to the signal's RMS.
 *
 * Pink rather than white because white noise puts most of its energy in
 * the top octaves where speech has almost none — it sounds loud and
 * masks nothing. Pink noise sits over the formants, so it is far more
 * effective per unit of annoyance.
 */
export const addNoiseBed = (
	buffer: AudioBuffer,
	prng: Prng,
	snrDb: number,
): void => {
	const signalRms = rms(buffer.samples);
	if (signalRms === 0) return;

	const targetRms = signalRms / 10 ** (snrDb / 20);

	// Voss-McCartney-ish: sum a few one-pole-filtered white sources with
	// different time constants. Cheap approximation of a 1/f slope.
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
	const gain = targetRms / noiseRms;
	for (let n = 0; n < buffer.samples.length; n++) {
		buffer.samples[n] = (buffer.samples[n] ?? 0) + (noise[n] ?? 0) * gain;
	}
};

/**
 * Schroeder reverb: four parallel comb filters into two series allpasses.
 *
 * The point is not ambience. Reverb smears onsets, and sharp onsets are
 * what makes it easy to chop a clip into one-digit segments and classify
 * each in isolation. A little smearing forces an attacker to handle the
 * clip as continuous speech.
 */
export const addReverb = (buffer: AudioBuffer, mix: number): void => {
	if (mix <= 0) return;

	const { samples, sampleRate } = buffer;
	const combDelaysMs = [29.7, 37.1, 41.1, 43.7];
	const combFeedback = 0.72;
	const allpassDelaysMs = [5.0, 1.7];
	const allpassFeedback = 0.5;

	let wet = Float32Array.from(samples);

	// Parallel combs, summed.
	const combOut = new Float32Array(samples.length);
	for (const delayMs of combDelaysMs) {
		const delay = Math.max(1, Math.round((delayMs / 1000) * sampleRate));
		const line = new Float32Array(delay);
		let index = 0;
		for (let n = 0; n < wet.length; n++) {
			const delayed = line[index] ?? 0;
			combOut[n] = (combOut[n] ?? 0) + delayed / combDelaysMs.length;
			line[index] = (wet[n] ?? 0) + delayed * combFeedback;
			index = (index + 1) % delay;
		}
	}
	wet = combOut;

	// Series allpasses, to break up the comb resonances.
	for (const delayMs of allpassDelaysMs) {
		const delay = Math.max(1, Math.round((delayMs / 1000) * sampleRate));
		const line = new Float32Array(delay);
		let index = 0;
		for (let n = 0; n < wet.length; n++) {
			const input = wet[n] ?? 0;
			const delayed = line[index] ?? 0;
			const output = -input * allpassFeedback + delayed;
			line[index] = input + delayed * allpassFeedback;
			wet[n] = output;
			index = (index + 1) % delay;
		}
	}

	for (let n = 0; n < samples.length; n++) {
		samples[n] = (samples[n] ?? 0) * (1 - mix) + (wet[n] ?? 0) * mix;
	}
};

/**
 * Telephone-style band-limiting, 300 Hz to 3.4 kHz.
 *
 * Deliberately NOT applied by default. It removes the high-frequency
 * energy that separates /s/ from /f/ from /θ/ — which is to say it makes
 * "six", "five" and "three" harder to tell apart — and a recogniser
 * handles that better than a person does. Kept available because it is
 * occasionally the right choice for a bandwidth-constrained deployment.
 */
export const bandLimit = (
	buffer: AudioBuffer,
	lowHz = 300,
	highHz = 3400,
): void => {
	const { samples, sampleRate } = buffer;
	const dt = 1 / sampleRate;

	const lowRc = 1 / (2 * Math.PI * highHz);
	const lowAlpha = dt / (lowRc + dt);
	let lowState = 0;
	for (let n = 0; n < samples.length; n++) {
		lowState += lowAlpha * ((samples[n] ?? 0) - lowState);
		samples[n] = lowState;
	}

	const highRc = 1 / (2 * Math.PI * lowHz);
	const highAlpha = highRc / (highRc + dt);
	let prevIn = 0;
	let prevOut = 0;
	for (let n = 0; n < samples.length; n++) {
		const input = samples[n] ?? 0;
		prevOut = highAlpha * (prevOut + input - prevIn);
		prevIn = input;
		samples[n] = prevOut;
	}
};

/**
 * Soft clip, then normalise.
 *
 * After noise and reverb the sum can exceed ±1, and hard clipping at the
 * 16-bit conversion is both audibly nasty and a distinctive artefact.
 * tanh saturates smoothly instead.
 */
export const finalise = (buffer: AudioBuffer, peak = 0.92): void => {
	const { samples } = buffer;
	for (let n = 0; n < samples.length; n++) {
		samples[n] = Math.tanh((samples[n] ?? 0) * 1.2);
	}
	normalise(samples, peak);
};

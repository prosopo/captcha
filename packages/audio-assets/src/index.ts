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

import { addNoiseBed, addReverb, finalise, mixInto } from "./distort.js";
import { encodeWav } from "./encode.js";
import { DIGITS } from "./phonemes.js";
import { type Prng, createPrng, createSeed } from "./prng.js";
import {
	SAMPLE_RATE,
	type Voice,
	randomVoice,
	synthesiseUtterance,
} from "./synth.js";
import type {
	AudioBuffer,
	AudioRenderSettings,
	RenderedAudioChallenge,
	Utterance,
} from "./types.js";

export { createPrng, createSeed, SEED_BYTES } from "./prng.js";
export type { Prng } from "./prng.js";
export { ANSWER_ALPHABET, DIGITS } from "./phonemes.js";
export {
	SAMPLE_RATE,
	randomVoice,
	synthesiseUtterance,
	normalise,
} from "./synth.js";
export type { Voice } from "./synth.js";
export { encodeWav, toDataUri } from "./encode.js";
export {
	addNoiseBed,
	addReverb,
	bandLimit,
	finalise,
	mixInto,
	rms,
} from "./distort.js";
export type {
	AudioBuffer,
	AudioRenderSettings,
	Excitation,
	Phoneme,
	RenderedAudioChallenge,
	Utterance,
} from "./types.js";

/**
 * Defaults for the per-render tunables. Operators can override any of
 * these per-client (via `ClientSettingsSchema.audio`) or per-traffic
 * category (via `TrafficCategoryPolicySchema.audio`); the provider
 * resolves an effective value and passes it to `renderAudioChallenge`.
 *
 * These are set for intelligibility. See the note at the top of
 * `distort.ts` before raising the difficulty knobs — under this class of
 * distortion a recogniser degrades more slowly than a listener does, so
 * turning them up costs legitimate users more than it costs an attacker.
 */
export const DEFAULT_RENDER_SETTINGS: AudioRenderSettings = {
	digitCount: 5,
	noiseSnrDb: 14,
	babbleGain: 0.16,
	babbleVoices: 2,
	reverbMix: 0.12,
	gapMs: 220,
};

/** Enough headroom for the longest digit at the slowest speaking rate. */
const MAX_UTTERANCE_MS = 900;
const LEAD_IN_MS = 250;
const LEAD_OUT_MS = 350;

/**
 * Pick `count` digits, allowing repeats.
 *
 * Repeats are allowed on purpose: forbidding them would leak information
 * (a solver that has read four digits knows the fifth is one of six
 * rather than one of ten) and shrink the answer space.
 */
const chooseAnswer = (prng: Prng, count: number): Utterance[] => {
	const chosen: Utterance[] = [];
	for (let i = 0; i < count; i++) {
		chosen.push(prng.pick(DIGITS));
	}
	return chosen;
};

/**
 * Render the babble track: other digit names, by other speakers, laid
 * down at random offsets underneath the foreground speech.
 *
 * Babble digits are drawn from the same alphabet as the answer, which is
 * the entire point — a recogniser that transcribes everything it hears
 * gets a longer string than the answer and no marker for which characters
 * were the foreground ones. Human listeners solve this by attending to
 * the loudest, closest voice, which is a thing people are unusually good
 * at and machines are not.
 */
const renderBabble = (
	prng: Prng,
	lengthSamples: number,
	sampleRate: number,
	voices: number,
): Float32Array => {
	const track = new Float32Array(lengthSamples);

	for (let v = 0; v < voices; v++) {
		// Detune each babble speaker well away from the foreground voice's
		// range so the listener has a pitch cue to separate them by.
		const voice: Voice = {
			...randomVoice(prng),
			formantScale: prng.range(0.8, 1.3),
			rate: prng.range(0.75, 1.35),
		};

		let cursor = prng.int(0, Math.floor(sampleRate * 0.4));
		while (cursor < lengthSamples) {
			const word = synthesiseUtterance(
				prng.pick(DIGITS),
				voice,
				prng,
				sampleRate,
			);
			mixInto(track, word.samples, cursor, prng.range(0.6, 1));
			cursor += word.samples.length + prng.int(0, Math.floor(sampleRate * 0.5));
		}
	}

	return track;
};

/**
 * Generate a complete audio challenge.
 *
 * Returns the WAV and the answer together. The answer must be stored on
 * the challenge record and never sent to the client — the puzzle captcha
 * shipped its target coordinates to the browser once, and any client
 * could echo them straight back and pass without rendering anything. The
 * transcript is this challenge's equivalent of those coordinates.
 */
export const renderAudioChallenge = (
	settings: AudioRenderSettings = DEFAULT_RENDER_SETTINGS,
	sampleRate: number = SAMPLE_RATE,
): RenderedAudioChallenge => {
	const prng = createPrng(createSeed());

	const utterances = chooseAnswer(prng, settings.digitCount);
	const answer = utterances.map((u) => u.answer).join("");

	// One voice for the whole foreground so the clip sounds like a single
	// speaker reading a number, not ten people each saying one digit.
	const voice = randomVoice(prng);

	const words = utterances.map((u) =>
		synthesiseUtterance(u, voice, prng, sampleRate),
	);

	const gapSamples = Math.round((settings.gapMs / 1000) * sampleRate);
	const leadIn = Math.round((LEAD_IN_MS / 1000) * sampleRate);
	const leadOut = Math.round((LEAD_OUT_MS / 1000) * sampleRate);

	// Size the buffer from the real rendered lengths rather than the
	// nominal durations — the per-voice rate multiplier means a slow
	// speaker's clip is meaningfully longer than a fast one's.
	const spoken = words.reduce((total, w) => total + w.samples.length, 0);
	const maxJitter = Math.round(
		(Math.min(settings.gapMs, MAX_UTTERANCE_MS) / 1000) * sampleRate * 0.4,
	);
	const totalSamples =
		leadIn +
		spoken +
		gapSamples * Math.max(0, words.length - 1) +
		maxJitter * words.length +
		leadOut;

	const samples = new Float32Array(totalSamples);

	let cursor = leadIn;
	for (const word of words) {
		mixInto(samples, word.samples, cursor, 1);
		// Jitter each gap. A constant inter-digit interval is a free
		// segmentation grid for an attacker: find one boundary and every
		// other boundary follows by arithmetic.
		cursor +=
			word.samples.length + gapSamples + prng.int(-maxJitter / 2, maxJitter);
	}

	const buffer: AudioBuffer = { samples, sampleRate };

	if (settings.babbleGain > 0 && settings.babbleVoices > 0) {
		const babble = renderBabble(
			prng,
			totalSamples,
			sampleRate,
			settings.babbleVoices,
		);
		mixInto(samples, babble, 0, settings.babbleGain);
	}

	addReverb(buffer, settings.reverbMix);
	addNoiseBed(buffer, prng, settings.noiseSnrDb);
	finalise(buffer);

	return {
		wav: encodeWav(buffer),
		answer,
		durationMs: Math.round((totalSamples / sampleRate) * 1000),
	};
};

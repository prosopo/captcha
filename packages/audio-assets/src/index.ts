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

import { type Prng, createPrng, createSeed } from "@prosopo/puzzle-assets";
import { addNoiseBed, addReverb, finalise, mixInto } from "./distort.js";
import { encodeWav } from "./encode.js";
import { DIGITS } from "./phonemes.js";
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

export { createPrng, createSeed } from "@prosopo/puzzle-assets";
export type { Prng } from "@prosopo/puzzle-assets";
export { ANSWER_ALPHABET, DIGITS } from "./phonemes.js";
export { SAMPLE_RATE, randomVoice, synthesiseUtterance } from "./synth.js";
export type { Voice } from "./synth.js";
export { encodeWav, toDataUri } from "./encode.js";
export { addNoiseBed } from "./distort.js";
export { rms } from "./levels.js";
export type {
	AudioBuffer,
	AudioRenderSettings,
	Excitation,
	Phoneme,
	RenderedAudioChallenge,
	Utterance,
} from "./types.js";

/** Must match the `audio*Default` constants in `@prosopo/types` client settings. */
export const DEFAULT_RENDER_SETTINGS: AudioRenderSettings = {
	digitCount: 5,
	noiseSnrDb: 14,
	babbleGain: 0.16,
	babbleVoices: 2,
	reverbMix: 0.12,
	gapMs: 220,
};

const LEAD_IN_MS = 250;
const LEAD_OUT_MS = 350;
const GAP_JITTER_RATIO = 0.4;
const MAX_GAP_JITTER_MS = 360;
const BABBLE_MAX_START_MS = 400;
const BABBLE_MAX_PAUSE_MS = 500;

const msToSamples = (ms: number, sampleRate: number): number =>
	Math.round((ms / 1000) * sampleRate);

/** Repeats allowed: forbidding them would let a solver narrow the last digit from the others. */
const chooseAnswer = (prng: Prng, count: number): Utterance[] =>
	Array.from({ length: count }, (): Utterance => prng.pick(DIGITS));

/**
 * Other digit names by other speakers, from the answer's own alphabet, so
 * transcribing everything audible yields a longer string with no marker for
 * which digits were the foreground ones.
 */
const renderBabble = (
	prng: Prng,
	lengthSamples: number,
	sampleRate: number,
	voices: number,
): Float32Array => {
	const track = new Float32Array(lengthSamples);
	const maxStart = msToSamples(BABBLE_MAX_START_MS, sampleRate);
	const maxPause = msToSamples(BABBLE_MAX_PAUSE_MS, sampleRate);

	for (let v = 0; v < voices; v++) {
		const voice: Voice = {
			...randomVoice(prng),
			formantScale: prng.range(0.8, 1.3),
			rate: prng.range(0.75, 1.35),
		};

		let cursor = prng.int(0, maxStart);
		while (cursor < lengthSamples) {
			const word = synthesiseUtterance(
				prng.pick(DIGITS),
				voice,
				prng,
				sampleRate,
			);
			mixInto(track, word.samples, cursor, prng.range(0.6, 1));
			cursor += word.samples.length + prng.int(0, maxPause);
		}
	}

	return track;
};

/** The returned answer must stay on the challenge record and never reach the client. */
export const renderAudioChallenge = (
	settings: AudioRenderSettings = DEFAULT_RENDER_SETTINGS,
	sampleRate: number = SAMPLE_RATE,
): RenderedAudioChallenge => {
	const prng = createPrng(createSeed());

	const utterances = chooseAnswer(prng, settings.digitCount);
	const answer = utterances.map((u) => u.answer).join("");

	// One foreground voice, so the clip sounds like one person reading a number.
	const voice = randomVoice(prng);
	const words = utterances.map((u) =>
		synthesiseUtterance(u, voice, prng, sampleRate),
	);

	const gapSamples = msToSamples(settings.gapMs, sampleRate);
	const leadIn = msToSamples(LEAD_IN_MS, sampleRate);
	const leadOut = msToSamples(LEAD_OUT_MS, sampleRate);
	const maxJitter = msToSamples(
		Math.min(settings.gapMs * GAP_JITTER_RATIO, MAX_GAP_JITTER_MS),
		sampleRate,
	);

	const spoken = words.reduce((total, w) => total + w.samples.length, 0);
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
		// A constant gap is a segmentation grid: find one boundary and the rest follow.
		cursor +=
			word.samples.length +
			gapSamples +
			prng.int(-Math.floor(maxJitter / 2), maxJitter);
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

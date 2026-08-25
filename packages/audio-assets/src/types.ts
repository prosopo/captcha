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
 * Mono audio at `sampleRate`, samples in [-1, 1]. Everything upstream of
 * `encode.ts` works in floats; quantisation to 16-bit happens once, at the
 * very end, so repeated processing stages don't accumulate rounding error.
 */
export interface AudioBuffer {
	samples: Float32Array;
	sampleRate: number;
}

/**
 * How a phoneme is excited.
 *
 * - `voiced` — glottal pulse train through the formant cascade (vowels,
 *   nasals, approximants).
 * - `unvoiced` — band-limited noise only (/s/, /f/, /θ/, stop bursts).
 * - `mixed` — both at once, which is what a voiced fricative (/z/, /v/)
 *   actually is: vocal-fold buzz plus turbulence at the constriction.
 * - `silence` — the closure before a stop burst. Not decorative: without
 *   the gap a /t/ reads as a click rather than a plosive.
 */
export type Excitation = "voiced" | "unvoiced" | "mixed" | "silence";

/**
 * One segment of a word.
 *
 * Formants are the resonances of the vocal tract; three is enough for
 * intelligible digit-name speech. Values are steady-state targets — the
 * synthesiser interpolates between consecutive segments so transitions are
 * co-articulated rather than stepped. That interpolation is what makes the
 * difference between "recognisable word" and "sequence of tones"; the
 * formant *transition* into a consonant is most of the cue for which
 * consonant it was.
 */
export interface Phoneme {
	/** Debug label, e.g. "IY". Never surfaced to the client. */
	readonly id: string;
	readonly excitation: Excitation;
	/** [F1, F2, F3] in Hz. Ignored for `unvoiced` and `silence`. */
	readonly formants: readonly [number, number, number];
	/** Formant bandwidths in Hz, same order. Wider = more damped. */
	readonly bandwidths: readonly [number, number, number];
	/** Nominal duration in ms at normal speaking rate. */
	readonly durationMs: number;
	/** Linear gain on the voiced branch, 0..1. */
	readonly voiceGain: number;
	/** Linear gain on the noise branch, 0..1. */
	readonly noiseGain: number;
	/** Centre frequency of the noise band in Hz. Only read when noiseGain > 0. */
	readonly noiseCentreHz: number;
	/** Bandwidth of the noise band in Hz. */
	readonly noiseBandwidthHz: number;
	/**
	 * When true the synthesiser does not interpolate *into* this segment
	 * from its predecessor. Used for stop bursts, where a smooth formant
	 * glide would smear the burst that identifies the consonant.
	 */
	readonly abrupt?: boolean;
}

/** A pronounceable token: the answer character plus how to say it. */
export interface Utterance {
	/** What the user must type. Single character. */
	readonly answer: string;
	readonly phonemes: readonly Phoneme[];
}

/**
 * Per-render tunables. Bounds are enforced upstream in
 * `packages/types/src/client/settings.ts`; this interface carries resolved
 * effective values into the DSP.
 */
export interface AudioRenderSettings {
	/** How many characters are spoken. More = harder for everyone. */
	digitCount: number;
	/**
	 * Signal-to-noise ratio in dB against the additive noise bed. Lower is
	 * noisier. Note this trades against humans at least as fast as it
	 * trades against a recogniser — see the package README-in-comments at
	 * the top of `distort.ts`.
	 */
	noiseSnrDb: number;
	/**
	 * Gain of the background babble track relative to the foreground
	 * speech, 0..1. Babble is other digit names rendered by other
	 * synthetic speakers and played underneath. 0 disables.
	 */
	babbleGain: number;
	/** How many babble speakers to mix in. Ignored when babbleGain is 0. */
	babbleVoices: number;
	/** Reverb wet mix, 0..1. Small amounts smear onset cues. */
	reverbMix: number;
	/**
	 * Gap between spoken characters in ms, before jitter. Wider gaps are
	 * easier for humans (and for segment-then-classify attacks).
	 */
	gapMs: number;
}

export interface RenderedAudioChallenge {
	/** RIFF/WAVE, 16-bit PCM mono. */
	wav: Buffer;
	/**
	 * The spoken characters, in order. NEVER leaves the provider — it is
	 * the answer. Lives only on the challenge record.
	 */
	answer: string;
	durationMs: number;
}

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

/** Mono audio, samples in [-1, 1]. Quantised to 16-bit only once, at encode. */
export interface AudioBuffer {
	samples: Float32Array;
	sampleRate: number;
}

/**
 * `mixed` is a voiced fricative (/z/, /v/): buzz plus turbulence.
 * `silence` is a stop closure; without it a /t/ reads as a click.
 */
export type Excitation = "voiced" | "unvoiced" | "mixed" | "silence";

/**
 * Formants are steady-state targets; the synthesiser glides between
 * consecutive segments, because the formant transition into a consonant
 * carries most of its identity.
 */
export interface Phoneme {
	/** Debug label only; never sent to the client. */
	readonly id: string;
	readonly excitation: Excitation;
	/** [F1, F2, F3] in Hz. Ignored for `unvoiced` and `silence`. */
	readonly formants: readonly [number, number, number];
	readonly bandwidths: readonly [number, number, number];
	/** At normal speaking rate. */
	readonly durationMs: number;
	readonly voiceGain: number;
	readonly noiseGain: number;
	readonly noiseCentreHz: number;
	readonly noiseBandwidthHz: number;
	/** Skip the glide into this segment; smoothing a stop burst destroys it. */
	readonly abrupt?: boolean;
}

export interface Utterance {
	/** The single character the user must type. */
	readonly answer: string;
	readonly phonemes: readonly Phoneme[];
}

/** Resolved values; bounds are enforced in `@prosopo/types` client settings. */
export interface AudioRenderSettings {
	digitCount: number;
	/** Against the additive noise bed. Lowering it hurts listeners more than bots. */
	noiseSnrDb: number;
	/** Background babble of other digit names, relative to the foreground. 0 disables. */
	babbleGain: number;
	babbleVoices: number;
	reverbMix: number;
	/** Before jitter. */
	gapMs: number;
}

export interface RenderedAudioChallenge {
	/** RIFF/WAVE, 16-bit PCM mono. */
	wav: Buffer;
	/** The spoken digits. Must never leave the provider. */
	answer: string;
	durationMs: number;
}

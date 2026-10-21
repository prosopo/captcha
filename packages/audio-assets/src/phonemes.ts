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
 * English digit names. Formants are Peterson & Barney adult-male vowel
 * measurements, rounded; the synthesiser scales them per speaker.
 *
 * Letters are excluded: the E-set (B, C, D, E, G, P, T, V, Z) differs only
 * by a short onset and collapses under noise.
 */

import type { Phoneme, Utterance } from "./types.js";

const STOP_BURST_MS = 18;
const VOICED_FRICATIVE_VOICE_GAIN = 0.45;
const NASAL_VOICE_GAIN = 0.5;
const APPROXIMANT_VOICE_GAIN = 0.85;

const segmentDefaults = {
	bandwidths: [80, 110, 160] as const,
	voiceGain: 1,
	noiseGain: 0,
	noiseCentreHz: 0,
	noiseBandwidthHz: 0,
};

const vowel = (
	id: string,
	f1: number,
	f2: number,
	f3: number,
	durationMs: number,
): Phoneme => ({
	...segmentDefaults,
	id,
	excitation: "voiced",
	formants: [f1, f2, f3],
	durationMs,
});

const fricative = (
	id: string,
	centreHz: number,
	bandwidthHz: number,
	gain: number,
	durationMs: number,
): Phoneme => ({
	...segmentDefaults,
	id,
	excitation: "unvoiced",
	formants: [0, 0, 0],
	durationMs,
	voiceGain: 0,
	noiseGain: gain,
	noiseCentreHz: centreHz,
	noiseBandwidthHz: bandwidthHz,
});

const voicedFricative = (
	id: string,
	f1: number,
	f2: number,
	f3: number,
	centreHz: number,
	bandwidthHz: number,
	gain: number,
	durationMs: number,
): Phoneme => ({
	...segmentDefaults,
	id,
	excitation: "mixed",
	formants: [f1, f2, f3],
	durationMs,
	voiceGain: VOICED_FRICATIVE_VOICE_GAIN,
	noiseGain: gain,
	noiseCentreHz: centreHz,
	noiseBandwidthHz: bandwidthHz,
});

const nasal = (
	id: string,
	f1: number,
	f2: number,
	f3: number,
	durationMs: number,
): Phoneme => ({
	...segmentDefaults,
	id,
	excitation: "voiced",
	formants: [f1, f2, f3],
	bandwidths: [180, 250, 320],
	durationMs,
	voiceGain: NASAL_VOICE_GAIN,
});

const closure = (id: string, durationMs: number): Phoneme => ({
	...segmentDefaults,
	id,
	excitation: "silence",
	formants: [0, 0, 0],
	durationMs,
	voiceGain: 0,
});

const burst = (
	id: string,
	centreHz: number,
	bandwidthHz: number,
	gain: number,
): Phoneme => ({
	...segmentDefaults,
	id,
	excitation: "unvoiced",
	formants: [0, 0, 0],
	durationMs: STOP_BURST_MS,
	voiceGain: 0,
	noiseGain: gain,
	noiseCentreHz: centreHz,
	noiseBandwidthHz: bandwidthHz,
	abrupt: true,
});

const IY = vowel("IY", 270, 2290, 3010, 150);
const IH = vowel("IH", 390, 1990, 2550, 95);
const EH = vowel("EH", 530, 1840, 2480, 110);
const AH = vowel("AH", 640, 1190, 2390, 105);
const AA = vowel("AA", 730, 1090, 2440, 140);
const AO = vowel("AO", 570, 840, 2410, 150);
const UW = vowel("UW", 300, 870, 2240, 140);
const OW_OFF = vowel("OW^", 330, 900, 2300, 90);

// /r/ is identified almost entirely by its low F3.
const R: Phoneme = {
	...vowel("R", 490, 1350, 1690, 85),
	voiceGain: APPROXIMANT_VOICE_GAIN,
};
const W: Phoneme = {
	...vowel("W", 300, 610, 2200, 70),
	voiceGain: APPROXIMANT_VOICE_GAIN,
};

const N = nasal("N", 250, 1750, 2600, 90);

const S = fricative("S", 5800, 3200, 0.5, 130);
const F = fricative("F", 4200, 5000, 0.24, 120);
const TH = fricative("TH", 5200, 5600, 0.2, 110);
const Z = voicedFricative("Z", 300, 1600, 2500, 5200, 3000, 0.3, 110);
const V = voicedFricative("V", 320, 1100, 2400, 4000, 4600, 0.16, 95);

const T = [closure("T-", 45), burst("T+", 3800, 3400, 0.55)] as const;
const K = [closure("K-", 45), burst("K+", 2100, 2200, 0.5)] as const;

// Diphthongs are two segments; the synthesiser's formant glide joins them.
const AY = [AA, { ...IY, durationMs: 110 }] as const;
const EY = [EH, { ...IY, durationMs: 105 }] as const;
const OW = [AO, OW_OFF] as const;

/** "zero", not "oh": a lone vowel with no consonant anchor is the first thing lost to noise. */
export const DIGITS: readonly Utterance[] = [
	{ answer: "0", phonemes: [Z, IH, R, ...OW] },
	{ answer: "1", phonemes: [W, AH, N] },
	{ answer: "2", phonemes: [...T, UW] },
	{ answer: "3", phonemes: [TH, R, IY] },
	{ answer: "4", phonemes: [F, AO, R] },
	{ answer: "5", phonemes: [F, ...AY, V] },
	{ answer: "6", phonemes: [S, IH, ...K, S] },
	{ answer: "7", phonemes: [S, EH, V, AH, N] },
	{ answer: "8", phonemes: [...EY, ...T] },
	{ answer: "9", phonemes: [N, ...AY, N] },
];

export const ANSWER_ALPHABET: string = DIGITS.map((d) => d.answer).join("");

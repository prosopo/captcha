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
 * Phoneme inventory for spoken English digit names, and the digit words
 * built from it.
 *
 * Formant values are the classic Peterson & Barney adult-male vowel
 * measurements, rounded. They are deliberately *not* tuned to sound like
 * any particular person: the synthesiser applies a per-speaker frequency
 * scale on top, so one table serves every voice the generator produces.
 *
 * Scope is English digits only. Letters are excluded on purpose — the
 * English letter set contains the "E-set" (B, C, D, E, G, P, T, V, Z),
 * nine names distinguished only by a short consonant onset before an
 * identical vowel. Under the noise this generator adds they collapse into
 * each other, and the humans who need the audio path most are the ones who
 * would pay for it. Adding other languages means a second table plus a
 * per-locale input UI; see the issue for the plan.
 */

import type { Phoneme, Utterance } from "./types.js";

/** Defaults shared by most segments, so each entry states only what differs. */
const base = {
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
	...base,
	id,
	excitation: "voiced",
	formants: [f1, f2, f3],
	durationMs,
});

/**
 * Unvoiced fricative: noise only, shaped by a single band. The band centre
 * is the whole identity of the sound — /s/ sits high and narrow, /f/ and
 * /θ/ are broad and weak, which is exactly why they're the pair humans
 * confuse most.
 */
const fricative = (
	id: string,
	centreHz: number,
	bandwidthHz: number,
	gain: number,
	durationMs: number,
): Phoneme => ({
	...base,
	id,
	excitation: "unvoiced",
	formants: [0, 0, 0],
	durationMs,
	voiceGain: 0,
	noiseGain: gain,
	noiseCentreHz: centreHz,
	noiseBandwidthHz: bandwidthHz,
});

/** Voiced fricative: buzz plus turbulence. */
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
	...base,
	id,
	excitation: "mixed",
	formants: [f1, f2, f3],
	durationMs,
	voiceGain: 0.45,
	noiseGain: gain,
	noiseCentreHz: centreHz,
	noiseBandwidthHz: bandwidthHz,
});

/**
 * Nasal murmur. Low F1, heavily damped, quiet — the acoustic signature of
 * air leaving through the nose while the mouth is closed.
 */
const nasal = (
	id: string,
	f1: number,
	f2: number,
	f3: number,
	durationMs: number,
): Phoneme => ({
	...base,
	id,
	excitation: "voiced",
	formants: [f1, f2, f3],
	bandwidths: [180, 250, 320],
	durationMs,
	voiceGain: 0.5,
});

/** Silent closure preceding a stop burst. */
const closure = (id: string, durationMs: number): Phoneme => ({
	...base,
	id,
	excitation: "silence",
	formants: [0, 0, 0],
	durationMs,
	voiceGain: 0,
});

/** Stop burst: a very short, abrupt noise transient. */
const burst = (
	id: string,
	centreHz: number,
	bandwidthHz: number,
	gain: number,
): Phoneme => ({
	...base,
	id,
	excitation: "unvoiced",
	formants: [0, 0, 0],
	durationMs: 18,
	voiceGain: 0,
	noiseGain: gain,
	noiseCentreHz: centreHz,
	noiseBandwidthHz: bandwidthHz,
	abrupt: true,
});

// ── Vowels ────────────────────────────────────────────────────────────
const IY = vowel("IY", 270, 2290, 3010, 150);
const IH = vowel("IH", 390, 1990, 2550, 95);
const EH = vowel("EH", 530, 1840, 2480, 110);
const AH = vowel("AH", 640, 1190, 2390, 105);
const AA = vowel("AA", 730, 1090, 2440, 140);
const AO = vowel("AO", 570, 840, 2410, 150);
const UW = vowel("UW", 300, 870, 2240, 140);
const OW_OFF = vowel("OW^", 330, 900, 2300, 90);

// ── Approximants ──────────────────────────────────────────────────────
// /r/ is identified almost entirely by its unusually low F3 — the single
// most distinctive formant target in the inventory.
const R = { ...vowel("R", 490, 1350, 1690, 85), voiceGain: 0.85 };
const W = { ...vowel("W", 300, 610, 2200, 70), voiceGain: 0.85 };

// ── Nasals ────────────────────────────────────────────────────────────
const N = nasal("N", 250, 1750, 2600, 90);

// ── Fricatives ────────────────────────────────────────────────────────
const S = fricative("S", 5800, 3200, 0.5, 130);
const F = fricative("F", 4200, 5000, 0.24, 120);
const TH = fricative("TH", 5200, 5600, 0.2, 110);
const Z = voicedFricative("Z", 300, 1600, 2500, 5200, 3000, 0.3, 110);
const V = voicedFricative("V", 320, 1100, 2400, 4000, 4600, 0.16, 95);

// ── Stops ─────────────────────────────────────────────────────────────
const T = [closure("T-", 45), burst("T+", 3800, 3400, 0.55)] as const;
const K = [closure("K-", 45), burst("K+", 2100, 2200, 0.5)] as const;

/**
 * Diphthongs are written as two segments. The synthesiser's formant
 * interpolation turns the pair into the glide; there is no separate
 * diphthong machinery.
 */
const AY = [AA, { ...IY, durationMs: 110 }] as const;
const EY = [EH, { ...IY, durationMs: 105 }] as const;
const OW = [AO, OW_OFF] as const;

/**
 * The digit names.
 *
 * "zero" rather than "oh" — "oh" is a single vowel with no consonant
 * anchor and is the first thing to disappear under noise.
 */
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

/** Every character the grader will ever have to accept. */
export const ANSWER_ALPHABET: string = DIGITS.map((d) => d.answer).join("");

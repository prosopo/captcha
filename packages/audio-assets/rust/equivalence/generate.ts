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

import crypto, { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { fileURLToPath } from "node:url";
import { type Prng, createPrng } from "@prosopo/puzzle-assets";
import {
	addNoiseBed,
	addReverb,
	finalise,
	mixInto,
} from "../../src/distort.js";
import { encodeWav, toDataUri } from "../../src/encode.js";
import { DEFAULT_RENDER_SETTINGS, renderAudioChallenge } from "../../src/index.js";
import { normalise, rms } from "../../src/levels.js";
import { ANSWER_ALPHABET, DIGITS } from "../../src/phonemes.js";
import {
	SAMPLE_RATE,
	type Voice,
	randomVoice,
	synthesiseUtterance,
} from "../../src/synth.js";
import type {
	AudioBuffer,
	AudioRenderSettings,
	Utterance,
} from "../../src/types.js";

// Floats travel as the hex of their IEEE-754 bits, big-endian, so the Rust side
// compares bit patterns rather than trusting a decimal round trip.
const bits = (value: number): string => {
	const view = new DataView(new ArrayBuffer(8));
	view.setFloat64(0, value);
	return Buffer.from(view.buffer).toString("hex");
};

const sha256 = (data: Uint8Array): string =>
	createHash("sha256").update(data).digest("hex");

const pcmBytes = (samples: Float32Array): Buffer =>
	Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength);

interface PcmDigest {
	length: number;
	sha256: string;
	rms: string;
	head: string;
}

const pcmDigest = (samples: Float32Array): PcmDigest => ({
	length: samples.length,
	sha256: sha256(pcmBytes(samples)),
	rms: bits(rms(samples)),
	head: pcmBytes(samples.subarray(0, 8)).toString("hex"),
});

const errorMessage = (fn: () => unknown): string => {
	try {
		fn();
	} catch (error) {
		return error instanceof Error ? error.message : String(error);
	}
	throw new Error("expected an error");
};

const seedAt = (i: number): Buffer => {
	const seed = Buffer.alloc(16);
	seed.writeUInt32LE((i * 2_654_435_761) >>> 0, 0);
	seed.writeUInt32LE((i * 40_503 + 7) >>> 0, 4);
	seed.writeUInt32LE((i ^ 0x9e37_79b9) >>> 0, 8);
	seed.writeUInt32LE((i * 97 + 13) >>> 0, 12);
	return seed;
};

const hex = (seed: Buffer): string => seed.toString("hex");

/**
 * `renderAudioChallenge` seeds itself from `createSeed()`, which reads
 * `randomBytes` through puzzle-assets' ESM import of `node:crypto`. Patching
 * the builtin and syncing its ESM exports is the only way to inject a seed
 * without changing the TS.
 */
const withSeed = <T>(seed: Buffer, fn: () => T): T => {
	const original = crypto.randomBytes;
	const fixed = (size: number): Buffer => Buffer.from(seed.subarray(0, size));
	crypto.randomBytes = fixed as typeof crypto.randomBytes;
	syncBuiltinESMExports();
	try {
		return fn();
	} finally {
		crypto.randomBytes = original;
		syncBuiltinESMExports();
	}
};

// Inputs drawn from the ranges the synthesiser feeds each function, plus the
// edges of fdlibm's argument reduction.
const mathInputs = (
	prng: Prng,
	count: number,
	draw: (p: Prng) => number,
	edges: number[],
): number[] => [...edges, ...Array.from({ length: count }, () => draw(prng))];

const mathPrng = createPrng(seedAt(9001));
const cosInputs = mathInputs(
	mathPrng,
	600,
	(p) => {
		const pick = p.int(0, 3);
		if (pick === 0) return (2 * Math.PI * p.range(1, 7900)) / SAMPLE_RATE;
		if (pick === 1) return Math.PI * p.next();
		if (pick === 2) return (Math.PI / 2) * p.next();
		return p.range(-1e5, 1e5);
	},
	[
		0,
		-0,
		1e-9,
		Math.PI / 4,
		Math.PI / 2,
		(3 * Math.PI) / 4,
		Math.PI,
		-Math.PI,
		2 * Math.PI,
		10 * Math.PI,
		1e5,
		823_549,
		Number.NaN,
		Number.POSITIVE_INFINITY,
	],
);
const tanhInputs = mathInputs(
	mathPrng,
	400,
	(p) => (p.next() - 0.5) * 2 ** p.int(-30, 6),
	[0, -0, 1e-300, 2 ** -29, 0.5, 1, -1, 21.9, 22, 30, -30, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY],
);
const expInputs = mathInputs(
	mathPrng,
	300,
	(p) => (-Math.PI * p.range(10, 6000)) / p.int(8000, 48000),
	[0, -0, 1, -1, 1e-10, -745.2, 709.8],
);
const powInputs = mathInputs(
	mathPrng,
	200,
	(p) => p.range(-60, 120) / 20,
	[0, -0.5, 0.7, 3, 6, -3, 1.2],
);

interface MathVectors {
	cos: [string, string][];
	tanh: [string, string][];
	exp: [string, string][];
	pow10: [string, string][];
}

const unary = (inputs: number[], fn: (x: number) => number): [string, string][] =>
	inputs.map((x): [string, string] => [bits(x), bits(fn(x))]);

const math: MathVectors = {
	cos: unary(cosInputs, Math.cos),
	tanh: unary(tanhInputs, Math.tanh),
	exp: unary(expInputs, Math.exp),
	pow10: unary(powInputs, (x) => 10 ** x),
};

interface VoiceBits {
	f0Hz: string;
	f0DriftRatio: string;
	formantScale: string;
	rate: string;
	tiltCornerHz: string;
}

const voiceBits = (voice: Voice): VoiceBits => ({
	f0Hz: bits(voice.f0Hz),
	f0DriftRatio: bits(voice.f0DriftRatio),
	formantScale: bits(voice.formantScale),
	rate: bits(voice.rate),
	tiltCornerHz: bits(voice.tiltCornerHz),
});

interface PhonemeVector {
	seed: string;
	digit: number;
	/** Indices into the digit's phoneme list, synthesised as one utterance. */
	phonemes: number[];
	sampleRate: number;
	voice: VoiceBits;
	pcm: PcmDigest;
	nextAfter: string;
}

const synthesise = (
	seed: Buffer,
	utterance: Utterance,
	sampleRate: number,
): { voice: Voice; samples: Float32Array; nextAfter: number } => {
	const prng = createPrng(seed);
	const voice = randomVoice(prng);
	const { samples } = synthesiseUtterance(utterance, voice, prng, sampleRate);
	return { voice, samples, nextAfter: prng.next() };
};

const phonemeVectors: PhonemeVector[] = [];
DIGITS.forEach((digit, d) => {
	const spans: number[][] = digit.phonemes.map((_, i) => [i]);
	for (let i = 1; i < digit.phonemes.length; i++) spans.push([i - 1, i]);
	spans.forEach((span, s) => {
		const seed = seedAt(100 + d * 20 + s);
		const sampleRate = s % 3 === 2 ? 8000 : SAMPLE_RATE;
		const utterance: Utterance = {
			answer: digit.answer,
			phonemes: span.map((i) => {
				const phoneme = digit.phonemes[i];
				if (!phoneme) throw new Error("phoneme index out of range");
				return phoneme;
			}),
		};
		const { voice, samples, nextAfter } = synthesise(seed, utterance, sampleRate);
		phonemeVectors.push({
			seed: hex(seed),
			digit: d,
			phonemes: span,
			sampleRate,
			voice: voiceBits(voice),
			pcm: pcmDigest(samples),
			nextAfter: bits(nextAfter),
		});
	});
});

interface DigitVector {
	seed: string;
	digit: number;
	sampleRate: number;
	pcm: PcmDigest;
	nextAfter: string;
}

const digitVectors: DigitVector[] = [];
for (const [r, sampleRate] of [16000, 8000, 22050, 44100, 11025].entries()) {
	DIGITS.forEach((digit, d) => {
		const seed = seedAt(1000 + r * 10 + d);
		const { samples, nextAfter } = synthesise(seed, digit, sampleRate);
		digitVectors.push({
			seed: hex(seed),
			digit: d,
			sampleRate,
			pcm: pcmDigest(samples),
			nextAfter: bits(nextAfter),
		});
	});
}

const sine = (length: number, hz: number, amplitude: number): Float32Array => {
	const out = new Float32Array(length);
	for (let n = 0; n < length; n++) {
		out[n] = amplitude * Math.sin((2 * Math.PI * hz * n) / SAMPLE_RATE);
	}
	return out;
};

/** A seeded test signal; samples are stored as the f32 bits so the Rust side starts from the same input. */
const testSignal = (seed: number, length: number, scale: number): Float32Array => {
	const prng = createPrng(seedAt(seed));
	const out = new Float32Array(length);
	for (let n = 0; n < length; n++) out[n] = (prng.next() * 2 - 1) * scale;
	return out;
};

interface NoiseBedVector {
	input: string;
	seed: string;
	snrDb: string;
	pcm: PcmDigest;
	nextAfter: string;
}

const noiseInputs: Float32Array[] = [
	sine(SAMPLE_RATE, 440, 0.5),
	testSignal(1, 3000, 0.8),
	new Float32Array(1000),
	new Float32Array(0),
];
const noiseBedVectors: NoiseBedVector[] = [];
noiseInputs.forEach((input, i) => {
	for (const [j, snrDb] of [6, 14, 24, 60, 0, -12.5].entries()) {
		const seed = seedAt(2000 + i * 10 + j);
		const prng = createPrng(seed);
		const buffer: AudioBuffer = {
			samples: Float32Array.from(input),
			sampleRate: SAMPLE_RATE,
		};
		addNoiseBed(buffer, prng, snrDb);
		noiseBedVectors.push({
			input: pcmBytes(input).toString("hex"),
			seed: hex(seed),
			snrDb: bits(snrDb),
			pcm: pcmDigest(buffer.samples),
			nextAfter: bits(prng.next()),
		});
	}
});

interface BufferOpVector {
	op: "reverb" | "finalise" | "normalise" | "mixInto";
	input: string;
	sampleRate: number;
	/** reverb mix, normalise peak, or mixInto gain. */
	param: string;
	/** mixInto only. */
	source: string;
	offset: string;
	pcm: PcmDigest;
}

const bufferOps: BufferOpVector[] = [];
const opInputs: Float32Array[] = [
	testSignal(3, 4000, 0.9),
	testSignal(4, 777, 3),
	sine(2500, 220, 1.4),
	new Float32Array(16),
];
opInputs.forEach((input, i) => {
	for (const mix of [0.12, 0.5, 1, 0, -0.2]) {
		for (const sampleRate of [16000, 8000, 44100]) {
			const buffer: AudioBuffer = { samples: Float32Array.from(input), sampleRate };
			addReverb(buffer, mix);
			bufferOps.push({
				op: "reverb",
				input: pcmBytes(input).toString("hex"),
				sampleRate,
				param: bits(mix),
				source: "",
				offset: bits(0),
				pcm: pcmDigest(buffer.samples),
			});
		}
	}
	const finalised: AudioBuffer = { samples: Float32Array.from(input), sampleRate: SAMPLE_RATE };
	finalise(finalised);
	bufferOps.push({
		op: "finalise",
		input: pcmBytes(input).toString("hex"),
		sampleRate: SAMPLE_RATE,
		param: bits(0),
		source: "",
		offset: bits(0),
		pcm: pcmDigest(finalised.samples),
	});
	for (const peak of [0.9, 0.92, 1, 0.123]) {
		const samples = Float32Array.from(input);
		normalise(samples, peak);
		bufferOps.push({
			op: "normalise",
			input: pcmBytes(input).toString("hex"),
			sampleRate: SAMPLE_RATE,
			param: bits(peak),
			source: "",
			offset: bits(0),
			pcm: pcmDigest(samples),
		});
	}
	const source = testSignal(50 + i, 300, 0.7);
	for (const [offset, gain] of [
		[0, 1],
		[10.7, 0.16],
		[-25.2, 0.5],
		[input.length - 100, 2],
		[input.length + 5, 1],
		[Number.NaN, 1],
	] as const) {
		const target = Float32Array.from(input);
		mixInto(target, source, offset, gain);
		bufferOps.push({
			op: "mixInto",
			input: pcmBytes(input).toString("hex"),
			sampleRate: SAMPLE_RATE,
			param: bits(gain),
			source: pcmBytes(source).toString("hex"),
			offset: bits(offset),
			pcm: pcmDigest(target),
		});
	}
});

interface EncodeVector {
	samples: string;
	sampleRate: number;
	wav: string;
	dataUri: string;
}

const encodeInputs: number[][] = [
	[],
	[0, 0.5, -0.5, 0.999, -0.999],
	[2, -2, 1, -1, 1.0000001, -1.0000001],
	[0.5 / 32767, -0.5 / 32767, 1.5 / 32767, -1.5 / 32767, 2.5 / 32767, -2.5 / 32767],
	[-0, 1e-30, -1e-30, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY],
	Array.from(testSignal(7, 200, 1.1)),
];
const encodeVectors: EncodeVector[] = [];
for (const values of encodeInputs) {
	for (const sampleRate of [16000, 44100, 1]) {
		const samples = Float32Array.from(values);
		const wav = encodeWav({ samples, sampleRate });
		encodeVectors.push({
			samples: pcmBytes(samples).toString("hex"),
			sampleRate,
			wav: wav.toString("hex"),
			dataUri: toDataUri(wav),
		});
	}
}

interface EncodeErrorVector {
	sampleRate: number;
	message: string;
}

const encodeErrors: EncodeErrorVector[] = [2 ** 31, 2 ** 31 + 1, 2 ** 32 - 1].map(
	(sampleRate): EncodeErrorVector => ({
		sampleRate,
		message: errorMessage(() =>
			encodeWav({ samples: new Float32Array(0), sampleRate }),
		),
	}),
);

interface SettingsBits {
	digitCount: string;
	noiseSnrDb: string;
	babbleGain: string;
	babbleVoices: string;
	reverbMix: string;
	gapMs: string;
}

const settingsBits = (settings: AudioRenderSettings): SettingsBits => ({
	digitCount: bits(settings.digitCount),
	noiseSnrDb: bits(settings.noiseSnrDb),
	babbleGain: bits(settings.babbleGain),
	babbleVoices: bits(settings.babbleVoices),
	reverbMix: bits(settings.reverbMix),
	gapMs: bits(settings.gapMs),
});

interface RenderVector {
	seed: string;
	settings: SettingsBits;
	sampleRate: number;
	answer: string;
	durationMs: string;
	wavLength: number;
	wavSha256: string;
}

interface RenderErrorVector {
	seed: string;
	settings: SettingsBits;
	sampleRate: number;
	message: string;
}

const clean: AudioRenderSettings = {
	...DEFAULT_RENDER_SETTINGS,
	noiseSnrDb: 60,
	babbleGain: 0,
	babbleVoices: 0,
	reverbMix: 0,
};

const renderCases: [AudioRenderSettings, number][] = [
	[DEFAULT_RENDER_SETTINGS, SAMPLE_RATE],
	[DEFAULT_RENDER_SETTINGS, SAMPLE_RATE],
	[DEFAULT_RENDER_SETTINGS, SAMPLE_RATE],
	[DEFAULT_RENDER_SETTINGS, SAMPLE_RATE],
	[clean, SAMPLE_RATE],
	[{ ...clean, digitCount: 3 }, SAMPLE_RATE],
	[{ ...clean, digitCount: 8 }, SAMPLE_RATE],
	[{ ...clean, digitCount: 2 }, SAMPLE_RATE],
	[{ ...clean, digitCount: 4, babbleGain: 0.2, babbleVoices: 2 }, SAMPLE_RATE],
	[{ ...DEFAULT_RENDER_SETTINGS, digitCount: 0 }, SAMPLE_RATE],
	[{ ...DEFAULT_RENDER_SETTINGS, digitCount: 1 }, SAMPLE_RATE],
	[{ ...DEFAULT_RENDER_SETTINGS, digitCount: 2.7 }, SAMPLE_RATE],
	[{ ...DEFAULT_RENDER_SETTINGS, digitCount: -3 }, SAMPLE_RATE],
	[{ ...DEFAULT_RENDER_SETTINGS, digitCount: Number.NaN }, SAMPLE_RATE],
	[{ ...DEFAULT_RENDER_SETTINGS, digitCount: 6, noiseSnrDb: 6 }, SAMPLE_RATE],
	[{ ...DEFAULT_RENDER_SETTINGS, noiseSnrDb: 24, reverbMix: 0.3 }, SAMPLE_RATE],
	[{ ...DEFAULT_RENDER_SETTINGS, noiseSnrDb: -5 }, SAMPLE_RATE],
	[{ ...DEFAULT_RENDER_SETTINGS, babbleVoices: 1.5, babbleGain: 0.3 }, SAMPLE_RATE],
	[{ ...DEFAULT_RENDER_SETTINGS, babbleVoices: 4, babbleGain: 0.5 }, SAMPLE_RATE],
	[{ ...DEFAULT_RENDER_SETTINGS, babbleVoices: 2, babbleGain: -0.1 }, SAMPLE_RATE],
	[{ ...DEFAULT_RENDER_SETTINGS, reverbMix: 1 }, SAMPLE_RATE],
	[{ ...DEFAULT_RENDER_SETTINGS, reverbMix: Number.NaN }, SAMPLE_RATE],
	[{ ...DEFAULT_RENDER_SETTINGS, noiseSnrDb: Number.NaN }, SAMPLE_RATE],
	[{ ...DEFAULT_RENDER_SETTINGS, gapMs: 0 }, SAMPLE_RATE],
	[{ ...DEFAULT_RENDER_SETTINGS, gapMs: 1500 }, SAMPLE_RATE],
	[{ ...DEFAULT_RENDER_SETTINGS, gapMs: 33.3 }, SAMPLE_RATE],
	[{ ...DEFAULT_RENDER_SETTINGS, gapMs: -150 }, SAMPLE_RATE],
	[{ ...DEFAULT_RENDER_SETTINGS, gapMs: Number.NaN }, SAMPLE_RATE],
	[DEFAULT_RENDER_SETTINGS, 8000],
	[DEFAULT_RENDER_SETTINGS, 22050],
	[DEFAULT_RENDER_SETTINGS, 44100],
	[{ ...clean, digitCount: 3 }, 11025],
	[{ ...DEFAULT_RENDER_SETTINGS, digitCount: 3 }, 1000],
	[{ ...DEFAULT_RENDER_SETTINGS, digitCount: 1, gapMs: -2000 }, SAMPLE_RATE],
];

const renderErrorCases: [AudioRenderSettings, number][] = [
	[{ ...DEFAULT_RENDER_SETTINGS, gapMs: -5000 }, SAMPLE_RATE],
	[{ ...DEFAULT_RENDER_SETTINGS, gapMs: Number.POSITIVE_INFINITY }, SAMPLE_RATE],
];

const renders: RenderVector[] = renderCases.map(
	([settings, sampleRate], i): RenderVector => {
		const seed = seedAt(3000 + i);
		const challenge = withSeed(seed, () =>
			renderAudioChallenge(settings, sampleRate),
		);
		return {
			seed: hex(seed),
			settings: settingsBits(settings),
			sampleRate,
			answer: challenge.answer,
			durationMs: bits(challenge.durationMs),
			wavLength: challenge.wav.length,
			wavSha256: sha256(challenge.wav),
		};
	},
);

const renderErrors: RenderErrorVector[] = renderErrorCases.map(
	([settings, sampleRate], i): RenderErrorVector => {
		const seed = seedAt(4000 + i);
		return {
			seed: hex(seed),
			settings: settingsBits(settings),
			sampleRate,
			message: errorMessage(() =>
				withSeed(seed, () => renderAudioChallenge(settings, sampleRate)),
			),
		};
	},
);

const vectors = {
	answerAlphabet: ANSWER_ALPHABET,
	defaultRenderSettings: settingsBits(DEFAULT_RENDER_SETTINGS),
	math,
	phonemes: phonemeVectors,
	digits: digitVectors,
	noiseBed: noiseBedVectors,
	bufferOps,
	encode: encodeVectors,
	encodeErrors,
	renders,
	renderErrors,
};

writeFileSync(
	fileURLToPath(new URL("./vectors.json", import.meta.url)),
	`${JSON.stringify(vectors, null, "\t")}\n`,
);

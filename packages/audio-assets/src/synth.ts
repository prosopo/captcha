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
 * Klatt-style source-filter speech synthesiser. Procedural rather than a
 * recorded corpus: a finite corpus can be collected and matched against, a
 * continuous parameter space cannot.
 */

import type { Prng } from "@prosopo/puzzle-assets";
import { normalise, rms } from "./levels.js";
import type { AudioBuffer, Phoneme, Utterance } from "./types.js";

/** Not 8 kHz: /s/, /f/ and /θ/ live at 4-8 kHz and are what separate six, five and three. */
export const SAMPLE_RATE = 16000;

const NYQUIST_GUARD_HZ = 100;
const MIN_FORMANT_BANDWIDTH_HZ = 10;
const MIN_NOISE_BANDWIDTH_HZ = 100;
const LEVEL_RAMP_SECONDS = 0.004;
const EDGE_FADE_SECONDS = 0.008;
const WORD_PEAK = 0.9;
const SILENT_RMS = 1e-9;
const GLOTTAL_OPEN_QUOTIENT = 0.6;
const GLOTTAL_SPEED_QUOTIENT = 0.35;
const FORMANT_INDICES = [0, 1, 2] as const;

type Triple = [number, number, number];

/** Drawn per speaker so the same digit never renders identically twice. */
export interface Voice {
	f0Hz: number;
	/** Peak-to-peak intonation fall across a word, as a fraction of f0. */
	f0DriftRatio: number;
	/** Stands in for vocal-tract length: ~0.85 a large adult male, ~1.25 a child. */
	formantScale: number;
	/** Duration multiplier; higher is slower. */
	rate: number;
	/**
	 * One-pole low-pass on the glottal source; lower is breathier. Kept above
	 * F3 so it shades voice quality without deciding the spectrum.
	 */
	tiltCornerHz: number;
}

export const randomVoice = (prng: Prng): Voice => ({
	f0Hz: prng.range(85, 210),
	f0DriftRatio: prng.range(0.04, 0.16),
	formantScale: prng.range(0.86, 1.22),
	rate: prng.range(0.82, 1.24),
	tiltCornerHz: prng.range(4500, 8000),
});

interface Resonator {
	process(x: number): number;
	setTarget(freqHz: number, bandwidthHz: number): void;
}

/** Two-pole formant resonator, normalised to unity DC gain so a cascade stays bounded. */
const createResonator = (sampleRate: number): Resonator => {
	let y1 = 0;
	let y2 = 0;
	let a = 1;
	let b = 0;
	let c = 0;

	return {
		setTarget(freqHz: number, bandwidthHz: number): void {
			// A pole above Nyquist folds back as a whistle at the wrong frequency.
			const f = Math.min(
				Math.max(freqHz, 1),
				sampleRate / 2 - NYQUIST_GUARD_HZ,
			);
			const bw = Math.max(bandwidthHz, MIN_FORMANT_BANDWIDTH_HZ);
			const r = Math.exp((-Math.PI * bw) / sampleRate);
			const theta = (2 * Math.PI * f) / sampleRate;
			b = 2 * r * Math.cos(theta);
			c = -(r * r);
			a = 1 - b - c;
		},
		process(x: number): number {
			const y = a * x + b * y1 + c * y2;
			y2 = y1;
			y1 = y;
			return y;
		},
	};
};

const createOnePoleLowPass = (
	sampleRate: number,
	cutoffHz: number,
): ((x: number) => number) => {
	const dt = 1 / sampleRate;
	const rc = 1 / (2 * Math.PI * cutoffHz);
	const alpha = dt / (rc + dt);
	let y = 0;
	return (x: number): number => {
		y += alpha * (x - y);
		return y;
	};
};

/**
 * Lip radiation, a +6 dB/octave differentiator. Without it the glottal
 * pulse's DC and steep rolloff bury F2 and F3, which are what tell vowels
 * apart.
 */
const createRadiation = (): ((x: number) => number) => {
	let previous = 0;
	return (x: number): number => {
		const y = x - previous;
		previous = x;
		return y;
	};
};

/** Rosenberg glottal pulse; a bare impulse train through the formants sounds like a buzzer. */
const createGlottalSource = (
	sampleRate: number,
): ((f0Hz: number) => number) => {
	const rise = GLOTTAL_OPEN_QUOTIENT * (1 - GLOTTAL_SPEED_QUOTIENT);
	const fall = GLOTTAL_OPEN_QUOTIENT * GLOTTAL_SPEED_QUOTIENT;
	let phase = 0;

	return (f0Hz: number): number => {
		phase += f0Hz / sampleRate;
		if (phase >= 1) phase -= 1;

		if (phase < rise) {
			return 0.5 * (1 - Math.cos((Math.PI * phase) / rise));
		}
		if (phase < GLOTTAL_OPEN_QUOTIENT) {
			return Math.cos((Math.PI / 2) * ((phase - rise) / fall));
		}
		return 0;
	};
};

const lerp = (from: number, to: number, t: number): number =>
	from + (to - from) * t;

interface Frame {
	formants: Triple;
	bandwidths: Triple;
	voiceGain: number;
	noiseGain: number;
	noiseCentreHz: number;
	noiseBandwidthHz: number;
	silent: boolean;
}

interface Segment {
	start: number;
	end: number;
	/**
	 * Relative RMS from the phoneme table, not the filter output: the formant
	 * cascade's peak gain would otherwise make vowels far hotter than
	 * fricatives, and per-word normalisation would then bury the fricatives
	 * that identify six, seven and three.
	 */
	targetLevel: number;
}

const isBlendable = (previous: Phoneme, current: Phoneme): boolean =>
	!current.abrupt &&
	!previous.abrupt &&
	previous.excitation !== "silence" &&
	current.excitation !== "silence";

const buildFrames = (
	phonemes: readonly Phoneme[],
	voice: Voice,
	sampleRate: number,
): { frames: Frame[]; segments: Segment[] } => {
	const frames: Frame[] = [];
	const segments: Segment[] = [];

	const scaled = (p: Phoneme): Triple => [
		p.formants[0] * voice.formantScale,
		p.formants[1] * voice.formantScale,
		p.formants[2] * voice.formantScale,
	];

	let previous: Phoneme | undefined;
	for (const current of phonemes) {
		const lengthSamples = Math.max(
			1,
			Math.round((current.durationMs * voice.rate * sampleRate) / 1000),
		);

		const from =
			previous && isBlendable(previous, current) ? previous : current;
		const blendSamples = from === current ? 0 : Math.floor(lengthSamples / 3);
		const source = scaled(from);
		const target = scaled(current);

		segments.push({
			start: frames.length,
			end: frames.length + lengthSamples,
			targetLevel:
				current.excitation === "silence"
					? 0
					: Math.max(current.voiceGain, current.noiseGain),
		});

		for (let n = 0; n < lengthSamples; n++) {
			const t = blendSamples > 0 ? Math.min(1, n / blendSamples) : 1;
			frames.push({
				formants: [
					lerp(source[0], target[0], t),
					lerp(source[1], target[1], t),
					lerp(source[2], target[2], t),
				],
				bandwidths: [
					lerp(from.bandwidths[0], current.bandwidths[0], t),
					lerp(from.bandwidths[1], current.bandwidths[1], t),
					lerp(from.bandwidths[2], current.bandwidths[2], t),
				],
				voiceGain: lerp(from.voiceGain, current.voiceGain, t),
				noiseGain: lerp(from.noiseGain, current.noiseGain, t),
				// Not interpolated: gliding /s/ into /f/ through the bands between
				// is not a sound any vocal tract makes.
				noiseCentreHz: current.noiseCentreHz,
				noiseBandwidthHz: current.noiseBandwidthHz,
				silent: current.excitation === "silence",
			});
		}
		previous = current;
	}

	return { frames, segments };
};

/**
 * Rescale each segment to its target level, ramping the gain across
 * boundaries: a gain step clicks, and a click at every phoneme boundary is a
 * free segmentation cue for an attacker.
 */
const applySegmentLevels = (
	samples: Float32Array,
	segments: readonly Segment[],
	sampleRate: number,
): void => {
	const rampLength = Math.max(1, Math.round(sampleRate * LEVEL_RAMP_SECONDS));

	const gains = segments.map((segment): number => {
		if (segment.targetLevel <= 0) return 0;
		const level = rms(samples.subarray(segment.start, segment.end));
		return level < SILENT_RMS ? 0 : segment.targetLevel / level;
	});

	const track = new Float32Array(samples.length);
	segments.forEach((segment, i) => {
		track.fill(gains[i] ?? 0, segment.start, segment.end);
	});
	for (let i = 1; i < segments.length; i++) {
		const segment = segments[i];
		const gain = gains[i];
		const previousGain = gains[i - 1];
		if (!segment || gain === undefined || previousGain === undefined) continue;
		const length = Math.min(rampLength, segment.end - segment.start);
		for (let n = 0; n < length; n++) {
			const index = segment.start + n;
			if (index >= track.length) break;
			const t = 0.5 * (1 - Math.cos((Math.PI * n) / length));
			track[index] = previousGain + (gain - previousGain) * t;
		}
	}

	for (let n = 0; n < samples.length; n++) {
		samples[n] = (samples[n] ?? 0) * (track[n] ?? 0);
	}
};

/** Raised-cosine fade in and out, in place. */
const applyEdgeFade = (samples: Float32Array, fadeLength: number): void => {
	const length = Math.min(fadeLength, Math.floor(samples.length / 2));
	for (let n = 0; n < length; n++) {
		const gain = 0.5 * (1 - Math.cos((Math.PI * n) / length));
		const tail = samples.length - 1 - n;
		samples[n] = (samples[n] ?? 0) * gain;
		samples[tail] = (samples[tail] ?? 0) * gain;
	}
};

export const synthesiseUtterance = (
	utterance: Utterance,
	voice: Voice,
	prng: Prng,
	sampleRate: number = SAMPLE_RATE,
): AudioBuffer => {
	const { frames, segments } = buildFrames(
		utterance.phonemes,
		voice,
		sampleRate,
	);
	const out = new Float32Array(frames.length);

	const formantFilters: readonly [Resonator, Resonator, Resonator] = [
		createResonator(sampleRate),
		createResonator(sampleRate),
		createResonator(sampleRate),
	];
	const noiseFilter = createResonator(sampleRate);
	const glottis = createGlottalSource(sampleRate);
	const radiation = createRadiation();
	const tilt = createOnePoleLowPass(sampleRate, voice.tiltCornerHz);

	// A dead-flat F0 sounds robotic and is a trivially detectable regularity.
	const f0Start = voice.f0Hz * (1 + voice.f0DriftRatio / 2);
	const f0End = voice.f0Hz * (1 - voice.f0DriftRatio / 2);
	const jitterDepth = prng.range(0.004, 0.02);

	frames.forEach((frame, n) => {
		if (frame.silent) return;

		const progress = frames.length > 1 ? n / (frames.length - 1) : 0;
		const f0 =
			lerp(f0Start, f0End, progress) * (1 + jitterDepth * (prng.next() - 0.5));

		let sample = 0;

		if (frame.voiceGain > 0) {
			let voiced = tilt(glottis(f0));
			for (const k of FORMANT_INDICES) {
				formantFilters[k].setTarget(frame.formants[k], frame.bandwidths[k]);
				voiced = formantFilters[k].process(voiced);
			}
			sample += voiced * frame.voiceGain;
		}

		if (frame.noiseGain > 0) {
			noiseFilter.setTarget(
				frame.noiseCentreHz,
				Math.max(frame.noiseBandwidthHz, MIN_NOISE_BANDWIDTH_HZ),
			);
			const noise = prng.next() * 2 - 1;
			sample += noiseFilter.process(noise) * frame.noiseGain;
		}

		// Turbulence leaves the mouth the same way voicing does.
		out[n] = radiation(sample);
	});

	applySegmentLevels(out, segments, sampleRate);
	// An unfaded word edge clicks, and hands an attacker a sharp onset to segment on.
	applyEdgeFade(out, Math.round(sampleRate * EDGE_FADE_SECONDS));
	normalise(out, WORD_PEAK);

	return { samples: out, sampleRate };
};

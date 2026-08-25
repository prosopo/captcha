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
 * A small source-filter (Klatt-style cascade) speech synthesiser.
 *
 * Source-filter says a speech sound is an excitation — glottal pulses for
 * voiced sounds, turbulence for unvoiced ones — passed through the
 * resonances of the vocal tract. Model the excitation, model three
 * resonances, and you get something a listener parses as speech. That is
 * the whole design: no recorded audio, no dictionary, no model weights.
 *
 * Why procedural rather than a recorded corpus: a fixed corpus is
 * harvestable. Record 10 digits × 20 speakers and an attacker collects all
 * 200 clips over a weekend, fingerprints them, and every future challenge
 * is a lookup. A generator with a continuous parameter space has no finite
 * set to collect.
 */

import type { Prng } from "./prng.js";
import type { AudioBuffer, Phoneme, Utterance } from "./types.js";

export const SAMPLE_RATE = 16000;

/**
 * Per-clip voice characteristics. Drawn fresh per speaker so the same
 * digit never renders identically twice.
 */
export interface Voice {
	/** Mean fundamental frequency in Hz — the perceived pitch. */
	f0Hz: number;
	/** Peak-to-peak intonation drift as a fraction of f0. */
	f0DriftRatio: number;
	/**
	 * Multiplier on every formant frequency. Stands in for vocal-tract
	 * length: a shorter tract resonates higher. ~0.85 reads as a large
	 * adult male, ~1.25 as a child.
	 */
	formantScale: number;
	/** Multiplier on every phoneme duration. Higher is slower. */
	rate: number;
	/**
	 * Spectral tilt in dB/octave applied to the voiced branch. More tilt
	 * is a breathier, softer voice; less is a tenser, buzzier one.
	 */
	tiltDbPerOctave: number;
}

export const randomVoice = (prng: Prng): Voice => ({
	f0Hz: prng.range(85, 210),
	f0DriftRatio: prng.range(0.04, 0.16),
	formantScale: prng.range(0.86, 1.22),
	rate: prng.range(0.82, 1.24),
	tiltDbPerOctave: prng.range(2, 9),
});

/**
 * Two-pole resonator, the standard digital formant filter.
 *
 *   y[n] = a·x[n] + b·y[n-1] + c·y[n-2]
 *
 * with the pole pair placed at frequency `f` and bandwidth `bw`. `a` is
 * chosen so the filter has unity gain at DC, which keeps a cascade of
 * three of them from blowing up.
 */
interface Resonator {
	process(x: number): number;
	setTarget(freqHz: number, bandwidthHz: number): void;
}

const createResonator = (sampleRate: number): Resonator => {
	let y1 = 0;
	let y2 = 0;
	let a = 1;
	let b = 0;
	let c = 0;

	return {
		setTarget(freqHz: number, bandwidthHz: number): void {
			// Guard the Nyquist limit: a pole above it folds back down the
			// spectrum as an audible whistle at the wrong frequency.
			const f = Math.min(Math.max(freqHz, 1), sampleRate / 2 - 100);
			const bw = Math.max(bandwidthHz, 10);
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

/** One-pole low-pass, used for spectral tilt and noise shaping. */
const createOnePole = (
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
 * Lip radiation.
 *
 * Sound leaves the mouth by radiating off the lips, and that radiation
 * differentiates the pressure waveform — a +6 dB/octave tilt across the
 * whole spectrum. It is not a cosmetic touch: the glottal pulse is an
 * all-positive waveform with a large DC component and a steep -12
 * dB/octave rolloff, so without the differentiator virtually all the
 * energy piles up below the first formant. F2 and F3 — which is to say
 * the formants that actually distinguish one vowel from another — end up
 * tens of dB down and the speech is unintelligible, every vowel reduced
 * to a low hum. The differencer also removes the DC offset for free.
 */
const createRadiation = (): ((x: number) => number) => {
	let previous = 0;
	return (x: number): number => {
		const y = x - previous;
		previous = x;
		return y;
	};
};

/**
 * Glottal pulse train.
 *
 * A bare impulse train through the formant cascade sounds like a buzzer.
 * Real vocal folds open and close over a good fraction of each period, and
 * that pulse *shape* is most of what separates "voice" from "buzz". This
 * uses the Rosenberg model: a smooth rise over the open phase, a faster
 * fall to closure, then silence. Cheap, and the difference is not subtle.
 */
const createGlottalSource = (
	sampleRate: number,
): ((f0Hz: number) => number) => {
	let phase = 0;
	const openQuotient = 0.6;
	const speedQuotient = 0.35;

	return (f0Hz: number): number => {
		phase += f0Hz / sampleRate;
		if (phase >= 1) phase -= 1;

		const rise = openQuotient * (1 - speedQuotient);
		const fall = openQuotient * speedQuotient;

		if (phase < rise) {
			// Opening: raised-cosine rise.
			const t = phase / rise;
			return 0.5 * (1 - Math.cos(Math.PI * t));
		}
		if (phase < openQuotient) {
			// Closing: quarter-cosine fall, steeper than the rise. The
			// discontinuity in slope at closure is what excites the tract.
			const t = (phase - rise) / fall;
			return Math.cos((Math.PI / 2) * t);
		}
		// Closed phase.
		return 0;
	};
};

/** Piecewise-linear interpolation between two values. */
const lerp = (from: number, to: number, t: number): number =>
	from + (to - from) * t;

interface Frame {
	formants: [number, number, number];
	bandwidths: [number, number, number];
	voiceGain: number;
	noiseGain: number;
	noiseCentreHz: number;
	noiseBandwidthHz: number;
	silent: boolean;
	/** Index of the phoneme this frame belongs to. Drives level correction. */
	segment: number;
}

/** Where each phoneme landed in the output, and how loud it should be. */
interface Segment {
	start: number;
	end: number;
	/**
	 * Intended RMS of this segment relative to the loudest one, 0..1.
	 *
	 * Taken from the phoneme table rather than from whatever the filters
	 * happen to produce. Without this the balance between a vowel and a
	 * fricative is an accident of resonator gain: a cascade of three
	 * two-pole resonators has unity gain at DC but a large, Q-dependent
	 * gain at the formant peaks, while the single noise resonator does
	 * not — so voiced segments come out far hotter than the phoneme
	 * table asked for, per-word peak normalisation then pulls the whole
	 * word down to fit them, and the fricatives that identify "six",
	 * "seven" and "three" end up too quiet to hear.
	 */
	targetLevel: number;
}

/**
 * Expand a phoneme sequence into a per-sample control track.
 *
 * The interpolation here is the part that matters. Holding each phoneme at
 * its steady-state target and stepping between them produces a sequence of
 * distinct tones that no listener hears as a word: the formant
 * *transitions* into and out of a consonant carry most of its identity.
 * Segments marked `abrupt` (stop bursts) are exempt — smoothing those
 * destroys the transient that identifies them.
 */
const buildFrames = (
	phonemes: readonly Phoneme[],
	voice: Voice,
	sampleRate: number,
): { frames: Frame[]; segments: Segment[] } => {
	const frames: Frame[] = [];
	const segments: Segment[] = [];

	const scaled = (p: Phoneme): [number, number, number] => [
		p.formants[0] * voice.formantScale,
		p.formants[1] * voice.formantScale,
		p.formants[2] * voice.formantScale,
	];

	for (let i = 0; i < phonemes.length; i++) {
		const current = phonemes[i];
		if (!current) continue;
		const previous = i > 0 ? phonemes[i - 1] : undefined;

		const lengthSamples = Math.max(
			1,
			Math.round((current.durationMs * voice.rate * sampleRate) / 1000),
		);

		// Blend over the first third of the segment, unless this segment
		// (or the one before it) is a transient that must stay sharp.
		const blendable =
			previous !== undefined &&
			!current.abrupt &&
			!previous.abrupt &&
			previous.excitation !== "silence" &&
			current.excitation !== "silence";
		const blendSamples = blendable ? Math.floor(lengthSamples / 3) : 0;

		const target = scaled(current);
		const source = previous ? scaled(previous) : target;

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
			const from = previous && blendable ? previous : current;

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
				// Noise band is not interpolated: crossfading /s/ into /f/
				// through the frequencies in between is not a sound any
				// vocal tract makes.
				noiseCentreHz: current.noiseCentreHz,
				noiseBandwidthHz: current.noiseBandwidthHz,
				silent: current.excitation === "silence",
				segment: segments.length - 1,
			});
		}
	}

	return { frames, segments };
};

/**
 * Rescale each segment so its RMS matches the level the phoneme table
 * asked for.
 *
 * The correction gain is smoothed across segment boundaries with a short
 * raised-cosine ramp. A hard step in gain at a boundary is a click, and a
 * click at every phoneme boundary is both audible and a perfect
 * segmentation cue for an attacker.
 */
const applySegmentLevels = (
	samples: Float32Array,
	segments: readonly Segment[],
	sampleRate: number,
): void => {
	const rampLen = Math.max(1, Math.round(sampleRate * 0.004));

	// Per-segment corrective gain, computed before any of it is applied so
	// each measurement sees the untouched signal.
	const gains = segments.map((segment) => {
		if (segment.targetLevel <= 0) return 0;
		let total = 0;
		const count = segment.end - segment.start;
		if (count <= 0) return 0;
		for (let n = segment.start; n < segment.end; n++) {
			const value = samples[n] ?? 0;
			total += value * value;
		}
		const rms = Math.sqrt(total / count);
		if (rms < 1e-9) return 0;
		return segment.targetLevel / rms;
	});

	// Per-sample gain track, ramped over boundaries.
	const track = new Float32Array(samples.length);
	for (let i = 0; i < segments.length; i++) {
		const segment = segments[i];
		const gain = gains[i];
		if (!segment || gain === undefined) continue;
		for (let n = segment.start; n < segment.end && n < track.length; n++) {
			track[n] = gain;
		}
	}
	for (let i = 1; i < segments.length; i++) {
		const segment = segments[i];
		const gain = gains[i];
		const previousGain = gains[i - 1];
		if (!segment || gain === undefined || previousGain === undefined) continue;
		const len = Math.min(rampLen, segment.end - segment.start);
		for (let n = 0; n < len; n++) {
			const index = segment.start + n;
			if (index >= track.length) break;
			const t = 0.5 * (1 - Math.cos((Math.PI * n) / len));
			track[index] = previousGain + (gain - previousGain) * t;
		}
	}

	for (let n = 0; n < samples.length; n++) {
		samples[n] = (samples[n] ?? 0) * (track[n] ?? 0);
	}
};

/**
 * Render one word.
 *
 * Applies a short fade at each end. Without it the buffer starts and ends
 * on a discontinuity, which is an audible click — and, more to the point,
 * a perfectly sharp onset marker that makes automated segmentation of the
 * clip into individual digits trivial.
 */
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

	const formantFilters = [
		createResonator(sampleRate),
		createResonator(sampleRate),
		createResonator(sampleRate),
	];
	const noiseFilter = createResonator(sampleRate);
	const glottis = createGlottalSource(sampleRate);
	const radiation = createRadiation();
	// Voice-quality control only. The dominant spectral shaping is the
	// glottal pulse's own rolloff against the radiation differentiator;
	// this just nudges breathy-vs-tense, so the corner stays well above
	// F3 and never becomes the thing that decides the spectrum.
	const tilt = createOnePole(
		sampleRate,
		Math.max(3200, 9000 - voice.tiltDbPerOctave * 500),
	);

	// Intonation: a gentle fall across the word, plus per-period jitter.
	// A dead-flat F0 is the single most robotic thing a synthesiser can
	// do, and it is also a trivially detectable regularity.
	const f0Start = voice.f0Hz * (1 + voice.f0DriftRatio / 2);
	const f0End = voice.f0Hz * (1 - voice.f0DriftRatio / 2);
	const jitterDepth = prng.range(0.004, 0.02);

	for (let n = 0; n < frames.length; n++) {
		const frame = frames[n];
		if (!frame) continue;

		if (frame.silent) {
			out[n] = 0;
			continue;
		}

		const progress = frames.length > 1 ? n / (frames.length - 1) : 0;
		const f0 =
			lerp(f0Start, f0End, progress) * (1 + jitterDepth * (prng.next() - 0.5));

		let sample = 0;

		if (frame.voiceGain > 0) {
			const excitation = tilt(glottis(f0));
			let voiced = excitation;
			for (let k = 0; k < formantFilters.length; k++) {
				const filter = formantFilters[k];
				const f = frame.formants[k];
				const bw = frame.bandwidths[k];
				if (!filter || f === undefined || bw === undefined) continue;
				filter.setTarget(f, bw);
				voiced = filter.process(voiced);
			}
			sample += voiced * frame.voiceGain;
		}

		if (frame.noiseGain > 0) {
			noiseFilter.setTarget(
				frame.noiseCentreHz,
				Math.max(frame.noiseBandwidthHz, 100),
			);
			const noise = prng.next() * 2 - 1;
			sample += noiseFilter.process(noise) * frame.noiseGain;
		}

		// Radiation applies to the summed signal: fricative turbulence
		// leaves the mouth the same way voicing does.
		out[n] = radiation(sample);
	}

	applySegmentLevels(out, segments, sampleRate);
	applyEdgeFade(out, Math.round(sampleRate * 0.008));
	normalise(out, 0.9);

	return { samples: out, sampleRate };
};

/** Raised-cosine fade in and out, in place. */
export const applyEdgeFade = (samples: Float32Array, fadeLen: number): void => {
	const len = Math.min(fadeLen, Math.floor(samples.length / 2));
	for (let n = 0; n < len; n++) {
		const gain = 0.5 * (1 - Math.cos((Math.PI * n) / len));
		const head = samples[n];
		const tail = samples[samples.length - 1 - n];
		if (head !== undefined) samples[n] = head * gain;
		if (tail !== undefined) samples[samples.length - 1 - n] = tail * gain;
	}
};

/** Scale in place so the loudest sample sits at `peak`. No-op on silence. */
export const normalise = (samples: Float32Array, peak: number): void => {
	let max = 0;
	for (let n = 0; n < samples.length; n++) {
		const value = Math.abs(samples[n] ?? 0);
		if (value > max) max = value;
	}
	if (max === 0) return;
	const gain = peak / max;
	for (let n = 0; n < samples.length; n++) {
		samples[n] = (samples[n] ?? 0) * gain;
	}
};

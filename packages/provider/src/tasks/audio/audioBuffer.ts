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

import {
	type AudioRenderSettings,
	DEFAULT_RENDER_SETTINGS,
	type RenderedAudioChallenge,
	renderAudioChallenge,
} from "@prosopo/audio-assets";

/**
 * Pre-generated audio challenges, handed out exactly once each.
 *
 * SINGLE USE IS A SECURITY PROPERTY, NOT AN OPTIMISATION. Serving the
 * same clip twice hands an attacker a labelled pair: solve it once by
 * hand, recognise the bytes on the second serving, and pass for free.
 * More damagingly, a repeated clip is training data — the cheapest way
 * to build a solver for a synthetic voice is to collect (audio, answer)
 * pairs from the target itself. `take()` therefore removes what it
 * returns and the buffer never hands the same challenge out twice.
 *
 * Unlike the puzzle's background buffer, entries here are keyed by their
 * render settings: a site that has customised `digitCount` or
 * `noiseSnrDb` must not be served a clip rendered with someone else's
 * values. Buffers are held per distinct settings signature, and the
 * total number of buffers is capped so a hostile spread of settings
 * cannot grow this without bound.
 *
 * The buffer exists to keep synthesis off the request path — a clip
 * costs tens of milliseconds of DSP and a few hundred KB of PCM while
 * it waits.
 */
export interface AudioChallengeBuffer {
	/** Consume one challenge. Never returns null — see `take`. */
	take(settings: AudioRenderSettings): RenderedAudioChallenge;
	/** How many are ready right now, across all settings variants. */
	depth(): number;
	/** Times `take()` found no ready challenge since construction. */
	starvations(): number;
	/** Stop the refill timer. */
	stop(): void;
}

export interface AudioBufferOptions {
	/** Target number of ready challenges per settings variant. */
	capacity?: number;
	/** How often to top up, in ms. */
	refillIntervalMs?: number;
	/** Most challenges to generate in one refill tick, per variant. */
	refillBatch?: number;
	/**
	 * Most distinct settings variants to keep buffers for. Beyond this,
	 * the least recently used variant is evicted.
	 */
	maxVariants?: number;
	/** Settings to prime the buffer with at boot. */
	primeSettings?: AudioRenderSettings;
}

export const DEFAULT_CAPACITY = 8;
export const DEFAULT_REFILL_INTERVAL_MS = 500;
export const DEFAULT_REFILL_BATCH = 2;
export const DEFAULT_MAX_VARIANTS = 8;

/**
 * Stable key for a settings object. Field order is fixed here rather
 * than taken from `Object.keys`, so two equivalent settings objects
 * built in different orders share a buffer instead of each getting one.
 */
const settingsKey = (settings: AudioRenderSettings): string =>
	[
		settings.digitCount,
		settings.noiseSnrDb,
		settings.babbleGain,
		settings.babbleVoices,
		settings.reverbMix,
		settings.gapMs,
	].join(":");

export const createAudioChallengeBuffer = (
	options: AudioBufferOptions = {},
): AudioChallengeBuffer => {
	const capacity = options.capacity ?? DEFAULT_CAPACITY;
	const refillIntervalMs =
		options.refillIntervalMs ?? DEFAULT_REFILL_INTERVAL_MS;
	const refillBatch = options.refillBatch ?? DEFAULT_REFILL_BATCH;
	const maxVariants = options.maxVariants ?? DEFAULT_MAX_VARIANTS;

	// Insertion-ordered, so the first key is the least recently used
	// once `touch` re-inserts on access.
	const variants = new Map<
		string,
		{ settings: AudioRenderSettings; ready: RenderedAudioChallenge[] }
	>();
	let starved = 0;

	const touch = (key: string, settings: AudioRenderSettings) => {
		const existing = variants.get(key);
		if (existing) {
			variants.delete(key);
			variants.set(key, existing);
			return existing;
		}
		const created = { settings, ready: [] as RenderedAudioChallenge[] };
		variants.set(key, created);
		while (variants.size > maxVariants) {
			const oldest = variants.keys().next().value;
			if (oldest === undefined) break;
			variants.delete(oldest);
		}
		return created;
	};

	const topUp = (limit: number): void => {
		for (const variant of variants.values()) {
			for (let i = 0; i < limit && variant.ready.length < capacity; i++) {
				variant.ready.push(renderAudioChallenge(variant.settings));
			}
		}
	};

	// Prime the default variant synchronously so the first request after
	// boot does not pay for synthesis.
	const prime = options.primeSettings ?? DEFAULT_RENDER_SETTINGS;
	touch(settingsKey(prime), prime);
	topUp(capacity);

	const timer = setInterval(() => topUp(refillBatch), refillIntervalMs);
	// Never hold the process open for the sake of the buffer.
	timer.unref?.();

	return {
		take(settings: AudioRenderSettings): RenderedAudioChallenge {
			const variant = touch(settingsKey(settings), settings);
			const challenge = variant.ready.pop();
			if (!challenge) {
				starved++;
				// Generate inline rather than failing the request. Slower,
				// but a challenge is still served and single-use holds.
				return renderAudioChallenge(settings);
			}
			return challenge;
		},
		depth: (): number => {
			let total = 0;
			for (const variant of variants.values()) total += variant.ready.length;
			return total;
		},
		starvations: (): number => starved,
		stop: (): void => clearInterval(timer),
	};
};

let globalBuffer: AudioChallengeBuffer | null = null;

export const initAudioChallengeBuffer = (
	options: AudioBufferOptions = {},
): AudioChallengeBuffer => {
	globalBuffer?.stop();
	globalBuffer = createAudioChallengeBuffer(options);
	return globalBuffer;
};

export const getAudioChallengeBuffer = (): AudioChallengeBuffer | null =>
	globalBuffer;

/** Test seam: drop the process-wide buffer. */
export const resetAudioChallengeBuffer = (): void => {
	globalBuffer?.stop();
	globalBuffer = null;
};

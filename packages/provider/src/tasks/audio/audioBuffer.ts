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
 * Pre-generated audio challenges, keeping synthesis off the request path.
 *
 * SINGLE USE IS A SECURITY PROPERTY: a clip served twice is a labelled
 * (audio, answer) pair an attacker can recognise or train a solver on, so
 * `take()` removes what it returns.
 *
 * Ready clips are held per render-settings variant, so a site never gets a
 * clip rendered with another site's settings; the variant count is capped so
 * a spread of settings cannot grow this without bound.
 */
export interface AudioChallengeBuffer {
	/** Consume one challenge, rendering inline when none is ready. */
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
	/** Most settings variants to keep; the least recently used is evicted. */
	maxVariants?: number;
	/** Settings to prime the buffer with at boot. */
	primeSettings?: AudioRenderSettings;
}

export const DEFAULT_CAPACITY = 8;
export const DEFAULT_REFILL_INTERVAL_MS = 500;
export const DEFAULT_REFILL_BATCH = 2;
export const DEFAULT_MAX_VARIANTS = 8;

// Fixed field order, so equivalent settings built in any order share a key.
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

	// `touch` re-inserts on access, so the first key is the least recently used.
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

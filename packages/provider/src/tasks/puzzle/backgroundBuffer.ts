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
	DEFAULT_GEOMETRY,
	type PuzzleGeometry,
	type RgbaImage,
	createBackground,
} from "@prosopo/puzzle-assets";

/**
 * Pre-generated puzzle backgrounds, handed out exactly once each.
 *
 * SINGLE USE IS A SECURITY PROPERTY, NOT AN OPTIMISATION. Serving the same
 * background for two challenges with different notch positions lets an attacker
 * collect both composites, diff them, and read both target positions straight
 * off the difference image. `take()` therefore removes what it returns and the
 * buffer never hands the same image out twice.
 *
 * The buffer itself exists only to keep generation off the request path — each
 * background costs a few milliseconds of CPU and width*height*4 bytes while it
 * waits (about 240 KB at the default geometry).
 */
export interface PuzzleBackgroundBuffer {
	/** Consume one background, or null when the buffer has run dry. */
	take(): RgbaImage | null;
	/** How many are ready right now. */
	depth(): number;
	/** Times `take()` found the buffer empty since construction. */
	starvations(): number;
	/** Stop the refill timer. */
	stop(): void;
}

export interface PuzzleBufferOptions {
	/** Target number of ready backgrounds. */
	capacity?: number;
	/** How often to top up, in ms. */
	refillIntervalMs?: number;
	/** Most backgrounds to generate in one refill tick. */
	refillBatch?: number;
	geometry?: PuzzleGeometry;
}

export const DEFAULT_CAPACITY = 16;
export const DEFAULT_REFILL_INTERVAL_MS = 250;
export const DEFAULT_REFILL_BATCH = 4;

export const createPuzzleBackgroundBuffer = (
	options: PuzzleBufferOptions = {},
): PuzzleBackgroundBuffer => {
	const capacity = options.capacity ?? DEFAULT_CAPACITY;
	const refillIntervalMs =
		options.refillIntervalMs ?? DEFAULT_REFILL_INTERVAL_MS;
	const refillBatch = options.refillBatch ?? DEFAULT_REFILL_BATCH;
	const geometry = options.geometry ?? DEFAULT_GEOMETRY;

	const ready: RgbaImage[] = [];
	let starved = 0;

	const topUp = (limit: number): void => {
		for (let i = 0; i < limit && ready.length < capacity; i++) {
			ready.push(createBackground(geometry));
		}
	};

	// Prime synchronously so the first request after boot does not pay for
	// generation, then keep topping up on a timer.
	topUp(capacity);

	const timer = setInterval(() => topUp(refillBatch), refillIntervalMs);
	// Never hold the process open for the sake of the buffer.
	timer.unref?.();

	return {
		take(): RgbaImage | null {
			const image = ready.pop();
			if (!image) {
				starved++;
				// Generate inline rather than failing the request. Slower, but a
				// puzzle is still served and single-use is preserved.
				return createBackground(geometry);
			}
			return image;
		},
		depth: (): number => ready.length,
		starvations: (): number => starved,
		stop: (): void => clearInterval(timer),
	};
};

let globalBuffer: PuzzleBackgroundBuffer | null = null;

export const initPuzzleBackgroundBuffer = (
	options: PuzzleBufferOptions = {},
): PuzzleBackgroundBuffer => {
	globalBuffer?.stop();
	globalBuffer = createPuzzleBackgroundBuffer(options);
	return globalBuffer;
};

export const getPuzzleBackgroundBuffer = (): PuzzleBackgroundBuffer | null =>
	globalBuffer;

/** Test seam: drop the process-wide buffer. */
export const resetPuzzleBackgroundBuffer = (): void => {
	globalBuffer?.stop();
	globalBuffer = null;
};

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
 * How long the client blocks on the catcher's WASM SIMD benchmark at solution
 * submit time before giving up.
 *
 * Submit is the last hop the client controls, so it's the last chance to attach
 * readings for this session — earlier hops (the frictionless POST and the
 * challenge GET) are deliberately non-blocking and only attach what the
 * catcher's prefetch has already resolved. Here we wait, capped at 5s so a
 * stalled or unsupported benchmark can't hold a solved captcha hostage.
 */
export const SIMD_READINGS_SUBMIT_TIMEOUT_MS = 5000;

/**
 * Anything carrying the catcher's SIMD accessor — in practice the frictionless
 * state threaded through each widget's manager. Structural so the pow, puzzle
 * and image managers can all pass their own state type.
 */
export interface SimdReadingsSource {
	getSimdReadings?: (timeoutMs?: number) => Promise<string | undefined>;
}

/**
 * Block on the catcher's SIMD readings for up to `timeoutMs`, then resolve with
 * whatever we have.
 *
 * The detector ships as a prebuilt bundle, so its handling of `timeoutMs` is
 * opaque to us — we pass the budget down *and* race it ourselves, otherwise a
 * bundle that ignores the argument (or a benchmark wedged on a busy main
 * thread) would hang the submission indefinitely.
 *
 * Never rejects: a missing accessor, a rejected promise, a synchronous throw,
 * and a timeout all resolve to `undefined`. Readings are telemetry — failing a
 * user's captcha over them would be a far worse outcome than losing the signal
 * for one session.
 */
export const getSimdReadingsForSubmit = async (
	source: SimdReadingsSource | undefined,
	timeoutMs: number = SIMD_READINGS_SUBMIT_TIMEOUT_MS,
): Promise<string | undefined> => {
	if (!source?.getSimdReadings) return undefined;
	const { getSimdReadings } = source;

	let readings: Promise<string | undefined>;
	try {
		readings = Promise.resolve(getSimdReadings.call(source, timeoutMs));
	} catch {
		return undefined;
	}

	let timeoutId: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<undefined>((resolve) => {
		timeoutId = setTimeout(() => resolve(undefined), timeoutMs);
	});

	try {
		return await Promise.race([readings.catch(() => undefined), timeout]);
	} finally {
		if (timeoutId !== undefined) clearTimeout(timeoutId);
	}
};

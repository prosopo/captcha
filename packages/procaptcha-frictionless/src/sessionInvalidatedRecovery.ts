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

// Shared, unit-testable pieces of the ProcaptchaFrictionless recovery path
// for CAPTCHA.NO_SESSION_FOUND on the inner widget. The React component
// mutates refs directly; these helpers isolate the logic that decides how a
// re-mount should be parameterised so it can be exercised without a renderer.

export type RetryCoords = { x: number; y: number };

/**
 * Ref-like container used by ProcaptchaFrictionless. Extracted so tests
 * can pass a plain `{current}` object.
 */
export type MutableRef<T> = { current: T };

/**
 * The checkbox click position a re-mounted widget should start from, or
 * `null` when there isn't a real one to carry over.
 *
 * - Coords are kept only for a real trusted checkbox click. A partial
 *   pair (only x or only y numeric) is treated as "no coords" so we
 *   never accidentally embed `NaN` into the solution salt.
 * - `(0, 0)` is treated as "no coords" too — that's what the widgets
 *   emit for an `autoStart` mount (post-PoW escalation) or an untrusted
 *   pointer event on the checkbox, neither of which is a real click. The
 *   resumed widget re-uses the same default and the outcome on the wire
 *   is identical; we discard the pair here so future readers can tell
 *   the two apart.
 */
export const normaliseRetryCoords = (
	x: number | undefined,
	y: number | undefined,
): RetryCoords | null => {
	if (typeof x !== "number" || typeof y !== "number") return null;
	if (x === 0 && y === 0) return null;
	return { x, y };
};

/**
 * How many times a single outer widget will re-mint a session in response to
 * `CAPTCHA.NO_SESSION_FOUND` on the inner widget before giving up and handing
 * over to the terminal fallback.
 *
 * This used to be one-shot per outer widget lifetime, which stranded users:
 * the inner widget always takes the `onSessionInvalidated` branch (its own
 * guard ref is fresh on every re-mount, because the outer widget bumps its
 * mount key) and returns without touching its own `restart()` fallback. Once
 * the outer one-shot was spent nothing at all handled the second failure, so
 * the checkbox sat on "No session found" forever. A widget legitimately mints
 * many sessions over its lifetime — every reload press is a new one — so a
 * single lifetime-wide attempt is far too coarse a bound.
 */
export const MAX_SESSION_INVALIDATED_RETRIES = 3;

/**
 * Semantics of the outer recovery handler. Returns whether the caller should
 * proceed to re-run the frictionless flow (`start()`), and mutates the passed
 * refs to record the attempt + pending coords.
 *
 * Bounded rather than one-shot: a persistently broken session still stops
 * looping, but the caller is told (`exhausted`) so it can fall back visibly
 * instead of silently doing nothing.
 */
export const handleSessionInvalidated = (
	x: number | undefined,
	y: number | undefined,
	attemptsRef: MutableRef<number>,
	pendingCoordsRef: MutableRef<RetryCoords | null>,
	maxAttempts: number = MAX_SESSION_INVALIDATED_RETRIES,
): { shouldRestart: boolean; exhausted: boolean } => {
	if (attemptsRef.current >= maxAttempts) {
		return { shouldRestart: false, exhausted: true };
	}
	attemptsRef.current += 1;
	pendingCoordsRef.current = normaliseRetryCoords(x, y);
	return { shouldRestart: true, exhausted: false };
};

/**
 * Compute the props a resumed inner widget mounts with. Consumes the
 * pending coords ref (sets it back to `null`) so the next render doesn't
 * accidentally re-inject stale coords into a fresh escalation.
 *
 * `escalationAutoStart` reflects the caller's own `autoStart` argument to
 * `renderForCaptchaType` — post-PoW escalations keep the historic
 * autoStart=true behaviour when no retry coords are pending.
 */
export const consumeRetryMountProps = (
	pendingCoordsRef: MutableRef<RetryCoords | null>,
	escalationAutoStart: boolean,
): { autoStart: boolean; startCoords: RetryCoords | undefined } => {
	const startCoords = pendingCoordsRef.current ?? undefined;
	pendingCoordsRef.current = null;
	return {
		autoStart: escalationAutoStart || Boolean(startCoords),
		startCoords,
	};
};

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
 * Semantics of the outer recovery handler. Returns whether the caller
 * should proceed to re-run the frictionless flow (`start()`), and mutates
 * the passed refs to record the one-shot fire + pending coords.
 *
 * - Second calls are ignored (one-shot per outer widget lifetime) so a
 *   persistently broken session doesn't loop.
 * - Coords are recorded only for a real trusted checkbox click. A partial
 *   pair (only x or only y numeric) is treated as "no coords" so we
 *   never accidentally embed `NaN` into the solution salt.
 * - `(0, 0)` is treated as "no coords" too — that's what the widgets
 *   emit for an `autoStart` mount (post-PoW escalation) or an untrusted
 *   pointer event on the checkbox, neither of which is a real click. The
 *   resumed widget re-uses the same default and the outcome on the wire
 *   is identical; we discard the pair here so future readers can tell
 *   the two apart.
 */
export const handleSessionInvalidated = (
	x: number | undefined,
	y: number | undefined,
	firedRef: MutableRef<boolean>,
	pendingCoordsRef: MutableRef<RetryCoords | null>,
): { shouldRestart: boolean } => {
	if (firedRef.current) return { shouldRestart: false };
	firedRef.current = true;
	const bothNumeric = typeof x === "number" && typeof y === "number";
	const isRealClick = bothNumeric && (x !== 0 || y !== 0);
	pendingCoordsRef.current = isRealClick ? { x, y } : null;
	return { shouldRestart: true };
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

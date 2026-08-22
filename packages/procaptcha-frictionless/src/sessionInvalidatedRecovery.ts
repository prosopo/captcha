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

/**
 * A wrong answer, as opposed to a broken session. The provider consumes the
 * session when it issues a challenge, so the inner widget cannot fetch a
 * second challenge itself — the frictionless flow has to re-run to mint a new
 * one. Records the coords to resume with and raises the flag that makes the
 * re-mounted widget open with the retry prompt showing.
 *
 * Deliberately *not* one-shot, unlike `handleSessionInvalidated`: a user is
 * entitled to get a wrong answer as many times as they like, and each one
 * should produce a fresh challenge. The looping risk that motivates the
 * one-shot guard there doesn't apply, because this path only runs in response
 * to a completed human attempt.
 */
export const handleChallengeFailed = (
	x: number | undefined,
	y: number | undefined,
	pendingCoordsRef: MutableRef<RetryCoords | null>,
	pendingRetryPromptRef: MutableRef<boolean>,
): { shouldRestart: boolean } => {
	const bothNumeric = typeof x === "number" && typeof y === "number";
	const isRealClick = bothNumeric && (x !== 0 || y !== 0);
	pendingCoordsRef.current = isRealClick ? { x, y } : null;
	pendingRetryPromptRef.current = true;
	return { shouldRestart: true };
};

/**
 * Read and clear the pending retry-prompt flag. Consumed exactly once, by the
 * widget mounted directly after the failure, so the prompt doesn't persist
 * into an unrelated later challenge.
 */
export const consumeRetryPrompt = (
	pendingRetryPromptRef: MutableRef<boolean>,
): boolean => {
	const showRetryPrompt = pendingRetryPromptRef.current;
	pendingRetryPromptRef.current = false;
	return showRetryPrompt;
};

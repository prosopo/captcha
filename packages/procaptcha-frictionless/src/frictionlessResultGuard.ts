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

export type FrictionlessGuardOutcome =
	| { kind: "pass" }
	| { kind: "error"; message: string; key?: string; retryable: boolean };

/**
 * Error keys that describe the caller's situation rather than the provider's
 * health, so re-rolling onto another provider would return the same answer.
 *
 * Two groups. Integration faults (site key, origin, captcha type) need the
 * site owner to change something and the text is what tells them what. Policy
 * denials are a decision about this visitor that every provider shares —
 * retrying them would both mislead the user and hammer the fleet on behalf of
 * traffic we have just refused.
 *
 * Anything outside this list is treated as the provider failing, not the
 * caller: see {@link evaluateFrictionlessResult}.
 */
const TERMINAL_ERROR_KEYS: ReadonlySet<string> = new Set([
	"API.SITE_KEY_NOT_REGISTERED",
	"API.INVALID_SITE_KEY",
	"API.UNAUTHORIZED_ORIGIN_URL",
	"API.INCORRECT_CAPTCHA_TYPE",
	"API.ACCESS_POLICY_BLOCK",
	"API.ABUSER_BLOCKED",
	"API.CRAWLER_BLOCKED",
	"API.DATACENTER_BLOCKED",
	"API.DISALLOWED_WEBVIEW",
	"API.MOBILE_BLOCKED",
	"API.PROXY_BLOCKED",
	"API.SATELLITE_BLOCKED",
	"API.TOR_BLOCKED",
	"API.VPN_BLOCKED",
	"API.FORBIDDEN",
	"API.UNAUTHORIZED",
	// carries its own ten-second restart in ProcaptchaFrictionless
	"CAPTCHA.NO_SESSION_FOUND",
]);

// Fields the guard reads off the `/frictionless` result. Kept minimal
// (subset of BotDetectionFunctionResult) so the helper can be exercised
// without pulling in the full widget config surface.
export type FrictionlessGuardInput = {
	captchaType?: string;
	error?: { message?: string; key?: string };
};

const MISSING_CAPTCHA_TYPE_MESSAGE =
	"Frictionless response missing captchaType; halting captcha mount";

/**
 * Decide whether a `/frictionless` response is safe to mount an inner widget
 * against.
 *
 * `result.error?.message` catches the well-formed error shape emitted when
 * the provider surfaces a normal captcha error. A response with no
 * `captchaType` is the other failure mode: request-time short-circuits
 * (access-policy hard-block, decision-machine autoBan, domain / header
 * middleware rejections) emit a bare-string `{ error: "..." }` that does
 * not conform to `GetFrictionlessCaptchaResponse` but that
 * `HttpClientBase` returns verbatim because it does not throw on 4xx JSON.
 *
 * Without the missing-captchaType branch the caller falls through to
 * `renderForCaptchaType(undefined, ...)` — the default arm mounts
 * ProcaptchaPow, which then calls `/captcha/pow` with an undefined
 * sessionId and gets rejected as API.INCORRECT_CAPTCHA_TYPE (the sitekey
 * is frictionless-configured, so a direct pow call isn't allowed).
 */
export const evaluateFrictionlessResult = (
	result: FrictionlessGuardInput,
): FrictionlessGuardOutcome => {
	if (result.error?.message) {
		const key = result.error.key;
		return {
			kind: "error",
			message: result.error.message,
			...(key !== undefined && { key }),
			// A key we do not recognise means the provider failed in a way it
			// has no vocabulary for — API.BAD_REQUEST is what an unhandled throw
			// inside a handler serialises to. That is worth trying another
			// provider for. Retrying is gated on having a key at all: the
			// bare-string errors handled below are hard blocks, and re-rolling
			// those would hammer the fleet for traffic already refused.
			retryable: key !== undefined && !TERMINAL_ERROR_KEYS.has(key),
		};
	}
	if (!result.captchaType) {
		return {
			kind: "error",
			message: MISSING_CAPTCHA_TYPE_MESSAGE,
			retryable: false,
		};
	}
	return { kind: "pass" };
};

export { MISSING_CAPTCHA_TYPE_MESSAGE };

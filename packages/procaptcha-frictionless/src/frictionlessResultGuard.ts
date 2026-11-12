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

import type { ErrorCode } from "@prosopo/common";
import type { WidgetError } from "@prosopo/types";

export type FrictionlessGuardOutcome =
	| { kind: "pass" }
	| {
			kind: "error";
			message: string;
			error?: WidgetError;
			retryable: boolean;
	  };

/**
 * Error codes that describe the caller's situation rather than the provider's
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
const TERMINAL_ERROR_CODES: ReadonlySet<string> = new Set<ErrorCode>([
	"SITE_KEY_NOT_REGISTERED",
	"SITE_KEY_INVALID",
	"ORIGIN_NOT_ALLOWED",
	"INCORRECT_CAPTCHA_TYPE",
	"ACCESS_POLICY_BLOCK",
	"ABUSER_BLOCKED",
	"CRAWLER_BLOCKED",
	"DATACENTER_BLOCKED",
	"DISALLOWED_WEBVIEW",
	"MOBILE_BLOCKED",
	"PROXY_BLOCKED",
	"SATELLITE_BLOCKED",
	"TOR_BLOCKED",
	"VPN_BLOCKED",
	"FORBIDDEN",
	"UNAUTHORIZED",
	// carries its own ten-second restart in ProcaptchaFrictionless
	"NO_SESSION_FOUND",
]);

// Fields the guard reads off the `/frictionless` result. Kept minimal
// (subset of BotDetectionFunctionResult) so the helper can be exercised
// without pulling in the full widget config surface.
export type FrictionlessGuardInput = {
	captchaType?: string;
	error?: Partial<WidgetError>;
};

const MISSING_CAPTCHA_TYPE_MESSAGE =
	"Frictionless response missing captchaType; halting captcha mount";

/**
 * Decide whether a `/frictionless` response is safe to mount an inner widget
 * against.
 *
 * `result.error?.code` catches the well-formed error shape emitted when
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
	const code = result.error?.code;
	if (code) {
		const errorId = result.error?.errorId ?? code;
		const message = result.error?.message;
		return {
			kind: "error",
			message: message ?? errorId,
			error: { code, errorId, ...(message !== undefined && { message }) },
			// An unhandled throw inside a handler reaches us as BACKEND_ERROR: the
			// provider failed, so another provider is worth trying. Bare-string
			// errors (handled below) carry no code; they are hard blocks, and
			// re-rolling those would hammer the fleet for traffic already refused.
			retryable: !TERMINAL_ERROR_CODES.has(code),
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

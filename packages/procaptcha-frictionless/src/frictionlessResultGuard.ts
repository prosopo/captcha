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
	| { kind: "error"; message: string; key?: string };

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
		return {
			kind: "error",
			message: result.error.message,
			...(result.error.key !== undefined && { key: result.error.key }),
		};
	}
	if (!result.captchaType) {
		return { kind: "error", message: MISSING_CAPTCHA_TYPE_MESSAGE };
	}
	return { kind: "pass" };
};

export { MISSING_CAPTCHA_TYPE_MESSAGE };

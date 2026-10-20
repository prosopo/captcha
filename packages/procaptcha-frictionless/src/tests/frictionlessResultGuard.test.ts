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

import { describe, expect, it } from "vitest";
import {
	MISSING_CAPTCHA_TYPE_MESSAGE,
	evaluateFrictionlessResult,
} from "../frictionlessResultGuard.js";

// This guard exists so a `/frictionless` response with no `captchaType`
// (the shape emitted by request-time short-circuits — access-policy
// hard-block, decision-machine autoBan, domain / header middleware
// rejections — whose `{ error: "..." }` bare-string bodies slip past
// `error.message` inspection) cannot fall through into
// `renderForCaptchaType(undefined, ...)` and mount ProcaptchaPow with an
// undefined sessionId, which the provider then rejects as
// API.INCORRECT_CAPTCHA_TYPE for a frictionless sitekey.

describe("evaluateFrictionlessResult", () => {
	it("passes a well-formed response with a captchaType", () => {
		expect(
			evaluateFrictionlessResult({
				captchaType: "pow",
			}),
		).toEqual({ kind: "pass" });
	});

	it("passes when a captchaType is present even if error is a bare undefined", () => {
		expect(
			evaluateFrictionlessResult({
				captchaType: "image",
				error: undefined,
			}),
		).toEqual({ kind: "pass" });
	});

	it("returns a structured error when the server emits `{ error: { code } }`", () => {
		expect(
			evaluateFrictionlessResult({
				captchaType: "pow",
				error: {
					code: "BACKEND_ERROR",
					errorId: "BACKEND_ERROR:PROV-1",
					message: "Boom",
				},
			}),
		).toEqual({
			kind: "error",
			message: "Boom",
			error: {
				code: "BACKEND_ERROR",
				errorId: "BACKEND_ERROR:PROV-1",
				message: "Boom",
			},
			retryable: true,
		});
	});

	it("uses the errorId as the message of a hidden error", () => {
		const outcome = evaluateFrictionlessResult({
			captchaType: "pow",
			error: { code: "BACKEND_ERROR", errorId: "BACKEND_ERROR:PROV-1" },
		});
		if (outcome.kind !== "error") throw new Error("expected error outcome");
		expect(outcome.message).toBe("BACKEND_ERROR:PROV-1");
		expect(outcome.error).toEqual({
			code: "BACKEND_ERROR",
			errorId: "BACKEND_ERROR:PROV-1",
		});
	});

	it("ignores an error with a message but no code", () => {
		expect(
			evaluateFrictionlessResult({
				captchaType: "pow",
				error: { message: "Boom" },
			}),
		).toEqual({ kind: "pass" });
	});

	it("halts when captchaType is missing (bare-string 401 body shape from access-policy / autoBan / middleware)", () => {
		// Access-policy hard-block / decision-machine autoBan / domain
		// middleware all return `{"error":"Unauthorized"}` — a bare
		// string, not `{code}`, so `error.code` is undefined and
		// would slip past the earlier error check. HttpClientBase does
		// not throw on 4xx JSON so the widget receives this as a
		// valid-looking result.
		expect(
			evaluateFrictionlessResult({
				// Simulating the JSON parse: `error` came in as a string on
				// the wire but is not the object shape the guard reads.
				error: undefined,
			}),
		).toEqual({
			kind: "error",
			message: MISSING_CAPTCHA_TYPE_MESSAGE,
			retryable: false,
		});
	});

	it("halts when both captchaType and error are absent (opaque parse failure)", () => {
		expect(evaluateFrictionlessResult({})).toEqual({
			kind: "error",
			message: MISSING_CAPTCHA_TYPE_MESSAGE,
			retryable: false,
		});
	});

	it("prefers the structured error over the missing-captchaType message when both apply", () => {
		// If the server ever emits BOTH a structured error and no captchaType,
		// the structured error is the more informative signal.
		const outcome = evaluateFrictionlessResult({
			error: {
				code: "BACKEND_ERROR",
				errorId: "BACKEND_ERROR:PROV-1",
				message: "Server error",
			},
		});
		expect(outcome).toMatchObject({
			kind: "error",
			message: "Server error",
			retryable: true,
		});
	});

	describe("retryable classification", () => {
		const retryableOf = (code?: string): boolean => {
			const outcome = evaluateFrictionlessResult({
				error: {
					message: "msg",
					...(code !== undefined && { code, errorId: `${code}:PROV-1` }),
				},
			});
			if (outcome.kind !== "error") throw new Error("expected error outcome");
			return outcome.retryable;
		};

		it.each([
			"SITE_KEY_NOT_REGISTERED",
			"SITE_KEY_INVALID",
			"ORIGIN_NOT_ALLOWED",
			"INCORRECT_CAPTCHA_TYPE",
		])("shows integration fault %s rather than re-rolling", (code: string) => {
			// Another provider returns the same answer, and the text is what
			// tells the site owner what to change.
			expect(retryableOf(code)).toBe(false);
		});

		it.each([
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
		])("does not re-roll policy denial %s", (code: string) => {
			// Every provider shares the decision; retrying would hammer the
			// fleet on behalf of traffic already refused.
			expect(retryableOf(code)).toBe(false);
		});

		it("leaves NO_SESSION_FOUND to its own restart timer", () => {
			expect(retryableOf("NO_SESSION_FOUND")).toBe(false);
		});

		it("re-rolls BACKEND_ERROR, which is what an unhandled provider throw becomes", () => {
			// The client does not throw on an error status with a JSON body — so
			// without re-rolling, one unhealthy provider stranded the user on the
			// first response while the rest of the fleet was up.
			expect(retryableOf("BACKEND_ERROR")).toBe(true);
		});

		it.each(["INVALID_REQUEST", "DB_UNAVAILABLE", "SOMETHING_NEW"])(
			"re-rolls provider fault %s",
			(code: string) => {
				expect(retryableOf(code)).toBe(true);
			},
		);
	});
});

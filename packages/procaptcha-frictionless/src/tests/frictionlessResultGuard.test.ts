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

	it("returns a structured error when the server emits `{ error: { message } }`", () => {
		expect(
			evaluateFrictionlessResult({
				captchaType: "pow",
				error: { message: "Boom", key: "API.SOMETHING" },
			}),
		).toEqual({
			kind: "error",
			message: "Boom",
			key: "API.SOMETHING",
			retryable: true,
		});
	});

	it("omits key from the outcome when the server error carries no key", () => {
		const outcome = evaluateFrictionlessResult({
			captchaType: "pow",
			error: { message: "Boom" },
		});
		expect(outcome.kind).toBe("error");
		if (outcome.kind !== "error") throw new Error("expected error outcome");
		expect(outcome.message).toBe("Boom");
		expect("key" in outcome).toBe(false);
	});

	it("halts when captchaType is missing (bare-string 401 body shape from access-policy / autoBan / middleware)", () => {
		// Access-policy hard-block / decision-machine autoBan / domain
		// middleware all return `{"error":"Unauthorized"}` — a bare
		// string, not `{message}`, so `error.message` is undefined and
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
		expect(
			evaluateFrictionlessResult({
				error: { message: "Server error", key: "API.SERVER_ERROR" },
			}),
		).toEqual({
			kind: "error",
			message: "Server error",
			key: "API.SERVER_ERROR",
			retryable: true,
		});
	});

	describe("retryable classification", () => {
		const retryableOf = (key?: string): boolean => {
			const outcome = evaluateFrictionlessResult({
				error: { message: "msg", ...(key !== undefined && { key }) },
			});
			if (outcome.kind !== "error") throw new Error("expected error outcome");
			return outcome.retryable;
		};

		it.each([
			"API.SITE_KEY_NOT_REGISTERED",
			"API.INVALID_SITE_KEY",
			"API.UNAUTHORIZED_ORIGIN_URL",
			"API.INCORRECT_CAPTCHA_TYPE",
		])("shows integration fault %s rather than re-rolling", (key: string) => {
			// Another provider returns the same answer, and the text is what
			// tells the site owner what to change.
			expect(retryableOf(key)).toBe(false);
		});

		it.each([
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
		])("does not re-roll policy denial %s", (key: string) => {
			// Every provider shares the decision; retrying would hammer the
			// fleet on behalf of traffic already refused.
			expect(retryableOf(key)).toBe(false);
		});

		it("leaves CAPTCHA.NO_SESSION_FOUND to its own restart timer", () => {
			expect(retryableOf("CAPTCHA.NO_SESSION_FOUND")).toBe(false);
		});

		it("re-rolls API.BAD_REQUEST, which is what an unhandled provider throw becomes", () => {
			// An unhandled throw in a handler serialises to this with a 400, and
			// the client does not throw on a 400 with a JSON body — so without
			// re-rolling, one unhealthy provider stranded the user on the first
			// response while the rest of the fleet was up.
			expect(retryableOf("API.BAD_REQUEST")).toBe(true);
		});

		it.each(["API.UNKNOWN", "API.INTERNAL_SERVER_ERROR", "DATABASE.UNKNOWN"])(
			"re-rolls unrecognised provider fault %s",
			(key: string) => {
				expect(retryableOf(key)).toBe(true);
			},
		);

		it("does not re-roll an error with no key at all", () => {
			// Hard blocks arrive as a bare `{ error: "..." }` string with no key.
			expect(retryableOf(undefined)).toBe(false);
		});
	});
});

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
		).toEqual({ kind: "error", message: "Boom", key: "API.SOMETHING" });
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
		).toEqual({ kind: "error", message: MISSING_CAPTCHA_TYPE_MESSAGE });
	});

	it("halts when both captchaType and error are absent (opaque parse failure)", () => {
		expect(evaluateFrictionlessResult({})).toEqual({
			kind: "error",
			message: MISSING_CAPTCHA_TYPE_MESSAGE,
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
		});
	});
});

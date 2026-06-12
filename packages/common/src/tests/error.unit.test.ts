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

import { NativeLogger } from "@prosopo/logger";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProsopoApiError, ProsopoEnvError, unwrapError } from "../error.js";

describe("ProsopoBaseError construction is decoupled from i18n and logging", () => {
	it("stores the translation key without translating it", () => {
		const err = new ProsopoApiError("API.INVALID_SITE_KEY", {
			context: { code: 400 },
		});

		// The error carries the key verbatim; translation is deferred to the
		// presentation layer (UI render / HTTP response), not construction.
		expect(err.translationKey).toBe("API.INVALID_SITE_KEY");
		expect(err.message).toBe("API.INVALID_SITE_KEY");
		expect(err.code).toBe(400);
	});

	it("uses an explicit message option as the fallback message while keeping the key", () => {
		const err = new ProsopoApiError("API.INVALID_SITE_KEY", {
			message: "Invalid site key",
			context: { code: 400 },
		});

		expect(err.translationKey).toBe("API.INVALID_SITE_KEY");
		expect(err.message).toBe("Invalid site key");
	});

	it("keeps the causing Error as `cause` and uses its message as the fallback", () => {
		const inner = new Error("kaboom");
		const err = new ProsopoEnvError("API.UNKNOWN", {
			cause: inner,
			context: { code: 500 },
		});

		expect(err.cause).toBe(inner);
		expect(err.message).toBe("kaboom");
		expect(err.translationKey).toBe("API.UNKNOWN");
	});

	it("falls back to the cause's message while keeping a placeholder key", () => {
		const err = new ProsopoEnvError("GENERAL.UNKNOWN", {
			cause: new Error("raw failure"),
		});

		expect(err.translationKey).toBe("GENERAL.UNKNOWN");
		expect(err.message).toBe("raw failure");
	});

	it("defaults the API error code to 500 when none is supplied", () => {
		const err = new ProsopoApiError("API.UNKNOWN");

		expect(err.code).toBe(500);
	});
});

describe("Logger.unpackError prefers translationKey over the translated message", () => {
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		consoleErrorSpy.mockRestore();
	});

	it("emits the translation key as the top-level `err` when a ProsopoApiError is logged", () => {
		const apiError = new ProsopoApiError("API.INVALID_SITE_KEY", {
			message: "Invalid site key",
			context: { code: 400 },
		});

		const logger = new NativeLogger("test");
		logger.error(() => ({ err: apiError }));

		expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
		const output = consoleErrorSpy.mock.calls[0]?.[0] as string;
		const parsed = JSON.parse(output) as { err?: string };
		// The locale-stable key is logged, not the human-readable message.
		expect(parsed.err).toBe("API.INVALID_SITE_KEY");
		expect(parsed.err).not.toBe("Invalid site key");
	});

	it("falls back to `message` when the error has no translationKey", () => {
		const plain = new Error("plain failure");
		const logger = new NativeLogger("test");
		logger.error(() => ({ err: plain }));

		const output = consoleErrorSpy.mock.calls[0]?.[0] as string;
		const parsed = JSON.parse(output) as { err?: string };
		expect(parsed.err).toBe("plain failure");
	});
});

describe("unwrapError produces a JSON response carrying the translation key", () => {
	it("exposes the translation key and code on the JSON response", () => {
		const err = new ProsopoApiError("API.INVALID_SITE_KEY", {
			message: "Invalid site key",
			context: { code: 400 },
		});

		const { code, jsonError } = unwrapError(err);
		expect(jsonError.key).toBe("API.INVALID_SITE_KEY");
		expect(jsonError.message).toBe("Invalid site key");
		expect(jsonError.code).toBe(400);
		expect(code).toBe(400);
	});

	it("defaults the key to API.UNKNOWN for a non-Prosopo error that has no translation key", () => {
		const { jsonError } = unwrapError(new SyntaxError("raw failure"));
		expect(jsonError.key).toBe("API.UNKNOWN");
		expect(jsonError.message).toBe("raw failure");
	});
});

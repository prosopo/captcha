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

import {
	type LogObject,
	type LogRecord,
	type LogRecordFn,
	type Logger,
	NativeLogger,
} from "@prosopo/logger";
import type { TFunction } from "i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProsopoApiError, ProsopoEnvError, unwrapError } from "../error.js";

// Tiny stand-in for the i18next translator. Keys present in the map are
// translated, anything else falls through unchanged (mirrors i18next behavior
// for unknown keys).
const makeI18n = (translations: Record<string, string>): { t: TFunction } => {
	const t = ((key: string) => translations[key] ?? key) as unknown as TFunction;
	return { t };
};

const englishI18n = makeI18n({
	"CAPTCHA.NO_SESSION_FOUND": "No session found",
	"API.INVALID_SITE_KEY": "Invalid site key",
	"API.UNKNOWN": "Unknown error",
});

const frenchI18n = makeI18n({
	"CAPTCHA.NO_SESSION_FOUND": "Aucune session trouvée",
	"API.INVALID_SITE_KEY": "Clé de site invalide",
});

// Mock logger that captures the LogRecord produced by each invocation so we
// can assert on the emitted shape.
type CapturedLog = { level: string; record: LogRecord };

const makeCapturingLogger = (): {
	logger: Logger;
	logs: CapturedLog[];
} => {
	const logs: CapturedLog[] = [];
	const capture = (level: string) => (fn: LogRecordFn) => {
		logs.push({ level, record: fn() });
	};
	const logger: Logger = {
		setLogLevel: () => {},
		getLogLevel: () => "info",
		getScope: () => "test",
		info: capture("info"),
		debug: capture("debug"),
		trace: capture("trace"),
		warn: capture("warn"),
		error: capture("error"),
		fatal: capture("fatal"),
		log: (level, fn) => capture(level)(fn),
		with: () => logger,
		getPretty: () => false,
		setPretty: () => {},
		getPrintStack: () => false,
		setPrintStack: () => {},
		getFormat: () => "json",
		setFormat: () => {},
	};
	return { logger, logs };
};

describe("ProsopoBaseError.logError", () => {
	it("logs the translation key as the top-level `err` field, not the translated message", () => {
		const { logger, logs } = makeCapturingLogger();

		new ProsopoApiError("CAPTCHA.NO_SESSION_FOUND", {
			context: { code: 400 },
			i18n: englishI18n,
			logger,
		});

		expect(logs).toHaveLength(1);
		expect(logs[0]?.level).toBe("error");
		expect(logs[0]?.record.err).toBe("CAPTCHA.NO_SESSION_FOUND");
		// The translated string must not be the top-level err.
		expect(logs[0]?.record.err).not.toBe("No session found");
	});

	it("logs the same translation key regardless of locale", () => {
		const { logger: enLogger, logs: enLogs } = makeCapturingLogger();
		const { logger: frLogger, logs: frLogs } = makeCapturingLogger();

		new ProsopoApiError("CAPTCHA.NO_SESSION_FOUND", {
			context: { code: 400 },
			i18n: englishI18n,
			logger: enLogger,
		});
		new ProsopoApiError("CAPTCHA.NO_SESSION_FOUND", {
			context: { code: 400 },
			i18n: frenchI18n,
			logger: frLogger,
		});

		expect(enLogs[0]?.record.err).toBe("CAPTCHA.NO_SESSION_FOUND");
		expect(frLogs[0]?.record.err).toBe("CAPTCHA.NO_SESSION_FOUND");
	});

	it("emits errorType and context under `data`, with no `errorParams` nesting", () => {
		const { logger, logs } = makeCapturingLogger();

		new ProsopoApiError("API.INVALID_SITE_KEY", {
			context: { code: 400, siteKey: "abc" },
			i18n: englishI18n,
			logger,
		});

		const data = logs[0]?.record.data as LogObject & {
			errorType?: string;
			context?: Record<string, unknown>;
			errorParams?: unknown;
		};
		expect(data?.errorType).toBe("ProsopoApiError");
		expect(data?.context?.code).toBe(400);
		expect(data?.context?.siteKey).toBe("abc");
		expect(data?.errorParams).toBeUndefined();
	});

	it("does not inject a translated `translationMessage` into context when wrapping an Error", () => {
		const { logger, logs } = makeCapturingLogger();

		const inner = new Error("kaboom");
		new ProsopoEnvError(inner, {
			translationKey: "API.UNKNOWN",
			context: { code: 500 },
			i18n: englishI18n,
			logger,
		});

		const data = logs[0]?.record.data as LogObject & {
			context?: Record<string, unknown>;
		};
		expect(data?.context?.translationMessage).toBeUndefined();
		// The translation key still appears at the top level via `err`.
		expect(logs[0]?.record.err).toBe("API.UNKNOWN");
	});

	it("falls back to `message` when no translation key is available", () => {
		const { logger, logs } = makeCapturingLogger();

		// Constructed from a plain Error with no translationKey option.
		new ProsopoEnvError(new Error("raw failure"), {
			i18n: englishI18n,
			logger,
		});

		expect(logs[0]?.record.err).toBe("raw failure");
	});

	it("respects `silent: true` and does not log", () => {
		const { logger, logs } = makeCapturingLogger();

		new ProsopoApiError("API.INVALID_SITE_KEY", {
			context: { code: 400 },
			i18n: englishI18n,
			logger,
			silent: true,
		});

		expect(logs).toHaveLength(0);
	});

	it("logs at debug level and includes the stack when logLevel is 'debug'", () => {
		const { logger, logs } = makeCapturingLogger();

		new ProsopoApiError("API.INVALID_SITE_KEY", {
			context: { code: 400 },
			i18n: englishI18n,
			logger,
			logLevel: "debug",
		});

		expect(logs[0]?.level).toBe("debug");
		expect(logs[0]?.record.err).toBe("API.INVALID_SITE_KEY");
		const data = logs[0]?.record.data as LogObject & { stack?: string };
		expect(typeof data?.stack).toBe("string");
	});
});

describe("Logger.unpackError prefers translationKey over translated message", () => {
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		consoleErrorSpy.mockRestore();
	});

	it("emits the translation key as the top-level `err` when a ProsopoApiError is passed via { err }", () => {
		// Build the error first with `silent: true` so its own auto-log doesn't
		// interfere with the spy.
		const apiError = new ProsopoApiError("CAPTCHA.NO_SESSION_FOUND", {
			context: { code: 400 },
			i18n: frenchI18n, // .message is "Aucune session trouvée"
			silent: true,
		});

		// `apiError.message` is the (French) translation; we want the logger
		// to emit the *key* at top level instead.
		expect(apiError.message).toBe("Aucune session trouvée");

		const logger = new NativeLogger("test");
		logger.error(() => ({ err: apiError }));

		expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
		const output = consoleErrorSpy.mock.calls[0]?.[0] as string;
		const parsed = JSON.parse(output) as { err?: string };
		expect(parsed.err).toBe("CAPTCHA.NO_SESSION_FOUND");
		expect(parsed.err).not.toBe("Aucune session trouvée");
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

describe("unwrapError still produces a translated HTTP response", () => {
	it("translates the message via i18n for the response body even though the log emits the key", () => {
		// Build silently so we don't pollute test output.
		const err = new ProsopoApiError("CAPTCHA.NO_SESSION_FOUND", {
			context: { code: 400 },
			i18n: englishI18n,
			silent: true,
		});

		const { jsonError } = unwrapError(err, englishI18n);
		expect(jsonError.message).toBe("No session found");
		expect(jsonError.key).toBe("CAPTCHA.NO_SESSION_FOUND");
		expect(jsonError.code).toBe(400);
	});

	it("exposes the translation key on the JSON response regardless of construction locale", () => {
		// Same error constructed under two different locales; both responses
		// must carry the same `key` so clients can branch on it consistently.
		const enErr = new ProsopoApiError("CAPTCHA.NO_SESSION_FOUND", {
			context: { code: 400 },
			i18n: englishI18n,
			silent: true,
		});
		const frErr = new ProsopoApiError("CAPTCHA.NO_SESSION_FOUND", {
			context: { code: 400 },
			i18n: frenchI18n,
			silent: true,
		});

		expect(unwrapError(enErr, englishI18n).jsonError.key).toBe(
			"CAPTCHA.NO_SESSION_FOUND",
		);
		expect(unwrapError(frErr, frenchI18n).jsonError.key).toBe(
			"CAPTCHA.NO_SESSION_FOUND",
		);
	});

	it("derives statusMessage from the resolved status code, not a hardcoded 'Bad Request'", () => {
		const err = new ProsopoApiError("CAPTCHA.NO_SESSION_FOUND", {
			context: { code: 401 },
			i18n: englishI18n,
			silent: true,
		});

		const { code, statusMessage } = unwrapError(err, englishI18n);
		expect(code).toBe(401);
		expect(statusMessage).toBe("Unauthorized");
	});

	it("falls back to a 5xx reason phrase for an unmapped server-error code", () => {
		// 599 is unassigned, so it exercises the fallback rather than a real phrase.
		const err = new ProsopoApiError("CAPTCHA.NO_SESSION_FOUND", {
			context: { code: 599 },
			i18n: englishI18n,
			silent: true,
		});

		const { code, statusMessage } = unwrapError(err, englishI18n);
		expect(code).toBe(599);
		expect(statusMessage).toBe("Internal Server Error");
	});
});

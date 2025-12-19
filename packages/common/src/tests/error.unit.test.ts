// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import type { TFunction } from "i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import {
	ProsopoApiError,
	ProsopoCliError,
	ProsopoContractError,
	ProsopoDBError,
	ProsopoDatasetError,
	ProsopoEnvError,
	ProsopoError,
	ProsopoTxQueueError,
	isZodError,
	unwrapError,
} from "./src/error.js";
import { getLogger } from "./src/logger.js";

describe("ProsopoError classes", () => {
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("ProsopoError", () => {
		it("should create error with message", () => {
			const error = new ProsopoError("TEST.ERROR");

			expect(error.message).toBe("TEST.ERROR");
			expect(error.name).toBe("Error");
			expect(error.translationKey).toBe("TEST.ERROR");
		});

		it("should create error from Error instance", () => {
			const baseError = new Error("Original error");
			const error = new ProsopoError(baseError);

			expect(error.message).toBe("Original error");
			expect(consoleErrorSpy).toHaveBeenCalled();
		});

		it("should create error with context", () => {
			const error = new ProsopoError("TEST.ERROR", {
				context: { userId: "123", action: "test" },
			});

			expect(error.context?.userId).toBe("123");
			expect(error.context?.action).toBe("test");
		});

		it("should create error with translation key when passing Error instance", () => {
			const baseError = new Error("Original error");
			const error = new ProsopoError(baseError, {
				translationKey: "TEST.TRANSLATION",
			});

			expect(error.translationKey).toBe("TEST.TRANSLATION");
		});

		it("should log custom name when provided", () => {
			new ProsopoError("TEST.ERROR", {
				name: "CustomError",
			});

			expect(consoleErrorSpy).toHaveBeenCalled();
			const logOutput = consoleErrorSpy.mock.calls[0][0];
			const parsed = JSON.parse(logOutput);
			expect(parsed.data.errorType).toBe("CustomError");
		});

		it("should use provided logger", () => {
			const mockLogger = getLogger("info", "test");
			const errorSpy = vi.spyOn(mockLogger, "error");

			new ProsopoError("TEST.ERROR", { logger: mockLogger });

			expect(errorSpy).toHaveBeenCalled();
		});

		it("should not log when silent option is true", () => {
			new ProsopoError("TEST.ERROR", { silent: true });

			expect(consoleErrorSpy).not.toHaveBeenCalled();
		});

		it("should log at debug level when specified", () => {
			const mockLogger = getLogger("debug", "test");
			const debugSpy = vi.spyOn(mockLogger, "debug");

			new ProsopoError("TEST.ERROR", {
				logger: mockLogger,
				logLevel: "debug",
			});

			expect(debugSpy).toHaveBeenCalled();
		});

		it("should use i18n translation function when provided", () => {
			const mockT = vi.fn((key: string) => `translated_${key}`);
			const error = new ProsopoError("TEST.ERROR", {
				silent: true,
				i18n: { t: mockT as unknown as TFunction },
			});

			expect(mockT).toHaveBeenCalledWith("TEST.ERROR");
			expect(error.message).toBe("translated_TEST.ERROR");
		});
	});

	describe("ProsopoEnvError", () => {
		it("should create env error with missing env vars", () => {
			const error = new ProsopoEnvError("ENV.MISSING", {
				context: { missingEnvVars: ["API_KEY", "SECRET"] },
			});

			expect(error.message).toBe("ENV.MISSING");
			expect(error.context?.missingEnvVars).toEqual(["API_KEY", "SECRET"]);
		});
	});

	describe("ProsopoContractError", () => {
		it("should create contract error with context", () => {
			const error = new ProsopoContractError("CONTRACT.FAILED", {
				context: { failedFuncName: "submitTransaction" },
			});

			expect(error.message).toBe("CONTRACT.FAILED");
			expect(error.context?.failedFuncName).toBe("submitTransaction");
		});
	});

	describe("ProsopoTxQueueError", () => {
		it("should create tx queue error", () => {
			const error = new ProsopoTxQueueError("TX_QUEUE.FAILED", {
				context: { code: 500 },
			});

			expect(error.message).toBe("TX_QUEUE.FAILED");
			expect(error.context?.code).toBe(500);
		});
	});

	describe("ProsopoDBError", () => {
		it("should create db error with captcha ids", () => {
			const error = new ProsopoDBError("DB.NOT_FOUND", {
				context: { captchaId: ["id1", "id2"] },
			});

			expect(error.message).toBe("DB.NOT_FOUND");
			expect(error.context?.captchaId).toEqual(["id1", "id2"]);
		});
	});

	describe("ProsopoCliError", () => {
		it("should create cli error", () => {
			const error = new ProsopoCliError("CLI.INVALID_COMMAND", {
				context: { failedFuncName: "setupDatabase" },
			});

			expect(error.message).toBe("CLI.INVALID_COMMAND");
			expect(error.context?.failedFuncName).toBe("setupDatabase");
		});
	});

	describe("ProsopoDatasetError", () => {
		it("should create dataset error", () => {
			const error = new ProsopoDatasetError("DATASET.INVALID", {
				context: { failedFuncName: "validateDataset" },
			});

			expect(error.message).toBe("DATASET.INVALID");
			expect(error.context?.failedFuncName).toBe("validateDataset");
		});
	});

	describe("ProsopoApiError", () => {
		it("should create api error with default code", () => {
			const error = new ProsopoApiError("API.ERROR");

			expect(error.message).toBe("API.ERROR");
			expect(error.code).toBe(500);
		});

		it("should create api error with custom code", () => {
			const error = new ProsopoApiError("API.NOT_FOUND", {
				context: { code: 404 },
			});

			expect(error.message).toBe("API.NOT_FOUND");
			expect(error.code).toBe(404);
			expect(error.context?.code).toBe(404);
		});

		it("should preserve translation key from nested ProsopoBaseError", () => {
			const baseError = new Error("Inner error");
			const innerError = new ProsopoError(baseError, {
				translationKey: "INNER.TRANSLATION",
				silent: true,
			});
			const apiError = new ProsopoApiError(innerError, {
				context: { code: 400 },
				silent: true,
			});

			expect(apiError.context?.translationKey).toBe("INNER.TRANSLATION");
		});
	});
});

describe("unwrapError", () => {
	const mockT = (key: string) => key;
	const mockI18n = { t: mockT as TFunction };

	it("should unwrap a nested Prosopo error", () => {
		const inner = new ProsopoApiError("API.MISSING_BODY", {
			context: { code: 400 },
			silent: true,
		});
		const outer = new ProsopoApiError("API.UNKNOWN", {
			context: { error: inner },
			silent: true,
		});

		const unwrapped = unwrapError(outer, mockI18n);

		expect(unwrapped.code).toBe(400);
		expect(unwrapped.jsonError.message).toBe("API.MISSING_BODY");
		expect(unwrapped.jsonError.key).toBe("API.MISSING_BODY");
		expect(unwrapped.jsonError.code).toBe(400);
		expect(unwrapped.statusMessage).toBe("Bad Request");
	});

	it("should unwrap a double nested Prosopo error", () => {
		const inner1 = new ProsopoApiError("API.UNAUTHORIZED", {
			context: { code: 401 },
			silent: true,
		});
		const inner2 = new ProsopoApiError("API.MISSING_BODY", {
			context: { code: 400, error: inner1 },
			silent: true,
		});
		const outer = new ProsopoApiError("API.UNKNOWN", {
			context: { error: inner2 },
			silent: true,
		});

		const unwrapped = unwrapError(outer, mockI18n);

		expect(unwrapped.code).toBe(401);
		expect(unwrapped.jsonError.message).toBe("API.UNAUTHORIZED");
		expect(unwrapped.jsonError.key).toBe("API.UNAUTHORIZED");
		expect(unwrapped.jsonError.code).toBe(401);
		expect(unwrapped.statusMessage).toBe("Bad Request");
	});

	it("should not unwrap a base Error class", () => {
		const inner1 = new Error("I should not be seen");
		const inner2 = new ProsopoApiError("API.MISSING_BODY", {
			context: { code: 400, error: inner1 },
			silent: true,
		});
		const outer = new ProsopoApiError("API.UNKNOWN", {
			context: { error: inner2 },
			silent: true,
		});

		const unwrapped = unwrapError(outer, mockI18n);

		expect(unwrapped.code).toBe(400);
		expect(unwrapped.jsonError.message).toBe("API.MISSING_BODY");
		expect(unwrapped.jsonError.key).toBe("API.MISSING_BODY");
		expect(unwrapped.jsonError.code).toBe(400);
		expect(unwrapped.statusMessage).toBe("Bad Request");
	});

	it("should handle ZodError", () => {
		const zodError = new ZodError([
			{
				code: "invalid_type",
				expected: "string",
				received: "number",
				path: ["field"],
				message: "Expected string, received number",
			},
		]);

		const unwrapped = unwrapError(zodError, mockI18n);

		expect(unwrapped.code).toBe(400);
		expect(unwrapped.jsonError.key).toBe("API.INVALID_BODY");
	});

	it("should use API.UNKNOWN as default key when no translation key is set", () => {
		// Create an error without a translationKey by passing an Error instance without translationKey option
		const baseError = new Error("Some error");
		const error = new ProsopoError(baseError, { silent: true });

		const unwrapped = unwrapError(error, mockI18n);

		expect(unwrapped.jsonError.key).toBe("API.UNKNOWN");
	});

	it("should work without i18n instance", () => {
		const error = new ProsopoApiError("API.ERROR", {
			context: { code: 500 },
			silent: true,
		});

		const unwrapped = unwrapError(error);

		expect(unwrapped.code).toBe(500);
		expect(unwrapped.jsonError.message).toBe("API.ERROR");
	});

	it("should preserve translation key from context", () => {
		const error = new ProsopoApiError("API.ERROR", {
			context: { translationKey: "CUSTOM.KEY", code: 400 },
			silent: true,
		});

		const unwrapped = unwrapError(error, mockI18n);

		expect(unwrapped.jsonError.key).toBe("CUSTOM.KEY");
	});

	it("should handle ZodError with object message", () => {
		const zodError = new ZodError([]);
		// Mock ZodError with object message
		Object.defineProperty(zodError, "message", {
			value: { code: 400, message: "Invalid data", key: "API.INVALID" },
			writable: true,
		});

		const unwrapped = unwrapError(zodError, mockI18n);

		expect(unwrapped.jsonError).toEqual({
			code: 400,
			message: "Invalid data",
			key: "API.INVALID",
		});
	});

	it("should default to code 400 for errors without code", () => {
		const error = new Error("Basic error");

		const unwrapped = unwrapError(error, mockI18n);

		expect(unwrapped.code).toBe(400);
	});
});

describe("isZodError", () => {
	it("should return true for ZodError instance", () => {
		const zodError = new ZodError([]);

		expect(isZodError(zodError)).toBe(true);
	});

	it("should return true for object with ZodError name", () => {
		const fakeZodError = { name: "ZodError" };

		expect(isZodError(fakeZodError)).toBe(true);
	});

	it("should return false for regular Error", () => {
		const error = new Error("test");

		expect(isZodError(error)).toBe(false);
	});

	it("should return false for non-error values", () => {
		expect(isZodError(null)).toBe(false);
		expect(isZodError(undefined)).toBe(false);
		expect(isZodError("string")).toBe(false);
		expect(isZodError(123)).toBe(false);
		expect(isZodError({})).toBe(false);
	});

	it("should return false for ProsopoError", () => {
		const error = new ProsopoError("TEST.ERROR", { silent: true });

		expect(isZodError(error)).toBe(false);
	});
});

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

import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { ZodError, z } from "zod";
import {
	ProsopoApiError,
	ProsopoBaseError,
	ProsopoCliError,
	ProsopoContractError,
	ProsopoDBError,
	ProsopoDatasetError,
	ProsopoEnvError,
	ProsopoError,
	ProsopoTxQueueError,
	isZodError,
	unwrapError,
} from "../error.js";
import { getLogger } from "../logger.js";

describe("error", () => {
	describe("ProsopoBaseError", () => {
		it("should create error from Error instance", () => {
			const originalError = new Error("Test error");
			const error = new ProsopoError(originalError);

			expect(error).toBeInstanceOf(ProsopoBaseError);
			expect(error.message).toBe("Test error");
			expect(error.translationKey).toBeUndefined();
			expect(error.context).toBeUndefined();
		});

		it("should create error from translation key", () => {
			const translationKey = "ERROR.TEST";
			const error = new ProsopoError(translationKey);

			expect(error).toBeInstanceOf(ProsopoBaseError);
			expect(error.translationKey).toBe(translationKey);
		});

		it("should include context when provided", () => {
			const context = { failedFuncName: "testFunc", code: 500 };
			const error = new ProsopoError("ERROR.TEST", { context });

			expect(error.context).toEqual(context);
		});

		it("should use custom logger when provided", () => {
			const logger = getLogger("info", "test");
			const errorSpy = vi.spyOn(logger, "error");
			const error = new ProsopoError("ERROR.TEST", { logger });

			expect(errorSpy).toHaveBeenCalled();
		});

		it("should use custom log level when provided", () => {
			const logger = getLogger("debug", "test");
			const debugSpy = vi.spyOn(logger, "debug");
			const error = new ProsopoError("ERROR.TEST", {
				logger,
				logLevel: "debug",
			});

			expect(debugSpy).toHaveBeenCalled();
		});

		it("should be silent when silent option is true", () => {
			const logger = getLogger("info", "test");
			const errorSpy = vi.spyOn(logger, "error");
			const error = new ProsopoError("ERROR.TEST", { logger, silent: true });

			expect(errorSpy).not.toHaveBeenCalled();
		});

		it("should include translation message in context when translationKey is provided", () => {
			const i18n = { t: (key: string) => `translated:${key}` };
			const error = new ProsopoError("ERROR.TEST", {
				translationKey: "ERROR.OTHER",
				i18n,
			});

			expect(error.context?.translationMessage).toBe("translated:ERROR.OTHER");
		});

		it("should handle i18n translation for Error message", () => {
			const i18n = { t: (key: string) => `translated:${key}` };
			const originalError = new Error("ERROR.TEST");
			const error = new ProsopoError(originalError, { i18n });

			expect(error.message).toBe("translated:ERROR.TEST");
		});
	});

	describe("ProsopoError", () => {
		it("should create ProsopoError with default name", () => {
			const error = new ProsopoError("ERROR.TEST");

			expect(error.name).toBe("ProsopoError");
		});

		it("should create ProsopoError with custom name", () => {
			const error = new ProsopoError("ERROR.TEST", { name: "CustomError" });

			expect(error.name).toBe("CustomError");
		});
	});

	describe("ProsopoEnvError", () => {
		it("should create ProsopoEnvError with env context", () => {
			const context = { missingEnvVars: ["VAR1", "VAR2"] };
			const error = new ProsopoEnvError("ERROR.ENV", { context });

			expect(error).toBeInstanceOf(ProsopoEnvError);
			expect(error.context?.missingEnvVars).toEqual(["VAR1", "VAR2"]);
		});
	});

	describe("ProsopoContractError", () => {
		it("should create ProsopoContractError", () => {
			const error = new ProsopoContractError("ERROR.CONTRACT");

			expect(error).toBeInstanceOf(ProsopoContractError);
		});
	});

	describe("ProsopoTxQueueError", () => {
		it("should create ProsopoTxQueueError", () => {
			const error = new ProsopoTxQueueError("ERROR.TX_QUEUE");

			expect(error).toBeInstanceOf(ProsopoTxQueueError);
		});
	});

	describe("ProsopoDBError", () => {
		it("should create ProsopoDBError with DB context", () => {
			const context = { captchaId: ["id1", "id2"] };
			const error = new ProsopoDBError("ERROR.DB", { context });

			expect(error).toBeInstanceOf(ProsopoDBError);
			expect(error.context?.captchaId).toEqual(["id1", "id2"]);
		});
	});

	describe("ProsopoCliError", () => {
		it("should create ProsopoCliError", () => {
			const error = new ProsopoCliError("ERROR.CLI");

			expect(error).toBeInstanceOf(ProsopoCliError);
		});
	});

	describe("ProsopoDatasetError", () => {
		it("should create ProsopoDatasetError", () => {
			const error = new ProsopoDatasetError("ERROR.DATASET");

			expect(error).toBeInstanceOf(ProsopoDatasetError);
		});
	});

	describe("ProsopoApiError", () => {
		it("should create ProsopoApiError with default code 500", () => {
			const error = new ProsopoApiError("ERROR.API");

			expect(error).toBeInstanceOf(ProsopoApiError);
			expect(error.code).toBe(500);
		});

		it("should create ProsopoApiError with custom code from context", () => {
			const context = { code: 404 };
			const error = new ProsopoApiError("ERROR.API", { context });

			expect(error.code).toBe(404);
		});

		it("should include translationKey from nested ProsopoBaseError", () => {
			const nestedError = new ProsopoError("ERROR.NESTED", {
				translationKey: "ERROR.NESTED_KEY",
			});
			const error = new ProsopoApiError(nestedError);

			expect(error.context?.translationKey).toBe("ERROR.NESTED_KEY");
		});
	});

	describe("isZodError", () => {
		it("should return true for ZodError instance", () => {
			const schema = z.string();
			try {
				schema.parse(123);
			} catch (err) {
				expect(isZodError(err)).toBe(true);
			}
		});

		it("should return true for object with ZodError name", () => {
			const fakeZodError = { name: "ZodError" } as ZodError;
			expect(isZodError(fakeZodError)).toBe(true);
		});

		it("should return false for regular Error", () => {
			const error = new Error("Test");
			expect(isZodError(error)).toBe(false);
		});

		it("should return false for ProsopoError", () => {
			const error = new ProsopoError("ERROR.TEST");
			expect(isZodError(error)).toBe(false);
		});

		it("should return false for null", () => {
			expect(isZodError(null)).toBe(false);
		});

		it("should return false for undefined", () => {
			expect(isZodError(undefined)).toBe(false);
		});

		it("should have correct type guard behavior", () => {
			const schema = z.string();
			let error: unknown;
			try {
				schema.parse(123);
			} catch (err) {
				error = err;
			}

			if (isZodError(error)) {
				expectTypeOf(error).toMatchTypeOf<ZodError>();
			}
		});
	});

	describe("unwrapError", () => {
		it("should unwrap ProsopoError with default code 400", () => {
			const error = new ProsopoError("ERROR.TEST");
			const result = unwrapError(error);

			expect(result.code).toBe(400);
			expect(result.statusMessage).toBe("Bad Request");
			expect(result.jsonError.message).toBe("ERROR.TEST");
			expect(result.jsonError.key).toBe("API.UNKNOWN");
		});

		it("should unwrap ProsopoApiError with custom code", () => {
			const error = new ProsopoApiError("ERROR.API", {
				context: { code: 404 },
			});
			const result = unwrapError(error);

			expect(result.code).toBe(404);
			expect(result.jsonError.code).toBe(404);
		});

		it("should unwrap nested ProsopoBaseError", () => {
			const innerError = new ProsopoError("ERROR.INNER");
			const outerError = new ProsopoApiError(innerError, {
				context: { error: innerError, code: 500 },
			});
			const result = unwrapError(outerError);

			expect(result.jsonError.key).toBe("API.UNKNOWN");
		});

		it("should unwrap error with translationKey in context", () => {
			const error = new ProsopoError("ERROR.TEST", {
				context: { translationKey: "ERROR.CONTEXT_KEY" },
			});
			const result = unwrapError(error);

			expect(result.jsonError.key).toBe("ERROR.CONTEXT_KEY");
		});

		it("should unwrap error with code in context", () => {
			const error = new ProsopoError("ERROR.TEST", {
				context: { code: 403 },
			});
			const result = unwrapError(error);

			expect(result.code).toBe(403);
			expect(result.jsonError.code).toBe(403);
		});

		it("should unwrap ZodError with string message", () => {
			const schema = z.string();
			let zodError: ZodError | undefined;
			try {
				schema.parse(123);
			} catch (err) {
				zodError = err as ZodError;
			}
			if (!zodError) throw new Error("Expected ZodError");
			const result = unwrapError(zodError);

			expect(result.code).toBe(400);
			expect(result.jsonError.key).toBe("API.INVALID_BODY");
		});

		it("should unwrap ZodError with object message", () => {
			const zodError = new ZodError([]);
			// biome-ignore lint/suspicious/noExplicitAny: Testing message parsing
			zodError.message = { code: 422, message: "Validation failed" } as any;
			const result = unwrapError(zodError);

			expect(result.jsonError).toEqual({
				code: 422,
				message: "Validation failed",
			});
		});

		it("should use i18n when provided", () => {
			const i18n = { t: (key: string) => `translated:${key}` };
			const error = new ProsopoError("ERROR.TEST");
			const result = unwrapError(error, i18n);

			expect(result.jsonError.message).toBe("translated:ERROR.TEST");
		});

		it("should preserve translationKey from ProsopoBaseError", () => {
			const error = new ProsopoError("ERROR.TEST", {
				translationKey: "ERROR.CUSTOM",
			});
			const result = unwrapError(error);

			expect(result.jsonError.key).toBe("ERROR.CUSTOM");
		});

		it("should handle deeply nested errors", () => {
			const level1 = new ProsopoError("ERROR.LEVEL1");
			const level2 = new ProsopoError("ERROR.LEVEL2", {
				context: { error: level1 },
			});
			const level3 = new ProsopoApiError(level2, {
				context: { error: level2, code: 500 },
			});
			const result = unwrapError(level3);

			expect(result.code).toBe(500);
		});

		it("should stop unwrapping when context.error is not ProsopoBaseError or ZodError", () => {
			const regularError = new Error("Regular error");
			const prosopoError = new ProsopoError("ERROR.TEST", {
				context: { error: regularError },
			});
			const result = unwrapError(prosopoError);

			expect(result.jsonError.key).toBe("API.UNKNOWN");
		});

		it("should handle SyntaxError", () => {
			const syntaxError = new SyntaxError("Invalid syntax");
			const result = unwrapError(syntaxError);

			expect(result.code).toBe(400);
			expect(result.jsonError.message).toBe("Invalid syntax");
		});

		it("should return correct types", () => {
			const error = new ProsopoError("ERROR.TEST");
			const result = unwrapError(error);

			expectTypeOf(result).toMatchTypeOf<{
				code: number;
				statusMessage: string;
				jsonError: { code: number; message: string; key: string };
			}>();
		});
	});
});

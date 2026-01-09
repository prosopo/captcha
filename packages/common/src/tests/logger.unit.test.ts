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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	DebugLevel,
	ErrorLevel,
	FatalLevel,
	FormatJson,
	InfoLevel,
	NativeLogger,
	TraceLevel,
	WarnLevel,
	getLogger,
	parseLogLevel,
	stringifyBigInts,
} from "../logger.js";

describe("stringifyBigInts", () => {
	it("should stringify big int", () => {
		const bigInt = BigInt(12345678901234567890n);

		const stringified = stringifyBigInts(bigInt);

		expect(stringified).toEqual(bigInt.toString());
	});

	it("should stringify big int in object properties", () => {
		const bigInt1 = BigInt(12345678901234567890n);
		const bigInt2 = BigInt(23456789012345678901n);

		const stringified = stringifyBigInts({
			first: bigInt1,
			second: {
				inner: {
					field: bigInt2,
				},
			},
			third: "third",
		});

		expect(stringified).toEqual({
			first: bigInt1.toString(),
			second: {
				inner: {
					field: bigInt2.toString(),
				},
			},
			third: "third",
		});
	});

	it("should stringify big int inside array", () => {
		const bigInt1 = BigInt(12345678901234567890n);
		const bigInt2 = BigInt(23456789012345678901n);
		const bigInt3 = BigInt(34567890123456789012n);

		const stringified = stringifyBigInts([
			bigInt1,
			["inner", bigInt2],
			{ name: "object", value: bigInt3 },
			"third",
		]);

		expect(stringified).toEqual([
			bigInt1.toString(),
			["inner", bigInt2.toString()],
			{ name: "object", value: bigInt3.toString() },
			"third",
		]);
	});

	it("should handle primitives without modification", () => {
		expect(stringifyBigInts("string")).toBe("string");
		expect(stringifyBigInts(123)).toBe(123);
		expect(stringifyBigInts(true)).toBe(true);
		expect(stringifyBigInts(null)).toBe(null);
		expect(stringifyBigInts(undefined)).toBe(undefined);
	});

	it("should handle mixed nested structures", () => {
		const bigInt1 = BigInt(12345678901234567890n);
		const bigInt2 = BigInt(23456789012345678901n);

		const input = {
			arr: [bigInt1, { nested: bigInt2 }],
			obj: { value: bigInt1 },
			primitive: "test",
		};

		const result = stringifyBigInts(input);

		expect(result).toEqual({
			arr: [bigInt1.toString(), { nested: bigInt2.toString() }],
			obj: { value: bigInt1.toString() },
			primitive: "test",
		});
	});
});

describe("parseLogLevel", () => {
	it("should parse valid log levels", () => {
		expect(parseLogLevel("info")).toBe(InfoLevel);
		expect(parseLogLevel("debug")).toBe(DebugLevel);
		expect(parseLogLevel("trace")).toBe(TraceLevel);
		expect(parseLogLevel("warn")).toBe(WarnLevel);
		expect(parseLogLevel("error")).toBe(ErrorLevel);
		expect(parseLogLevel("fatal")).toBe(FatalLevel);
	});

	it("should return default level for invalid input", () => {
		expect(parseLogLevel("invalid")).toBe(InfoLevel);
		expect(parseLogLevel("")).toBe(InfoLevel);
		expect(parseLogLevel(undefined)).toBe(InfoLevel);
	});

	it("should use custom default level", () => {
		expect(parseLogLevel("invalid", DebugLevel)).toBe(DebugLevel);
		expect(parseLogLevel(undefined, ErrorLevel)).toBe(ErrorLevel);
	});
});

describe("getLogger", () => {
	it("should create a logger with specified level and scope", () => {
		const logger = getLogger(DebugLevel, "test-scope");

		expect(logger.getLogLevel()).toBe(DebugLevel);
		expect(logger.getScope()).toBe("test-scope");
	});

	it("should create logger with info level", () => {
		const logger = getLogger(InfoLevel, "info-scope");

		expect(logger.getLogLevel()).toBe(InfoLevel);
	});
});

describe("NativeLogger", () => {
	let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
	let consoleDebugSpy: ReturnType<typeof vi.spyOn>;
	let consoleTraceSpy: ReturnType<typeof vi.spyOn>;
	let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
		consoleDebugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
		consoleTraceSpy = vi.spyOn(console, "trace").mockImplementation(() => {});
		consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("constructor and getters/setters", () => {
		it("should create logger with default info level", () => {
			const logger = new NativeLogger("test-scope");

			expect(logger.getLogLevel()).toBe(InfoLevel);
			expect(logger.getScope()).toBe("test-scope");
		});

		it("should set and get log level", () => {
			const logger = new NativeLogger("test");

			logger.setLogLevel(DebugLevel);
			expect(logger.getLogLevel()).toBe(DebugLevel);

			logger.setLogLevel(ErrorLevel);
			expect(logger.getLogLevel()).toBe(ErrorLevel);
		});

		it("should set and get pretty print", () => {
			const logger = new NativeLogger("test");

			expect(logger.getPretty()).toBe(false);

			logger.setPretty(true);
			expect(logger.getPretty()).toBe(true);

			logger.setPretty(false);
			expect(logger.getPretty()).toBe(false);
		});

		it("should set and get print stack", () => {
			const logger = new NativeLogger("test");

			expect(logger.getPrintStack()).toBe(false);

			logger.setPrintStack(true);
			expect(logger.getPrintStack()).toBe(true);

			logger.setPrintStack(false);
			expect(logger.getPrintStack()).toBe(false);
		});

		it("should set and get format", () => {
			const logger = new NativeLogger("test");

			expect(logger.getFormat()).toBe(FormatJson);
		});

		it("should throw error when setting non-JSON format", () => {
			const logger = new NativeLogger("test");

			expect(() => logger.setFormat("plain")).toThrow(
				"Only JSON format implemented for now",
			);
		});
	});

	describe("logging methods", () => {
		it("should log info message", () => {
			const logger = new NativeLogger("test");
			logger.setLogLevel(InfoLevel);

			logger.info(() => ({ msg: "test info" }));

			expect(consoleInfoSpy).toHaveBeenCalledOnce();
		});

		it("should log debug message when level is debug", () => {
			const logger = new NativeLogger("test");
			logger.setLogLevel(DebugLevel);

			logger.debug(() => ({ msg: "test debug" }));

			expect(consoleDebugSpy).toHaveBeenCalledOnce();
		});

		it("should not log debug message when level is info", () => {
			const logger = new NativeLogger("test");
			logger.setLogLevel(InfoLevel);

			logger.debug(() => ({ msg: "test debug" }));

			expect(consoleDebugSpy).not.toHaveBeenCalled();
		});

		it("should log trace message when level is trace", () => {
			const logger = new NativeLogger("test");
			logger.setLogLevel(TraceLevel);

			logger.trace(() => ({ msg: "test trace" }));

			expect(consoleTraceSpy).toHaveBeenCalledOnce();
		});

		it("should not log trace message when level is debug", () => {
			const logger = new NativeLogger("test");
			logger.setLogLevel(DebugLevel);

			logger.trace(() => ({ msg: "test trace" }));

			expect(consoleTraceSpy).not.toHaveBeenCalled();
		});

		it("should log warn message", () => {
			const logger = new NativeLogger("test");
			logger.setLogLevel(WarnLevel);

			logger.warn(() => ({ msg: "test warn" }));

			expect(consoleWarnSpy).toHaveBeenCalledOnce();
		});

		it("should log error message", () => {
			const logger = new NativeLogger("test");
			logger.setLogLevel(ErrorLevel);

			logger.error(() => ({ msg: "test error" }));

			expect(consoleErrorSpy).toHaveBeenCalledOnce();
		});

		it("should log fatal message", () => {
			const logger = new NativeLogger("test");
			logger.setLogLevel(FatalLevel);

			logger.fatal(() => ({ msg: "test fatal" }));

			expect(consoleErrorSpy).toHaveBeenCalledOnce();
		});

		it("should log data along with message", () => {
			const logger = new NativeLogger("test");
			logger.setLogLevel(InfoLevel);

			logger.info(() => ({ msg: "test", data: { key: "value" } }));

			expect(consoleInfoSpy).toHaveBeenCalledOnce();
			const call = consoleInfoSpy.mock.calls[0]?.[0];
			expect(call).toBeDefined();
			const parsed = JSON.parse(call as string);
			expect(parsed.msg).toBe("test");
			expect(parsed.data).toEqual({ key: "value" });
		});

		it("should log error objects", () => {
			const logger = new NativeLogger("test");
			logger.setLogLevel(ErrorLevel);

			const error = new Error("test error");
			logger.error(() => ({ err: error }));

			expect(consoleErrorSpy).toHaveBeenCalledOnce();
			const call = consoleErrorSpy.mock.calls[0]?.[0];
			expect(call).toBeDefined();
			const parsed = JSON.parse(call as string);
			expect(parsed.err).toBe("test error");
			expect(parsed.errData.name).toBe("Error");
		});

		it("should log error stack when printStack is true", () => {
			const logger = new NativeLogger("test");
			logger.setLogLevel(ErrorLevel);
			logger.setPrintStack(true);

			const error = new Error("test error");
			logger.error(() => ({ err: error }));

			expect(consoleErrorSpy).toHaveBeenCalledOnce();
			const call = consoleErrorSpy.mock.calls[0]?.[0];
			expect(call).toBeDefined();
			const parsed = JSON.parse(call as string);
			expect(parsed.errData.stack).toBeDefined();
		});

		it("should not log error stack when printStack is false", () => {
			const logger = new NativeLogger("test");
			logger.setLogLevel(ErrorLevel);
			logger.setPrintStack(false);

			const error = new Error("test error");
			logger.error(() => ({ err: error }));

			expect(consoleErrorSpy).toHaveBeenCalledOnce();
			const call = consoleErrorSpy.mock.calls[0]?.[0];
			expect(call).toBeDefined();
			const parsed = JSON.parse(call as string);
			expect(parsed.errData.stack).toBeUndefined();
		});
	});

	describe("log level hierarchy", () => {
		it("should respect log level hierarchy", () => {
			const logger = new NativeLogger("test");
			logger.setLogLevel(WarnLevel);

			// Should log (at or below warn)
			logger.fatal(() => ({ msg: "fatal" }));
			logger.error(() => ({ msg: "error" }));
			logger.warn(() => ({ msg: "warn" }));

			// Should not log (above warn)
			logger.info(() => ({ msg: "info" }));
			logger.debug(() => ({ msg: "debug" }));
			logger.trace(() => ({ msg: "trace" }));

			expect(consoleErrorSpy).toHaveBeenCalledTimes(2); // fatal and error use console.error
			expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
			expect(consoleInfoSpy).not.toHaveBeenCalled();
			expect(consoleDebugSpy).not.toHaveBeenCalled();
			expect(consoleTraceSpy).not.toHaveBeenCalled();
		});
	});

	describe("with method", () => {
		it("should create child logger with default data", () => {
			const logger = new NativeLogger("test");
			logger.setLogLevel(InfoLevel);

			const childLogger = logger.with({ userId: "123" });

			childLogger.info(() => ({ msg: "test message" }));

			expect(consoleInfoSpy).toHaveBeenCalledOnce();
			const call = consoleInfoSpy.mock.calls[0]?.[0];
			expect(call).toBeDefined();
			const parsed = JSON.parse(call as string);
			expect(parsed.data.userId).toBe("123");
		});

		it("should merge default data with new data", () => {
			const logger = new NativeLogger("test");
			logger.setLogLevel(InfoLevel);

			const childLogger = logger.with({ userId: "123" });

			childLogger.info(() => ({ msg: "test", data: { action: "login" } }));

			expect(consoleInfoSpy).toHaveBeenCalledOnce();
			const call = consoleInfoSpy.mock.calls[0]?.[0];
			expect(call).toBeDefined();
			const parsed = JSON.parse(call as string);
			expect(parsed.data.userId).toBe("123");
			expect(parsed.data.action).toBe("login");
		});

		it("should inherit log level from parent", () => {
			const logger = new NativeLogger("test");
			logger.setLogLevel(ErrorLevel);

			const childLogger = logger.with({ userId: "123" });

			expect(childLogger.getLogLevel()).toBe(ErrorLevel);
		});
	});

	describe("log method", () => {
		it("should route to correct log method based on level", () => {
			const logger = new NativeLogger("test");
			logger.setLogLevel(TraceLevel);

			logger.log("trace", () => ({ msg: "trace" }));
			logger.log("debug", () => ({ msg: "debug" }));
			logger.log("info", () => ({ msg: "info" }));
			logger.log("warn", () => ({ msg: "warn" }));
			logger.log("error", () => ({ msg: "error" }));
			logger.log("fatal", () => ({ msg: "fatal" }));

			expect(consoleTraceSpy).toHaveBeenCalledOnce();
			expect(consoleDebugSpy).toHaveBeenCalledOnce();
			expect(consoleInfoSpy).toHaveBeenCalledOnce();
			expect(consoleWarnSpy).toHaveBeenCalledOnce();
			expect(consoleErrorSpy).toHaveBeenCalledTimes(2); // error + fatal
		});

		it("should throw error for unknown log level", () => {
			const logger = new NativeLogger("test");

			// @ts-expect-error - testing invalid log level
			expect(() => logger.log("unknown", () => ({ msg: "test" }))).toThrow(
				"Unknown log level: unknown",
			);
		});
	});

	describe("error handling", () => {
		it("should handle error with cause", () => {
			const logger = new NativeLogger("test");
			logger.setLogLevel(ErrorLevel);
			logger.setPrintStack(true);

			const cause = new Error("cause error");
			const error = new Error("main error");
			Object.defineProperty(error, "cause", { value: cause });
			logger.error(() => ({ err: error }));

			expect(consoleErrorSpy).toHaveBeenCalledOnce();
			const call = consoleErrorSpy.mock.calls[0]?.[0];
			expect(call).toBeDefined();
			const parsed = JSON.parse(call as string);
			expect(parsed.errData.cause).toBeDefined();
		});

		it("should handle error with additional properties", () => {
			const logger = new NativeLogger("test");
			logger.setLogLevel(ErrorLevel);

			const error = Object.assign(new Error("test error"), {
				code: 500,
				details: "additional info",
				context: { userId: "123" },
			});
			logger.error(() => ({ err: error }));

			expect(consoleErrorSpy).toHaveBeenCalledOnce();
			const call = consoleErrorSpy.mock.calls[0]?.[0];
			expect(call).toBeDefined();
			const parsed = JSON.parse(call as string);
			expect(parsed.errData.code).toBe(500);
			expect(parsed.errData.details).toBe("additional info");
			expect(parsed.errData.context).toEqual({ userId: "123" });
		});

		it("should handle primitive error values", () => {
			const logger = new NativeLogger("test");
			logger.setLogLevel(ErrorLevel);

			logger.error(() => ({ err: "string error" }));

			expect(consoleErrorSpy).toHaveBeenCalledOnce();
			const call = consoleErrorSpy.mock.calls[0]?.[0];
			expect(call).toBeDefined();
			const parsed = JSON.parse(call as string);
			expect(parsed.err).toBe("string error");
		});

		it("should handle error object with both message and msg properties", () => {
			const logger = new NativeLogger("test");
			logger.setLogLevel(ErrorLevel);

			const error = Object.assign(new Error("main message"), {
				msg: "duplicate message",
			});
			logger.error(() => ({ err: error }));

			expect(consoleErrorSpy).toHaveBeenCalledOnce();
			const call = consoleErrorSpy.mock.calls[0]?.[0] as string;
			const parsed = JSON.parse(call);
			expect(parsed.err).toBe("main message");
			expect(parsed.errData.msg).toBe("duplicate message");
		});

		it("should handle error with non-Error cause", () => {
			const logger = new NativeLogger("test");
			logger.setLogLevel(ErrorLevel);

			const error = Object.assign(new Error("main error"), {
				cause: "string cause",
			});
			logger.error(() => ({ err: error }));

			expect(consoleErrorSpy).toHaveBeenCalledOnce();
			const call = consoleErrorSpy.mock.calls[0]?.[0] as string;
			const parsed = JSON.parse(call);
			expect(parsed.errData.cause).toBe("string cause");
		});

		it("should handle error with status and statusCode properties", () => {
			const logger = new NativeLogger("test");
			logger.setLogLevel(ErrorLevel);

			const error = Object.assign(new Error("main error"), {
				status: "error",
				statusCode: 500,
			});
			logger.error(() => ({ err: error }));

			expect(consoleErrorSpy).toHaveBeenCalledOnce();
			const call = consoleErrorSpy.mock.calls[0]?.[0] as string;
			const parsed = JSON.parse(call);
			expect(parsed.errData.status).toBe("error");
			expect(parsed.errData.statusCode).toBe(500);
		});
	});

	describe("BigInt handling in logs", () => {
		it("should stringify BigInt values in log data", () => {
			const logger = new NativeLogger("test");
			logger.setLogLevel(InfoLevel);

			const bigInt = BigInt(12345678901234567890n);
			logger.info(() => ({ data: { value: bigInt } }));

			expect(consoleInfoSpy).toHaveBeenCalledOnce();
			const call = consoleInfoSpy.mock.calls[0]?.[0];
			expect(call).toBeDefined();
			const parsed = JSON.parse(call as string);
			expect(parsed.data.value).toBe(bigInt.toString());
		});
	});

	describe("error unpacking edge cases", () => {
		it("should handle error with non-Error cause", () => {
			const logger = new NativeLogger("test");
			logger.setLogLevel(ErrorLevel);

			const error = Object.assign(new Error("test error"), {
				cause: "string cause",
			});
			logger.error(() => ({ err: error }));

			expect(consoleErrorSpy).toHaveBeenCalledOnce();
			const call = consoleErrorSpy.mock.calls[0]?.[0];
			expect(call).toBeDefined();
			const parsed = JSON.parse(call as string);
			expect(parsed.errData.cause).toBe("string cause");
		});

		it("should handle error with both message and msg properties", () => {
			const logger = new NativeLogger("test");
			logger.setLogLevel(ErrorLevel);

			const error = Object.assign(new Error("main message"), {
				msg: "alternative message",
			});
			logger.error(() => ({ err: error }));

			expect(consoleErrorSpy).toHaveBeenCalledOnce();
			const call = consoleErrorSpy.mock.calls[0]?.[0];
			expect(call).toBeDefined();
			const parsed = JSON.parse(call as string);
			expect(parsed.err).toBe("main message");
			expect(parsed.errData.msg).toBe("alternative message");
		});

		it("should handle error with stacktrace property", () => {
			const logger = new NativeLogger("test");
			logger.setLogLevel(ErrorLevel);
			logger.setPrintStack(true);

			const error = Object.assign(new Error("test error"), {
				stacktrace: "custom stacktrace",
			});
			logger.error(() => ({ err: error }));

			expect(consoleErrorSpy).toHaveBeenCalledOnce();
			const call = consoleErrorSpy.mock.calls[0]?.[0];
			expect(call).toBeDefined();
			const parsed = JSON.parse(call as string);
			expect(parsed.errData.stacktrace).toBe("custom stacktrace");
		});

		it("should handle error with all additional properties", () => {
			const logger = new NativeLogger("test");
			logger.setLogLevel(ErrorLevel);

			const error = Object.assign(new Error("test error"), {
				code: 500,
				details: "details",
				context: { key: "value" },
				data: { nested: "data" },
				info: { info: "info" },
				metadata: { meta: "data" },
				status: 200,
				statusCode: 201,
			});
			logger.error(() => ({ err: error }));

			expect(consoleErrorSpy).toHaveBeenCalledOnce();
			const call = consoleErrorSpy.mock.calls[0]?.[0];
			expect(call).toBeDefined();
			const parsed = JSON.parse(call as string);
			expect(parsed.errData.code).toBe(500);
			expect(parsed.errData.details).toBe("details");
			expect(parsed.errData.context).toEqual({ key: "value" });
			expect(parsed.errData.data).toEqual({ nested: "data" });
			expect(parsed.errData.info).toEqual({ info: "info" });
			expect(parsed.errData.metadata).toEqual({ meta: "data" });
			expect(parsed.errData.status).toBe(200);
			expect(parsed.errData.statusCode).toBe(201);
		});
	});

	describe("logging without message or error", () => {
		it("should log record with only data", () => {
			const logger = new NativeLogger("test");
			logger.setLogLevel(InfoLevel);

			logger.info(() => ({ data: { key: "value" } }));

			expect(consoleInfoSpy).toHaveBeenCalledOnce();
			const call = consoleInfoSpy.mock.calls[0]?.[0];
			expect(call).toBeDefined();
			const parsed = JSON.parse(call as string);
			expect(parsed.data).toEqual({ key: "value" });
			expect(parsed.msg).toBeUndefined();
			expect(parsed.err).toBeUndefined();
		});
	});

	describe("browser logging", () => {
		let originalWindow: typeof globalThis.window | undefined;

		beforeEach(async () => {
			originalWindow = globalThis.window;
			vi.stubGlobal("window", {
				document: {},
			});
			await vi.importMock("../logger.js");
		});

		afterEach(async () => {
			vi.unstubAllGlobals();
			if (originalWindow !== undefined) {
				globalThis.window = originalWindow;
			}
			await vi.resetModules();
		});

		it("should log with message in browser environment", async () => {
			const { NativeLogger, InfoLevel } = await import("../logger.js");
			const logger = new NativeLogger("test");
			logger.setLogLevel(InfoLevel);

			logger.info(() => ({ msg: "test message", data: { key: "value" } }));

			expect(consoleInfoSpy).toHaveBeenCalledOnce();
			const calls = consoleInfoSpy.mock.calls[0];
			expect(calls).toBeDefined();
			expect(calls?.length).toBeGreaterThanOrEqual(1);
			if (calls && calls.length === 2) {
				expect(calls[0]).toBe("test message");
				expect(calls[1]).toMatchObject({
					scope: "test",
					level: "info",
					msg: "test message",
					data: { key: "value" },
				});
			} else if (calls) {
				const call = calls[0];
				if (typeof call === "string") {
					const parsed = JSON.parse(call);
					expect(parsed.msg).toBe("test message");
					expect(parsed.data).toEqual({ key: "value" });
				} else {
					expect(call).toMatchObject({
						scope: "test",
						level: "info",
						msg: "test message",
						data: { key: "value" },
					});
				}
			}
		});

		it("should log with error message in browser environment", async () => {
			const { NativeLogger, ErrorLevel } = await import("../logger.js");
			const logger = new NativeLogger("test");
			logger.setLogLevel(ErrorLevel);

			const error = new Error("test error");
			logger.error(() => ({ err: error }));

			expect(consoleErrorSpy).toHaveBeenCalledOnce();
			const calls = consoleErrorSpy.mock.calls[0];
			expect(calls).toBeDefined();
			// In browser environment, it should call with 2 arguments: message and object
			// In Node environment, it calls with 1 argument: JSON string
			if (calls && calls.length === 2) {
				expect(calls[0]).toBe("test error");
				expect(calls[1]).toMatchObject({
					scope: "test",
					level: "error",
				});
				expect(calls[1]).toHaveProperty("err", "test error");
			} else if (calls) {
				// Node environment fallback - parse the JSON string
				const parsed = JSON.parse(calls[0] as string);
				expect(parsed.err).toBe("test error");
				expect(parsed.level).toBe("error");
			}
		});

		it("should log without message or error in browser environment", async () => {
			const { NativeLogger, InfoLevel } = await import("../logger.js");
			const logger = new NativeLogger("test");
			logger.setLogLevel(InfoLevel);

			logger.info(() => ({ data: { key: "value" } }));

			expect(consoleInfoSpy).toHaveBeenCalledOnce();
			const calls = consoleInfoSpy.mock.calls[0];
			expect(calls).toBeDefined();
			expect(calls).toHaveLength(1);
			expect(calls?.[0]).toMatchObject({
				scope: "test",
				level: "info",
				data: { key: "value" },
			});
		});

		it("should log with both message and error in browser environment", async () => {
			const { NativeLogger, ErrorLevel } = await import("../logger.js");
			const logger = new NativeLogger("test");
			logger.setLogLevel(ErrorLevel);

			const error = new Error("error message");
			logger.error(() => ({ msg: "log message", err: error }));

			expect(consoleErrorSpy).toHaveBeenCalledOnce();
			const calls = consoleErrorSpy.mock.calls[0];
			expect(calls).toBeDefined();
			expect(calls).toHaveLength(2);
			expect(calls?.[0]).toBe("log message");
			expect(calls?.[1]).toMatchObject({
				scope: "test",
				level: "error",
				msg: "log message",
			});
			expect(calls?.[1]).toHaveProperty("err", "error message");
		});
	});
});

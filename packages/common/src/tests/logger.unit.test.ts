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
			const call = consoleInfoSpy.mock.calls[0][0];
			const parsed = JSON.parse(call);
			expect(parsed.msg).toBe("test");
			expect(parsed.data).toEqual({ key: "value" });
		});

		it("should log error objects", () => {
			const logger = new NativeLogger("test");
			logger.setLogLevel(ErrorLevel);

			const error = new Error("test error");
			logger.error(() => ({ err: error }));

			expect(consoleErrorSpy).toHaveBeenCalledOnce();
			const call = consoleErrorSpy.mock.calls[0][0];
			const parsed = JSON.parse(call);
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
			const call = consoleErrorSpy.mock.calls[0][0];
			const parsed = JSON.parse(call);
			expect(parsed.errData.stack).toBeDefined();
		});

		it("should not log error stack when printStack is false", () => {
			const logger = new NativeLogger("test");
			logger.setLogLevel(ErrorLevel);
			logger.setPrintStack(false);

			const error = new Error("test error");
			logger.error(() => ({ err: error }));

			expect(consoleErrorSpy).toHaveBeenCalledOnce();
			const call = consoleErrorSpy.mock.calls[0][0];
			const parsed = JSON.parse(call);
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
			const call = consoleInfoSpy.mock.calls[0][0];
			const parsed = JSON.parse(call);
			expect(parsed.data.userId).toBe("123");
		});

		it("should merge default data with new data", () => {
			const logger = new NativeLogger("test");
			logger.setLogLevel(InfoLevel);

			const childLogger = logger.with({ userId: "123" });

			childLogger.info(() => ({ msg: "test", data: { action: "login" } }));

			expect(consoleInfoSpy).toHaveBeenCalledOnce();
			const call = consoleInfoSpy.mock.calls[0][0];
			const parsed = JSON.parse(call);
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
			const error = new Error("main error", { cause });
			logger.error(() => ({ err: error }));

			expect(consoleErrorSpy).toHaveBeenCalledOnce();
			const call = consoleErrorSpy.mock.calls[0][0];
			const parsed = JSON.parse(call);
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
			const call = consoleErrorSpy.mock.calls[0][0];
			const parsed = JSON.parse(call);
			expect(parsed.errData.code).toBe(500);
			expect(parsed.errData.details).toBe("additional info");
			expect(parsed.errData.context).toEqual({ userId: "123" });
		});

		it("should handle primitive error values", () => {
			const logger = new NativeLogger("test");
			logger.setLogLevel(ErrorLevel);

			logger.error(() => ({ err: "string error" }));

			expect(consoleErrorSpy).toHaveBeenCalledOnce();
			const call = consoleErrorSpy.mock.calls[0][0];
			const parsed = JSON.parse(call);
			expect(parsed.err).toBe("string error");
		});
	});

	describe("BigInt handling in logs", () => {
		it("should stringify BigInt values in log data", () => {
			const logger = new NativeLogger("test");
			logger.setLogLevel(InfoLevel);

			const bigInt = BigInt(12345678901234567890n);
			logger.info(() => ({ data: { value: bigInt } }));

			expect(consoleInfoSpy).toHaveBeenCalledOnce();
			const call = consoleInfoSpy.mock.calls[0][0];
			const parsed = JSON.parse(call);
			expect(parsed.data.value).toBe(bigInt.toString());
		});
	});
});

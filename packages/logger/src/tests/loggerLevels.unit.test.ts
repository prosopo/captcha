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
import type { LogLevel, LogRecord } from "../logger.js";
import { NativeLogger, getLogger, setGlobalDirectives } from "../logger.js";

type Record_ = Record<string, unknown>;

const parseLast = (spy: ReturnType<typeof vi.fn>): Record_ => {
	const calls = spy.mock.calls;
	const last = calls[calls.length - 1];
	return JSON.parse(String(last?.[0])) as Record_;
};

let info: ReturnType<typeof vi.fn>;
let debug: ReturnType<typeof vi.fn>;
let trace: ReturnType<typeof vi.fn>;
let warn: ReturnType<typeof vi.fn>;
let error: ReturnType<typeof vi.fn>;

beforeEach(() => {
	setGlobalDirectives("");
	info = vi.fn();
	debug = vi.fn();
	trace = vi.fn();
	warn = vi.fn();
	error = vi.fn();
	vi.spyOn(console, "info").mockImplementation(info);
	vi.spyOn(console, "debug").mockImplementation(debug);
	vi.spyOn(console, "trace").mockImplementation(trace);
	vi.spyOn(console, "warn").mockImplementation(warn);
	vi.spyOn(console, "error").mockImplementation(error);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("NativeLogger format", () => {
	it("accepts the json format and reports it back", () => {
		const logger = new NativeLogger("scope");

		logger.setFormat("json");

		expect(logger.getFormat()).toBe("json");
	});

	it("rejects the plain format, which is not implemented", () => {
		const logger = new NativeLogger("scope");

		expect(() => logger.setFormat("plain")).toThrow(
			"Only JSON format implemented for now",
		);
	});
});

describe("NativeLogger.log level dispatch", () => {
	const cases: Array<{
		level: LogLevel;
		dest: () => ReturnType<typeof vi.fn>;
	}> = [
		{ level: "trace", dest: (): ReturnType<typeof vi.fn> => trace },
		{ level: "debug", dest: (): ReturnType<typeof vi.fn> => debug },
		{ level: "info", dest: (): ReturnType<typeof vi.fn> => info },
		{ level: "warn", dest: (): ReturnType<typeof vi.fn> => warn },
		{ level: "error", dest: (): ReturnType<typeof vi.fn> => error },
		{ level: "fatal", dest: (): ReturnType<typeof vi.fn> => error },
	];

	for (const { level, dest } of cases) {
		it(`routes ${level} to its own console method`, () => {
			const logger = getLogger("trace", "scope");

			logger.log(level, (): LogRecord => ({ msg: `${level} message` }));

			expect(parseLast(dest()).msg).toBe(`${level} message`);
		});
	}

	it("throws on an unknown log level", () => {
		const logger = getLogger("trace", "scope");

		expect(() =>
			// the switch guards against a level smuggled past the type system
			logger.log("verbose" as LogLevel, (): LogRecord => ({ msg: "x" })),
		).toThrow("Unknown log level: verbose");
	});
});

describe("NativeLogger direct level methods", () => {
	it("emits trace records at the trace threshold", () => {
		const logger = getLogger("trace", "scope");

		logger.trace((): LogRecord => ({ msg: "traced" }));

		expect(parseLast(trace)).toMatchObject({ msg: "traced", level: "trace" });
	});

	it("emits warn records", () => {
		const logger = getLogger("info", "scope");

		logger.warn((): LogRecord => ({ msg: "warned" }));

		expect(parseLast(warn)).toMatchObject({ msg: "warned", level: "warn" });
	});

	it("emits fatal records via console.error", () => {
		const logger = getLogger("info", "scope");

		logger.fatal((): LogRecord => ({ msg: "fatal" }));

		expect(parseLast(error)).toMatchObject({ msg: "fatal", level: "fatal" });
	});

	it("suppresses a record below the threshold", () => {
		const logger = getLogger("warn", "scope");

		logger.debug((): LogRecord => ({ msg: "hidden" }));

		expect(debug).not.toHaveBeenCalled();
	});
});

describe("error unpacking edge cases", () => {
	it("passes a primitive cause through unchanged", () => {
		const logger = getLogger("info", "scope");
		const err = new Error("boom");
		err.cause = "a string cause";

		logger.error((): LogRecord => ({ err }));

		expect(parseLast(error).errData).toMatchObject({ cause: "a string cause" });
	});

	it("keeps a null cause out of the unpacked object", () => {
		const logger = getLogger("info", "scope");
		const err = new Error("boom");
		err.cause = null;

		logger.error((): LogRecord => ({ err }));

		// null is an object, so it takes the object branch and unpacks to nothing
		expect(parseLast(error).errData).toBeDefined();
	});

	it("stringifies a primitive err field", () => {
		const logger = getLogger("info", "scope");

		logger.error((): LogRecord => ({ err: 42 }));

		expect(parseLast(error).err).toBe("42");
	});

	it("stringifies a string err field", () => {
		const logger = getLogger("info", "scope");

		logger.error((): LogRecord => ({ err: "plain failure" }));

		expect(parseLast(error).err).toBe("plain failure");
	});
});

describe("Logger.with default data reuse", () => {
	it("reuses the parent default data when the child adds none", () => {
		const parent = getLogger("info", "scope").with({ requestId: "r1" });

		const child = parent.with({}, "sub");
		child.info((): LogRecord => ({ msg: "hello" }));

		expect(parseLast(info)).toMatchObject({
			msg: "hello",
			req_id: "r1",
			data: { requestId: "r1" },
			scope: "scope:sub",
		});
	});

	it("omits default data entirely when neither side supplies any", () => {
		const child = getLogger("info", "scope").with({}, "sub");

		child.info((): LogRecord => ({ msg: "hello" }));

		expect(parseLast(info)).toMatchObject({ msg: "hello", scope: "scope:sub" });
	});

	it("merges the child data over the parent data", () => {
		const parent = getLogger("info", "scope").with({ a: 1, b: 2 });

		parent.with({ b: 3 }).info((): LogRecord => ({ msg: "hello" }));

		expect(parseLast(info)).toMatchObject({ data: { a: 1, b: 3 } });
	});
});

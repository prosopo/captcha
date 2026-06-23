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

import { stringifyBigInts } from "@prosopo/util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	getLogger,
	parseDirectives,
	resolveLevel,
	setGlobalDirectives,
} from "../logger.js";
describe("unpackError", () => {
	let captured: string[] = [];

	beforeEach(() => {
		captured = [];
		vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
			captured.push(String(args[0]));
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	function lastRecord(): Record<string, unknown> {
		const raw = captured[captured.length - 1] ?? "";
		return JSON.parse(raw) as Record<string, unknown>;
	}

	it("captures name from Error prototype chain", () => {
		const logger = getLogger("error", "test");
		const err = new TypeError("bad input");
		logger.error(() => ({ err }));
		const record = lastRecord();
		const errData = record.errData as Record<string, unknown>;
		expect(errData.name).toBe("TypeError");
	});

	it("captures message field", () => {
		const logger = getLogger("error", "test");
		const err = new Error("something went wrong");
		logger.error(() => ({ err }));
		const errData = lastRecord().errData as Record<string, unknown>;
		expect(errData.message).toBe("something went wrong");
	});

	it("captures custom own properties from subclass errors", () => {
		const logger = getLogger("error", "test");
		const err = Object.assign(new Error("custom"), { statusCode: 404 });
		logger.error(() => ({ err }));
		const errData = lastRecord().errData as Record<string, unknown>;
		expect(errData.statusCode).toBe(404);
	});

	it("recursively unpacks cause", () => {
		const logger = getLogger("error", "test");
		const cause = new Error("root cause");
		const err = new Error("outer");
		(err as unknown as Record<string, unknown>).cause = cause;
		logger.error(() => ({ err }));
		const errData = lastRecord().errData as Record<string, unknown>;
		const causeData = errData.cause as Record<string, unknown>;
		expect(causeData).toBeDefined();
	});

	it("suppresses stack when printStack is false (default)", () => {
		const logger = getLogger("error", "test");
		const err = new Error("test");
		logger.error(() => ({ err }));
		const errData = lastRecord().errData as Record<string, unknown>;
		expect(errData.stack).toBeUndefined();
	});
});

describe("stringifyBigInts", () => {
	it("should strigify big int", () => {
		const bigInt = BigInt(12345678901234567890n);

		const stringified = stringifyBigInts(bigInt);

		expect(stringified).toEqual(bigInt.toString());
	});

	it("should strinfigy big int in object properties", () => {
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
});

describe("parseDirectives", () => {
	it("parses a bare level as the global default (empty-string key)", () => {
		const directives = parseDirectives("debug");
		expect(directives.get("")).toBe("debug");
	});

	it("parses scope=level pairs", () => {
		const directives = parseDirectives("provider:db=debug,provider:api=trace");
		expect(directives.get("provider:db")).toBe("debug");
		expect(directives.get("provider:api")).toBe("trace");
	});

	it("ignores empty and invalid entries", () => {
		const directives = parseDirectives(" , provider:db=debug , bogus=nope ");
		expect(directives.get("provider:db")).toBe("debug");
		expect(directives.has("bogus")).toBe(false);
	});
});

describe("resolveLevel", () => {
	it("returns an exact scope match", () => {
		const directives = parseDirectives("provider:db=debug");
		expect(resolveLevel("provider:db", directives, "info")).toBe("debug");
	});

	it("returns the most specific matching prefix", () => {
		const directives = parseDirectives("provider=warn,provider:db=debug");
		expect(resolveLevel("provider:db:query", directives, "info")).toBe("debug");
	});

	it("falls back to the global default when no scope matches", () => {
		const directives = parseDirectives("other=trace,error");
		expect(resolveLevel("provider:db", directives, "info")).toBe("error");
	});

	it("falls back to the supplied fallback when nothing matches", () => {
		const directives = parseDirectives("other=trace");
		expect(resolveLevel("provider:db", directives, "info")).toBe("info");
	});
});

describe("Logger.with subscope + directives", () => {
	let captured: string[] = [];

	beforeEach(() => {
		captured = [];
		const capture = (...args: unknown[]): void => {
			captured.push(String(args[0]));
		};
		vi.spyOn(console, "debug").mockImplementation(capture);
		vi.spyOn(console, "info").mockImplementation(capture);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		setGlobalDirectives("");
	});

	it("concatenates parent scope with subscope", () => {
		setGlobalDirectives("parent:child=debug");
		const child = getLogger("info", "parent").with({}, "child");
		child.debug(() => ({ msg: "hello" }));
		expect(captured.length).toBe(1);
	});

	it("uses the subscope directly when the parent scope is empty (no leading colon)", () => {
		setGlobalDirectives("admin=debug");
		const child = getLogger("info", "").with({}, "admin");
		child.debug(() => ({ msg: "hello" }));
		// If the scope were ":admin" the "admin" directive would not match and the
		// debug line would be suppressed.
		expect(captured.length).toBe(1);
	});

	it("re-resolves directives at print time rather than baking them in (no sticky level)", () => {
		setGlobalDirectives("admin=debug");
		const child = getLogger("info", "").with({}, "admin");
		// Directive removed after the child was created.
		setGlobalDirectives("");
		child.debug(() => ({ msg: "should be suppressed" }));
		expect(captured.length).toBe(0);
		// The inherited info level still applies.
		child.info(() => ({ msg: "visible" }));
		expect(captured.length).toBe(1);
	});
});

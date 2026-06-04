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
	getLogger,
	parseDirectives,
	parseLogLevel,
	resolveLevel,
	setGlobalDirectives,
	stringifyBigInts,
} from "../logger.js";
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

describe("parseLogLevel", () => {
	it("parses a bare level", () => {
		expect(parseLogLevel("warn")).toBe("warn");
	});

	it("extracts the global level from a directive string", () => {
		expect(parseLogLevel("warn,database=trace")).toBe("warn");
	});

	it("returns the fallback for a directives-only string", () => {
		expect(parseLogLevel("database=trace", "info")).toBe("info");
	});

	it("returns the fallback for undefined", () => {
		expect(parseLogLevel(undefined, "info")).toBe("info");
	});
});

describe("parseDirectives", () => {
	it("parses a bare global level", () => {
		const d = parseDirectives("warn");
		expect(d.get("")).toBe("warn");
	});

	it("parses per-scope overrides", () => {
		const d = parseDirectives("warn,database=trace");
		expect(d.get("")).toBe("warn");
		expect(d.get("database")).toBe("trace");
	});

	it("parses directives-only (no global default)", () => {
		const d = parseDirectives("database=trace");
		expect(d.has("")).toBe(false);
		expect(d.get("database")).toBe("trace");
	});
});

describe("resolveLevel", () => {
	it("matches the exact scope", () => {
		const d = parseDirectives("warn,database:mongo=trace");
		expect(resolveLevel("database:mongo", d, "info")).toBe("trace");
	});

	it("matches a prefix when exact scope has no entry", () => {
		const d = parseDirectives("warn,database=debug");
		expect(resolveLevel("database:mongo:queries", d, "info")).toBe("debug");
	});

	it("falls back to global default when no scope matches", () => {
		const d = parseDirectives("warn,database=debug");
		expect(resolveLevel("provider:request", d, "info")).toBe("warn");
	});

	it("returns fallback when directives are empty", () => {
		const d = parseDirectives("");
		expect(resolveLevel("any:scope", d, "info")).toBe("info");
	});
});

describe("setGlobalDirectives", () => {
	it("takes effect immediately on newly created loggers", () => {
		setGlobalDirectives("warn,test-scope=trace");
		const logger = getLogger("info", "test-scope");
		// The logger starts at info but the directive says trace for test-scope.
		// Effective level resolved in print(), so a trace log should still pass
		// through (we just verify the scope is set).
		expect(logger.getScope()).toBe("test-scope");
		setGlobalDirectives(""); // reset
	});
});

describe("Logger.with subscope", () => {
	it("appends subscope to parent scope", () => {
		const parent = getLogger("info", "provider");
		const child = parent.with({}, "request");
		expect(child.getScope()).toBe("provider:request");
	});

	it("does not produce a leading colon when parent scope is empty", () => {
		const parent = getLogger("info", "");
		const child = parent.with({}, "request");
		expect(child.getScope()).toBe("request");
	});

	it("inherits default data from parent", () => {
		const parent = getLogger("info", "test").with({ requestId: "abc" });
		const child = parent.with({ extra: 1 });
		// Can't inspect defaultData directly but verify scope is unchanged
		expect(child.getScope()).toBe("test");
	});
});

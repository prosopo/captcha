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

import { describe, expect, test } from "vitest";
import {
	ParseError,
	parseBigInt,
	parseDate,
	parseInteger,
	parseJson,
	parseNumber,
	stringifyJson,
} from "../parse.js";

const errorOf = <T>(result: {
	ok: boolean;
	unwrapErr: () => ParseError;
	unwrapOr: (fallback: T) => T;
}): ParseError => {
	expect(result.ok).toBe(false);
	return result.unwrapErr();
};

describe("ParseError", () => {
	test("carries kind, input and cause", () => {
		const cause = new Error("boom");
		const error = new ParseError("json", "{", "bad", cause);
		expect(error).toBeInstanceOf(Error);
		expect(error.name).toBe("ParseError");
		expect(error.kind).toBe("json");
		expect(error.input).toBe("{");
		expect(error.cause).toBe(cause);
		expect(error.message).toBe('cannot parse json from "{": bad');
	});

	test("truncates long input", () => {
		const error = new ParseError("json", "x".repeat(500), "bad");
		expect(error.input).toBe(`${"x".repeat(100)}…`);
	});

	test("survives input whose toString throws", () => {
		const hostile = {
			toString() {
				throw new Error("no");
			},
		};
		expect(new ParseError("number", hostile, "bad").input).toBe(
			"[object Object]",
		);
	});
});

describe("parseJson", () => {
	test("parses valid JSON", () => {
		expect(parseJson('{"a":[1,"b",null,true]}').unwrap()).toEqual({
			a: [1, "b", null, true],
		});
	});

	test("returns an error for invalid JSON instead of throwing", () => {
		const error = errorOf(parseJson("{not json"));
		expect(error.kind).toBe("json");
		expect(error.cause).toBeInstanceOf(SyntaxError);
	});

	test("returns an error for empty input", () => {
		expect(parseJson("").ok).toBe(false);
	});

	test("keeps integers past 2^53 exact as bigint by default", () => {
		expect(parseJson('{"id":12345678901234567890,"n":5}').unwrap()).toEqual({
			id: 12345678901234567890n,
			n: 5,
		});
		expect(parseJson("-9007199254740993").unwrap()).toBe(-9007199254740993n);
	});

	test("can keep big integers as exact strings", () => {
		expect(
			parseJson("[9007199254740993]", { bigints: "string" }).unwrap(),
		).toEqual(["9007199254740993"]);
	});

	test("can fall back to JSON.parse's rounding", () => {
		expect(parseJson("9007199254740993", { bigints: "number" }).unwrap()).toBe(
			9007199254740992,
		);
	});

	test("leaves large non-integer literals as numbers", () => {
		expect(parseJson("[1e300, 1.5e20]").unwrap()).toEqual([1e300, 1.5e20]);
	});

	test("leaves safe integers as numbers", () => {
		expect(parseJson("9007199254740991").unwrap()).toBe(9007199254740991);
	});
});

describe("stringifyJson", () => {
	test("stringifies plain values", () => {
		expect(stringifyJson({ a: [1, "b"] }).unwrap()).toBe('{"a":[1,"b"]}');
	});

	test("writes bigints as decimal strings instead of throwing", () => {
		expect(stringifyJson({ n: 12345678901234567890n }).unwrap()).toBe(
			'{"n":"12345678901234567890"}',
		);
	});

	test("honours space", () => {
		expect(stringifyJson({ a: 1 }, 2).unwrap()).toBe('{\n  "a": 1\n}');
	});

	test("returns an error for cycles", () => {
		const cyclic: Record<string, unknown> = {};
		cyclic.self = cyclic;
		const error = errorOf(stringifyJson(cyclic));
		expect(error.kind).toBe("stringify");
		expect(error.cause).toBeInstanceOf(TypeError);
	});

	test("returns an error for values with no JSON form", () => {
		expect(stringifyJson(undefined).ok).toBe(false);
		expect(stringifyJson(() => 1).ok).toBe(false);
		expect(stringifyJson(Symbol("s")).ok).toBe(false);
	});

	test("returns an error when toJSON throws a non-Error", () => {
		const error = errorOf(
			stringifyJson({
				toJSON() {
					throw "nope";
				},
			}),
		);
		expect(error.message).toContain("nope");
	});

	test("round-trips with parseJson", () => {
		const value = { big: 2n ** 70n, small: 3 };
		const text = stringifyJson(value).unwrap();
		expect(parseJson(text).unwrap()).toEqual({
			big: (2n ** 70n).toString(),
			small: 3,
		});
	});
});

describe("parseNumber", () => {
	test.each([
		["42", 42],
		[" 4.5 ", 4.5],
		["-1e3", -1000],
		["0x10", 16],
		[7, 7],
	])("parses %j", (input, expected) => {
		expect(parseNumber(input).unwrap()).toBe(expected);
	});

	test.each([
		[undefined, "missing"],
		[null, "missing"],
		["", "empty"],
		["   ", "empty"],
		["abc", "not a finite number"],
		["12abc", "not a finite number"],
		["Infinity", "not a finite number"],
		[Number.NaN, "not a finite number"],
	])("rejects %j", (input, reason) => {
		const error = errorOf(parseNumber(input));
		expect(error.kind).toBe("number");
		expect(error.message).toContain(reason);
	});

	test("enforces bounds", () => {
		expect(parseNumber("5", { min: 0, max: 10 }).unwrap()).toBe(5);
		expect(errorOf(parseNumber("-1", { min: 0 })).message).toContain(
			"below minimum 0",
		);
		expect(errorOf(parseNumber("11", { max: 10 })).message).toContain(
			"above maximum 10",
		);
	});
});

describe("parseInteger", () => {
	test.each([
		["42", 42],
		[" -7 ", -7],
		["+3", 3],
		["-0", 0],
		[12, 12],
		["9007199254740991", Number.MAX_SAFE_INTEGER],
	])("parses %j", (input, expected) => {
		expect(parseInteger(input).unwrap()).toBe(expected);
	});

	test("normalises -0", () => {
		expect(Object.is(parseInteger("-0").unwrap(), 0)).toBe(true);
	});

	test.each([
		[undefined, "missing"],
		[null, "missing"],
		["", "not a base-10 integer"],
		["12abc", "not a base-10 integer"],
		["1.5", "not a base-10 integer"],
		["1e3", "not a base-10 integer"],
		["0x10", "not a base-10 integer"],
		[1.5, "not an integer"],
		[Number.NaN, "not an integer"],
		["9007199254740993", "outside the safe integer range"],
		[2 ** 60, "outside the safe integer range"],
	])("rejects %j", (input, reason) => {
		const error = errorOf(parseInteger(input));
		expect(error.kind).toBe("integer");
		expect(error.message).toContain(reason);
	});

	test("parses hex with or without prefix", () => {
		expect(parseInteger("ff", { radix: 16 }).unwrap()).toBe(255);
		expect(parseInteger("0xFF", { radix: 16 }).unwrap()).toBe(255);
		expect(parseInteger("-0x10", { radix: 16 }).unwrap()).toBe(-16);
		expect(parseInteger("fg", { radix: 16 }).ok).toBe(false);
	});

	test("enforces bounds", () => {
		expect(parseInteger("3", { min: 1, max: 5 }).unwrap()).toBe(3);
		expect(parseInteger("0", { min: 1 }).ok).toBe(false);
		expect(parseInteger("6", { max: 5 }).ok).toBe(false);
	});

	test("supports unwrapOr for genuine defaults", () => {
		expect(parseInteger(undefined).unwrapOr(10)).toBe(10);
	});
});

describe("parseBigInt", () => {
	test.each([
		["12345678901234567890", 12345678901234567890n],
		[" 42 ", 42n],
		["0x10", 16n],
		[-3, -3n],
		[5n, 5n],
	])("parses %s", (input, expected) => {
		expect(parseBigInt(input).unwrap()).toBe(expected);
	});

	test.each([
		[undefined, "missing"],
		[null, "missing"],
		["", "empty"],
		["1.5", "SyntaxError"],
		["abc", "SyntaxError"],
		[1.5, "not an integer"],
		[Number.NaN, "not an integer"],
	])("rejects %s", (input, reason) => {
		const error = errorOf(parseBigInt(input));
		expect(error.kind).toBe("bigint");
		if (reason === "SyntaxError") {
			expect(error.cause).toBeInstanceOf(SyntaxError);
		} else {
			expect(error.message).toContain(reason);
		}
	});
});

describe("parseDate", () => {
	test("parses ISO strings", () => {
		expect(parseDate("2026-10-28T08:00:00.000Z").unwrap().toISOString()).toBe(
			"2026-10-28T08:00:00.000Z",
		);
	});

	test("parses epoch milliseconds as number or numeric string", () => {
		expect(parseDate(0).unwrap().getTime()).toBe(0);
		expect(parseDate("1700000000000").unwrap().getTime()).toBe(1700000000000);
	});

	test("copies a Date rather than aliasing it", () => {
		const original = new Date(5);
		const parsed = parseDate(original).unwrap();
		expect(parsed).not.toBe(original);
		expect(parsed.getTime()).toBe(5);
	});

	test.each([
		[undefined, "missing"],
		[null, "missing"],
		["", "empty"],
		["not a date", "invalid date"],
		[Number.NaN, "invalid date"],
		[new Date(Number.NaN), "invalid date"],
		[8.64e15 + 1, "invalid date"],
	])("rejects %j", (input, reason) => {
		const error = errorOf(parseDate(input));
		expect(error.kind).toBe("date");
		expect(error.message).toContain(reason);
	});
});

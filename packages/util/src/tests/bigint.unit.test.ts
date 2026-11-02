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
import { stringifyBigInts } from "../bigint.js";

describe("stringifyBigInts", () => {
	test("converts a top-level bigint to string", () => {
		expect(stringifyBigInts(42n)).toBe("42");
	});

	test("leaves non-bigint primitives unchanged", () => {
		expect(stringifyBigInts(42)).toBe(42);
		expect(stringifyBigInts("hello")).toBe("hello");
		expect(stringifyBigInts(true)).toBe(true);
		expect(stringifyBigInts(null)).toBe(null);
		expect(stringifyBigInts(undefined)).toBe(undefined);
	});

	test("converts bigint fields inside an object", () => {
		expect(stringifyBigInts({ a: 1n, b: "x" })).toEqual({ a: "1", b: "x" });
	});

	test("converts bigint elements inside an array", () => {
		expect(stringifyBigInts([1n, 2, "y"])).toEqual(["1", 2, "y"]);
	});

	test("recursively converts nested bigints", () => {
		expect(stringifyBigInts({ inner: { val: 99n } })).toEqual({
			inner: { val: "99" },
		});
	});

	test("leaves frozen input untouched", () => {
		const frozen: Readonly<Record<string, unknown>> = Object.freeze({
			list: Object.freeze([1n]),
			n: 2n,
		});
		expect(stringifyBigInts(frozen)).toEqual({ list: ["1"], n: "2" });
		expect(frozen.n).toBe(2n);
	});
});

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
import { describe, expect, it, test } from "vitest";
import { flatten, unflatten } from "../util.js";

describe("util", () => {
	describe("flatten", () => {
		test("flatten obj", () => {
			const obj = {
				a: {
					b: {
						c: 1,
					},
				},
				d: 2,
			};
			expect(flatten(obj)).to.deep.equal({
				"a.b.c": 1,
				d: 2,
			});
		});
	});
	describe("unflatten", () => {
		it("unflattens an object with empty object", () => {
			const obj = {};
			expect(unflatten(obj)).toEqual({});
		});

		it("unflattens an object with single property", () => {
			const obj = { a: "1" };
			expect(unflatten(obj)).toEqual({ a: "1" });
		});

		it("unflattens an object with nested array properties", () => {
			const obj = { "a.b.0": 1, "a.b.1": 1 };
			expect(unflatten(obj)).toEqual({ a: { b: [1, 1] } });
		});

		it("unflattens an object with multiple nested properties", () => {
			const obj = { "a.b.c.d.e": "1", "a.b.c.f": "2" };
			expect(unflatten(obj)).toEqual({
				a: { b: { c: { d: { e: "1" }, f: "2" } } },
			});
		});
	});
});

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
	MAX_PIXEL_COORD,
	assertCoordsSafe,
	safeCoordsOrUndefined,
} from "../coords.js";

describe("assertCoordsSafe", () => {
	test("accepts undefined / null (coords field is optional on the schema)", () => {
		expect(() => assertCoordsSafe(undefined)).not.to.throw();
		expect(() => assertCoordsSafe(null)).not.to.throw();
	});

	test("accepts a normal single-stroke single-point shape", () => {
		expect(() => assertCoordsSafe([[[90, 270]]])).not.to.throw();
	});

	test("accepts the empty outer array (zero strokes)", () => {
		expect(() => assertCoordsSafe([])).not.to.throw();
	});

	// Regression cases lifted from the actual cast-error payloads we
	// captured in production (see scripts/find-bad-coords-via-oo.ts).
	test("rejects NaN at coords[0][0][0]", () => {
		expect(() => assertCoordsSafe([[[Number.NaN, 270]]])).to.throw(
			/finite non-negative integer/,
		);
	});

	test("rejects ±Infinity", () => {
		expect(() => assertCoordsSafe([[[Number.POSITIVE_INFINITY, 0]]])).to.throw(
			/finite non-negative integer/,
		);
		expect(() => assertCoordsSafe([[[0, Number.NEGATIVE_INFINITY]]])).to.throw(
			/finite non-negative integer/,
		);
	});

	test("rejects sane-but-huge finite floats from parseInt(<long hex>)", () => {
		expect(() => assertCoordsSafe([[[3.6e22, 0]]])).to.throw(
			/finite non-negative integer/,
		);
		expect(() => assertCoordsSafe([[[0, 9.26e26]]])).to.throw(
			/finite non-negative integer/,
		);
	});

	test("rejects negative integers", () => {
		expect(() => assertCoordsSafe([[[-1, 0]]])).to.throw(
			/finite non-negative integer/,
		);
	});

	test("rejects non-integer numbers", () => {
		expect(() => assertCoordsSafe([[[1.5, 0]]])).to.throw(
			/finite non-negative integer/,
		);
	});

	test("rejects values above MAX_PIXEL_COORD", () => {
		expect(() => assertCoordsSafe([[[MAX_PIXEL_COORD + 1, 0]]])).to.throw(
			/finite non-negative integer/,
		);
	});

	test("rejects non-array members in the nested shape", () => {
		expect(() => assertCoordsSafe("not an array")).to.throw(
			/must be an array/,
		);
		expect(() => assertCoordsSafe(["stroke"])).to.throw(
			/must be an array of points/,
		);
		expect(() => assertCoordsSafe([["point"]])).to.throw(
			/must be a \[number, number\] pair/,
		);
	});
});

describe("safeCoordsOrUndefined", () => {
	test("returns coords when safe", () => {
		const c = [[[10, 20]]];
		expect(safeCoordsOrUndefined(c)).to.equal(c);
	});

	test("returns undefined when not safe", () => {
		expect(safeCoordsOrUndefined([[[Number.NaN, 0]]])).to.equal(undefined);
		expect(safeCoordsOrUndefined("not coords")).to.equal(undefined);
	});

	test("passes undefined / null through", () => {
		expect(safeCoordsOrUndefined(undefined)).to.equal(undefined);
		expect(safeCoordsOrUndefined(null)).to.equal(null);
	});
});

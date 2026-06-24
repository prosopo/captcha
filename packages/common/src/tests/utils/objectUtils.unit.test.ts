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
	createObjectFromIterable,
	filterObjectEntries,
	mergeObjects,
	sumNumericObjects,
} from "../../utils/objectUtils.js";

describe("createObjectFromIterable", () => {
	it("uses resolved item key", () => {
		const iterable = [1, 2];

		const object = createObjectFromIterable(iterable, {
			getKey: (item) => item.toString(),
		});

		expect(object).toEqual({ "1": 1, "2": 2 });
	});

	it("uses modified value", () => {
		const iterable = [1, 2];

		const object = createObjectFromIterable(iterable, {
			getKey: (item) => item.toString(),
			getValue: (item) => item * 2,
		});

		expect(object).toEqual({ "1": 2, "2": 4 });
	});

	it("overrides value with the same key", () => {
		const iterable = [1, 2];

		const object = createObjectFromIterable(iterable, {
			getKey: () => "1",
		});

		expect(object).toEqual({ "1": 2 });
	});

	it("applies mergeValues callback", () => {
		const iterable = [1, 2];

		const object = createObjectFromIterable(iterable, {
			getKey: () => "1",
			mergeValues: (origin, latest) => origin + latest,
		});

		expect(object).toEqual({ "1": 3 });
	});
});

describe("mergeObjects", () => {
	it("merges distinct keys", () => {
		const items = [{ a: 1 }, { b: "2" }];

		const merged = mergeObjects(items, (origin, latest) => "unexpected");

		expect(merged).toEqual({ a: 1, b: "2" });
	});

	it("calls merge callback for intersections", () => {
		const first = { a: 1 };
		const second = { a: 2 };

		const merged = mergeObjects(
			[first, second],
			(origin, latest) => origin + latest,
		);

		expect(merged).toEqual({ a: 3 });
	});
});

describe("sumNumericObjects", () => {
	it("sums values with the same key", () => {
		const first = { a: 1 };
		const second = { a: 2 };

		const sum = sumNumericObjects([first, second]);

		expect(sum).toEqual({ a: 3 });
	});

	it("keeps origin values with distinct keys", () => {
		const first = { a: 1 };
		const second = { b: 2 };

		const sum = sumNumericObjects([first, second]);

		expect(sum).toEqual({ a: 1, b: 2 });
	});
});

describe("filterObjectEntries", () => {
	it("filters entries", () => {
		const object = { a: 1, b: 2, c: 3 };

		const filtered = filterObjectEntries(object, (value) => value > 1);

		expect(filtered).toEqual({ b: 2, c: 3 });
	});
});

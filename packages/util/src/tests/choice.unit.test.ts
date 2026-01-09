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
import { choice } from "../choice.js";

describe("choice", () => {
	it("chooses n items from array", () => {
		const items = [1, 2, 3, 4, 5];
		const random = () => 0.5;
		const result = choice(items, 3, random);
		expect(result).toHaveLength(3);
		expect(result.every((item) => items.includes(item))).toBe(true);
	});

	it("chooses all items when n equals array length", () => {
		const items = [1, 2, 3];
		const random = () => 0.5;
		const result = choice(items, 3, random);
		expect(result).toHaveLength(3);
	});

	it("chooses single item", () => {
		const items = [1, 2, 3, 4, 5];
		const random = () => 0.5;
		const result = choice(items, 1, random);
		expect(result).toHaveLength(1);
		expect(items.includes(result[0] as number)).toBe(true);
	});

	it("throws when n exceeds array length", () => {
		const items = [1, 2, 3];
		const random = () => 0.5;
		expect(() => choice(items, 4, random)).toThrow(
			"Cannot choose 4 items from array of length 3",
		);
	});

	it("chooses without replacement when withReplacement is false", () => {
		const items = [1, 2, 3];
		let callCount = 0;
		const random = () => {
			callCount++;
			return 0.5;
		};
		const result = choice(items, 3, random, { withReplacement: false });
		expect(result).toHaveLength(3);
		const unique = new Set(result);
		expect(unique.size).toBe(3);
	});

	it("allows replacement when withReplacement is true", () => {
		const items = [1, 2];
		const random = () => 0.5;
		const result = choice(items, 3, random, { withReplacement: true });
		expect(result).toHaveLength(3);
	});
});

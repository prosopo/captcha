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
import { stringifyBigInts } from "../logger.js";
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

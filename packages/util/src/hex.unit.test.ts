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
import { describe, expect, test } from "vitest";
import { embedData, extractData } from "./hex.js";

const hex =
	"0x0101010101010101010101010101010101010101010101010101010101010101";

describe("embedData", () => {
	test("it returns zero count if the array is empty", () => {
		const result = embedData(hex, []);
		expect(result).to.equal(
			"0x0001010101010101010101010101010101010101010101010101010101010101",
		);
	});
	test("it replaces data at the start and end of the string 1", () => {
		const result = embedData(hex, [1020, 345]);
		expect(result).to.equal(
			"0x023d033a030101010101010101010101010101010101010101010101011593fc",
		);
	});
	test("it replaces data at the start and end of the string 2", () => {
		const result = embedData(hex, [1, 3]);
		expect(result).to.equal(
			"0x023f013e01010101010101010101010101010101010101010101010101010131",
		);
	});
	test("it replaces data at the start and end of the string 3", () => {
		const result = embedData(hex, [9999, 9999]);
		expect(result).to.equal(
			"0x023c0438040101010101010101010101010101010101010101010101270f270f",
		);
	});
	test("it replaces data at the start and end of the string 4", () => {
		const result = embedData(hex, [99999, 99999]);
		expect(result).to.equal(
			"0x023b053605010101010101010101010101010101010101010101011869f1869f",
		);
	});
	test("throws on too short a hex string 1", () => {
		expect(() =>
			embedData(
				hex,
				[
					345, 678, 213, 1020, 453, 234, 678, 234, 234, 354, 345, 678, 213,
					1020,
				],
			),
		).to.throw(/exceeds length of hex string/);
	});
	test("throws on too short a hex string 2", () => {
		expect(() =>
			embedData(
				hex,
				[
					345, 678, 213, 1020, 453, 234, 678, 234, 234, 354, 345, 678, 213,
					1020, 345, 678, 213, 1020, 453, 234, 678, 234, 234, 354, 345, 678,
					213, 1020,
				],
			),
		).to.throw(/exceeds length of hex string/);
	});
});

describe("extractData", () => {
	test("it returns empty array if no data is embedded", () => {
		const result = extractData(embedData(hex, []));
		expect(result).to.deep.equal([]);
	});
	test("it extracts data from the start and end of the string 1", () => {
		const result = extractData(embedData(hex, [1020, 345]));
		expect(result).to.deep.equal([1020, 345]);
	});
	test("it extracts data from the start and end of the string 2", () => {
		const result = extractData(embedData(hex, [1, 3]));
		expect(result).to.deep.equal([1, 3]);
	});
	test("it extracts data from the start and end of the string 3", () => {
		const result = extractData(embedData(hex, [9999, 9999]));
		expect(result).to.deep.equal([9999, 9999]);
	});
	test("it extracts data from the start and end of the string 4", () => {
		const result = extractData(embedData(hex, [99999, 99999]));
		expect(result).to.deep.equal([99999, 99999]);
	});
});

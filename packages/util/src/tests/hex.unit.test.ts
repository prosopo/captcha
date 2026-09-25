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
import { embedData, extractData } from "../hex.js";

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

// Mirrors how the procaptcha managers size the salt: one random byte (two hex
// chars) per hex digit of each value, plus four bytes of header per value.
const callerSizedSalt = (data: number[]): string =>
	`0x${"ab".repeat(
		data
			.map((d) => d.toString(16).length + 4)
			.reduce((acc, curr) => acc + curr, 0),
	)}`;

describe("embedData round trip", () => {
	test("keeps every value when the salt is longer than 256 hex chars", () => {
		const coords = Array.from({ length: 20 }, (_, i) => 300 + i * 37);
		const salt = callerSizedSalt(coords);
		expect(salt.length - 2).toBeGreaterThan(256);
		expect(extractData(embedData(salt, coords))).to.deep.equal(coords);
	});

	test("keeps every value for every count that fits below index 256", () => {
		// 3 hex digits each: 2 + 36 * (4 + 3) = 254 chars.
		for (let count = 1; count <= 36; count++) {
			const coords = Array.from({ length: count }, (_, i) => 4000 + i);
			expect(
				extractData(embedData(callerSizedSalt(coords), coords)),
			).to.deep.equal(coords);
		}
	});

	test("throws instead of truncating once the data needs positions past 255", () => {
		const coords = Array.from({ length: 37 }, (_, i) => 4000 + i);
		expect(() => embedData(callerSizedSalt(coords), coords)).to.throw(
			/exceeds length of hex string/,
		);
	});

	test("throws when there are more values than the count byte can hold", () => {
		const coords = Array.from({ length: 256 }, () => 1);
		expect(() => embedData(callerSizedSalt(coords), coords)).to.throw(/count/);
	});

	test("throws instead of overwriting the header when the salt is too short", () => {
		// 8 chars: 2 count + 4 position/length + 3 value = 9 needed.
		expect(() => embedData("0x01010101", [0xfff])).to.throw(/exceeds/);
	});

	test("throws on values that are not non-negative integers", () => {
		expect(() => embedData(hex, [-5])).to.throw(/non-negative integer/);
		expect(() => embedData(hex, [1.5])).to.throw(/non-negative integer/);
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

	test("throws when a value slice decodes to NaN (length=0)", () => {
		const malformed = "0x010200";
		expect(() => extractData(malformed)).to.throw(/invalid value/);
	});

	test("throws when the count byte itself is non-hex (NaN)", () => {
		expect(() => extractData("0xzz")).to.throw(/invalid value/);
	});

	test("throws when a value parses above Number.MAX_SAFE_INTEGER", () => {
		const malformed = `0x010610${"f".repeat(16)}`;
		expect(() => extractData(malformed)).to.throw(/invalid value/);
	});
});

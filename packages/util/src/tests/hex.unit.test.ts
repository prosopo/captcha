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
import { embedData, extractData, hashToHex, u8aToHex } from "../hex.js";

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

describe("u8aToHex", () => {
	test("converts Uint8Array to hex with prefix", () => {
		const arr = new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0x6f]);
		expect(u8aToHex(arr)).toBe("0x68656c6c6f");
	});

	test("converts Uint8Array to hex without prefix", () => {
		const arr = new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0x6f]);
		expect(u8aToHex(arr, -1, false)).toBe("68656c6c6f");
	});

	test("returns empty string for null", () => {
		expect(u8aToHex(null)).toBe("0x");
	});

	test("returns empty string for empty array", () => {
		expect(u8aToHex(new Uint8Array())).toBe("0x");
	});

	test("truncates with ellipsis when bitLength specified", () => {
		const arr = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]);
		const result = u8aToHex(arr, 16);
		expect(result).toContain("…");
	});
});

describe("hashToHex", () => {
	test("converts array to hex", () => {
		const arr = [0x68, 0x65, 0x6c, 0x6c, 0x6f];
		expect(hashToHex(arr)).toBe("0x68656c6c6f");
	});

	test("returns string as-is", () => {
		expect(hashToHex("0x1234")).toBe("0x1234");
		expect(hashToHex("abc")).toBe("abc");
	});
});

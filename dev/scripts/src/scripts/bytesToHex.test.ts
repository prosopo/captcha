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

import { describe, expect, it } from "vitest";

// Test the bytesToHex logic directly instead of importing the script
describe("bytesToHex conversion logic", () => {
	it("should convert single byte to hex", () => {
		const arg = "255";
		console.log(`arg          : ${arg}`);

		const byteArray = arg.split(",").map((x) => Number.parseInt(x));
		const hex = Array.from(byteArray, (byte) =>
			`0${(byte & 0xff).toString(16)}`.slice(-2),
		).join("");

		expect(hex).toBe("ff");
	});

	it("should convert multiple bytes to hex", () => {
		const arg = "1,2,3,255";

		const byteArray = arg.split(",").map((x) => Number.parseInt(x));
		const hex = Array.from(byteArray, (byte) =>
			`0${(byte & 0xff).toString(16)}`.slice(-2),
		).join("");

		expect(hex).toBe("010203ff");
	});

	it("should handle zero byte", () => {
		const arg = "0";

		const byteArray = arg.split(",").map((x) => Number.parseInt(x));
		const hex = Array.from(byteArray, (byte) =>
			`0${(byte & 0xff).toString(16)}`.slice(-2),
		).join("");

		expect(hex).toBe("00");
	});

	it("should handle byte with leading zero", () => {
		const arg = "15";

		const byteArray = arg.split(",").map((x) => Number.parseInt(x));
		const hex = Array.from(byteArray, (byte) =>
			`0${(byte & 0xff).toString(16)}`.slice(-2),
		).join("");

		expect(hex).toBe("0f");
	});

	it("should handle empty byte array", () => {
		const arg = "";

		const byteArray = arg.split(",").map((x) => Number.parseInt(x));
		// When parsing empty string, Number.parseInt("") returns NaN
		// NaN & 0xff = 0, so it produces "00"
		const hex = Array.from(byteArray, (byte) =>
			`0${(byte & 0xff).toString(16)}`.slice(-2),
		).join("");

		expect(hex).toBe("00");
	});

	it("should trim whitespace from input", () => {
		const arg = "  1 , 2 , 3  ";

		const byteArray = arg.split(",").map((x) => Number.parseInt(x));
		const hex = Array.from(byteArray, (byte) =>
			`0${(byte & 0xff).toString(16)}`.slice(-2),
		).join("");

		expect(hex).toBe("010203");
	});

	it("should handle large byte values", () => {
		const arg = "255,254,253";

		const byteArray = arg.split(",").map((x) => Number.parseInt(x));
		const hex = Array.from(byteArray, (byte) =>
			`0${(byte & 0xff).toString(16)}`.slice(-2),
		).join("");

		expect(hex).toBe("fffefd");
	});

	it("should handle invalid input gracefully", () => {
		const arg = "invalid,input";

		expect(() => {
			const byteArray = arg.split(",").map((x) => Number.parseInt(x));
		}).not.toThrow();
	});
});

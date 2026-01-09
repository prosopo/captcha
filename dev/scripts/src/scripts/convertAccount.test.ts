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

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock process.argv to test the convertAccount script
describe("convertAccount script", () => {
	let originalArgv: string[];
	let consoleLogSpy: any;

	beforeEach(() => {
		originalArgv = process.argv;
		consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		process.argv = originalArgv;
		consoleLogSpy.mockRestore();
	});

	it("should convert SS58 address to bytes and hex", async () => {
		// Using a known test address
		const testAddress = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

		process.argv = ["node", "convertAccount.ts", testAddress];

		await import("./convertAccount.js");

		expect(consoleLogSpy).toHaveBeenCalledWith(
			expect.stringContaining("bytes: ["),
		);
		expect(consoleLogSpy).toHaveBeenCalledWith(
			expect.stringContaining("hex: "),
		);
		expect(consoleLogSpy).toHaveBeenCalledWith(
			expect.stringContaining("ss58: 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"),
		);
	});

	it("should convert hex string to bytes and SS58", async () => {
		const testHex = "0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d";

		process.argv = ["node", "convertAccount.ts", testHex];

		await import("./convertAccount.js");

		expect(consoleLogSpy).toHaveBeenCalledWith(
			expect.stringContaining("bytes: ["),
		);
		expect(consoleLogSpy).toHaveBeenCalledWith(
			expect.stringContaining("hex: d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d"),
		);
		expect(consoleLogSpy).toHaveBeenCalledWith(
			expect.stringContaining("ss58: "),
		);
	});

	it("should convert byte array to hex and SS58", async () => {
		const byteArray = "[212,53,147,199,21,253,211,28,97,20,26,189,4,169,159,214,130,44,133,88,133,76,205,227,154,86,132,231,165,109,162,125]";

		process.argv = ["node", "convertAccount.ts", byteArray];

		await import("./convertAccount.js");

		expect(consoleLogSpy).toHaveBeenCalledWith(
			expect.stringContaining("bytes: [212,53,147,199,21,253,211,28,97,20,26,189,4,169,159,214,130,44,133,88,133,76,205,227,154,86,132,231,165,109,162,125]"),
		);
		expect(consoleLogSpy).toHaveBeenCalledWith(
			expect.stringContaining("hex: d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d"),
		);
		expect(consoleLogSpy).toHaveBeenCalledWith(
			expect.stringContaining("ss58: "),
		);
	});

	it("should handle invalid input gracefully", async () => {
		const invalidInput = "invalid";

		process.argv = ["node", "convertAccount.ts", invalidInput];

		// This should throw an error, but we're testing that it doesn't crash
		// The script doesn't have explicit error handling for invalid inputs
		await expect(import("./convertAccount.js")).rejects.toThrow();
	});

	it("should trim whitespace from input", async () => {
		const testAddress = "  5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY  ";

		process.argv = ["node", "convertAccount.ts", testAddress];

		await import("./convertAccount.js");

		expect(consoleLogSpy).toHaveBeenCalledWith(
			expect.stringContaining("ss58: 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"),
		);
	});
});
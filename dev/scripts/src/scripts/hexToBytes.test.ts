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

// Mock process.argv to test the hexToBytes script
describe("hexToBytes script", () => {
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

	it("should convert hex string to byte array", async () => {
		const testHex = "deadbeef";

		process.argv = ["node", "hexToBytes.ts", testHex];

		await import("./hexToBytes.js");

		expect(consoleLogSpy).toHaveBeenCalledWith("arg          : deadbeef");
		expect(consoleLogSpy).toHaveBeenCalledWith(
			Uint8Array.from([222, 173, 190, 239]),
		);
	});

	it("should convert hex string with 0x prefix", async () => {
		const testHex = "0xdeadbeef";

		process.argv = ["node", "hexToBytes.ts", testHex];

		await import("./hexToBytes.js");

		expect(consoleLogSpy).toHaveBeenCalledWith("arg          : 0xdeadbeef");
		expect(consoleLogSpy).toHaveBeenCalledWith(
			Uint8Array.from([222, 173, 190, 239]),
		);
	});

	it("should handle empty hex string", async () => {
		const testHex = "";

		process.argv = ["node", "hexToBytes.ts", testHex];

		await import("./hexToBytes.js");

		expect(consoleLogSpy).toHaveBeenCalledWith("arg          : ");
		expect(consoleLogSpy).toHaveBeenCalledWith(new Uint8Array([]));
	});

	it("should handle single byte", async () => {
		const testHex = "ff";

		process.argv = ["node", "hexToBytes.ts", testHex];

		await import("./hexToBytes.js");

		expect(consoleLogSpy).toHaveBeenCalledWith("arg          : ff");
		expect(consoleLogSpy).toHaveBeenCalledWith(Uint8Array.from([255]));
	});

	it("should handle odd length hex string", async () => {
		const testHex = "abc";

		process.argv = ["node", "hexToBytes.ts", testHex];

		await import("./hexToBytes.js");

		expect(consoleLogSpy).toHaveBeenCalledWith("arg          : abc");
		expect(consoleLogSpy).toHaveBeenCalledWith(Uint8Array.from([171, 192]));
	});

	it("should trim whitespace from input", async () => {
		const testHex = "  deadbeef  ";

		process.argv = ["node", "hexToBytes.ts", testHex];

		await import("./hexToBytes.js");

		expect(consoleLogSpy).toHaveBeenCalledWith("arg          :   deadbeef  ");
		expect(consoleLogSpy).toHaveBeenCalledWith(
			Uint8Array.from([222, 173, 190, 239]),
		);
	});
});
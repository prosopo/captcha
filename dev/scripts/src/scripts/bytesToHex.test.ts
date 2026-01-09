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

// Mock process.argv to test the bytesToHex script
describe("bytesToHex script", () => {
	let originalArgv: string[];
	let consoleLogSpy: any;
	let consoleErrorSpy: any;

	beforeEach(() => {
		originalArgv = process.argv;
		consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
		consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		process.argv = originalArgv;
		consoleLogSpy.mockRestore();
		consoleErrorSpy.mockRestore();
	});

	it("should convert single byte to hex", async () => {
		// Mock process.argv to simulate command line args
		process.argv = ["node", "bytesToHex.ts", "255"];

		// Import and run the script (this executes immediately on import)
		await import("./bytesToHex.js");

		expect(consoleLogSpy).toHaveBeenCalledWith("arg          : 255");
		expect(consoleLogSpy).toHaveBeenCalledWith("ff");
	});

	it("should convert multiple bytes to hex", async () => {
		process.argv = ["node", "bytesToHex.ts", "1,2,3,255"];

		await import("./bytesToHex.js");

		expect(consoleLogSpy).toHaveBeenCalledWith("arg          : 1,2,3,255");
		expect(consoleLogSpy).toHaveBeenCalledWith("010203ff");
	});

	it("should handle zero byte", async () => {
		process.argv = ["node", "bytesToHex.ts", "0"];

		await import("./bytesToHex.js");

		expect(consoleLogSpy).toHaveBeenCalledWith("arg          : 0");
		expect(consoleLogSpy).toHaveBeenCalledWith("00");
	});

	it("should handle byte with leading zero", async () => {
		process.argv = ["node", "bytesToHex.ts", "15"];

		await import("./bytesToHex.js");

		expect(consoleLogSpy).toHaveBeenCalledWith("arg          : 15");
		expect(consoleLogSpy).toHaveBeenCalledWith("0f");
	});

	it("should handle empty byte array", async () => {
		process.argv = ["node", "bytesToHex.ts", ""];

		await import("./bytesToHex.js");

		expect(consoleLogSpy).toHaveBeenCalledWith("arg          : ");
		expect(consoleLogSpy).toHaveBeenCalledWith("");
	});

	it("should trim whitespace from input", async () => {
		process.argv = ["node", "bytesToHex.ts", "  1 , 2 , 3  "];

		await import("./bytesToHex.js");

		expect(consoleLogSpy).toHaveBeenCalledWith("arg          :   1 , 2 , 3  ");
		expect(consoleLogSpy).toHaveBeenCalledWith("010203");
	});
});
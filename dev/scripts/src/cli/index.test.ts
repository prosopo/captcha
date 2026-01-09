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

// Test CLI argument parsing logic
describe("CLI argument parsing", () => {
	it("should parse log level from parsed args", () => {
		// Test that log level parsing works correctly
		const parseLogLevel = (level?: string) => {
			const levels = {
				error: 0,
				warn: 1,
				info: 2,
				debug: 3,
			};
			return levels[level as keyof typeof levels] ?? 2; // default to info
		};

		expect(parseLogLevel("error")).toBe(0);
		expect(parseLogLevel("warn")).toBe(1);
		expect(parseLogLevel("info")).toBe(2);
		expect(parseLogLevel("debug")).toBe(3);
		expect(parseLogLevel(undefined)).toBe(2);
		expect(parseLogLevel("unknown")).toBe(2);
	});

	it("should validate command line arguments structure", () => {
		// Test basic argument structure validation
		const validateArgs = (args: string[]) => {
			if (args.length < 2) return false;
			if (!args[0]?.includes("node")) return false;
			return true;
		};

		expect(validateArgs(["node", "script.js"])).toBe(true);
		expect(validateArgs(["node"])).toBe(false);
		expect(validateArgs([])).toBe(false);
		expect(validateArgs(["python", "script.py"])).toBe(false);
	});

	it("should parse boolean flags correctly", () => {
		// Test boolean flag parsing
		const parseBooleanFlag = (
			args: string[],
			flag: string,
			defaultValue = false,
		) => {
			return args.includes(`--${flag}`) || defaultValue;
		};

		expect(parseBooleanFlag(["--provider"], "provider")).toBe(true);
		expect(parseBooleanFlag(["--sites"], "provider")).toBe(false);
		expect(parseBooleanFlag(["--provider", "--sites"], "provider")).toBe(true);
		expect(parseBooleanFlag([], "provider", true)).toBe(true);
		expect(parseBooleanFlag([], "provider", false)).toBe(false);
	});

	it("should extract positional arguments", () => {
		// Test positional argument extraction
		const getPositionalArg = (args: string[], index: number) => {
			const scriptIndex = args.findIndex((arg) => arg.includes("cli/index.js"));
			if (scriptIndex === -1) return undefined;
			return args[scriptIndex + index + 1];
		};

		const args = ["node", "cli/index.js", "setup", "--provider"];
		expect(getPositionalArg(args, 0)).toBe("setup");
		expect(getPositionalArg(args, 1)).toBe("--provider");
		expect(getPositionalArg(args, 2)).toBe(undefined);
	});
});

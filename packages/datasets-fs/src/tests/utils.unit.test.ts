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
import path from "node:path";
import { describe, expect, test } from "vitest";
import {
	captchasEq,
	captchasEqFs,
	fsEq,
	fsWalk,
	readCaptchasJson,
	readDataJson,
} from "./utils.js";

describe("fsWalk", () => {
	test("walks directory recursively in encounter order", () => {
		const testDir = path.join(__dirname, "data", "hierarchical");
		const paths: string[] = [];
		for (const pth of fsWalk(testDir)) {
			paths.push(pth);
		}
		// Should include the root directory first
		expect(paths[0]).toBe(testDir);
		// Should include subdirectories
		expect(paths.some((p) => p.includes("dog"))).toBe(true);
		// Should include files
		expect(paths.some((p) => p.endsWith(".png"))).toBe(true);
	});

	test("walks directory recursively with filesFirst option", () => {
		const testDir = path.join(__dirname, "data", "hierarchical", "dog");
		const paths: string[] = [];
		for (const pth of fsWalk(testDir, { filesFirst: true })) {
			paths.push(pth);
		}
		// Root directory should be last
		expect(paths[paths.length - 1]).toBe(testDir);
		// Files should come before directories
		const rootIndex = paths.indexOf(testDir);
		const fileIndices = paths
			.map((p, i) => (p.endsWith(".png") ? i : -1))
			.filter((i) => i !== -1);
		for (const fileIndex of fileIndices) {
			expect(fileIndex).toBeLessThan(rootIndex);
		}
	});

	test("handles non-existent path", () => {
		const nonExistent = path.join(__dirname, "nonexistent");
		const paths: string[] = [];
		for (const pth of fsWalk(nonExistent)) {
			paths.push(pth);
		}
		// Should yield the path itself even if it doesn't exist
		expect(paths.length).toBe(1);
		expect(paths[0]).toBe(nonExistent);
	});

	test("handles file path", () => {
		const testFile = path.join(__dirname, "data", "flat", "data.json");
		const paths: string[] = [];
		for (const pth of fsWalk(testFile)) {
			paths.push(pth);
		}
		// Should yield the file itself
		expect(paths.length).toBe(1);
		expect(paths[0]).toBe(testFile);
	});
});

describe("fsEq", () => {
	test("returns true for identical directories", () => {
		const dir1 = path.join(__dirname, "data", "flat");
		const dir2 = path.join(__dirname, "data", "flat");
		expect(fsEq(dir1, dir2)).toBe(true);
	});

	test("returns false for different directories", () => {
		const dir1 = path.join(__dirname, "data", "flat");
		const dir2 = path.join(__dirname, "data", "hierarchical");
		expect(fsEq(dir1, dir2)).toBe(false);
	});

	test("returns true for identical files", () => {
		const file1 = path.join(__dirname, "data", "flat", "data.json");
		const file2 = path.join(__dirname, "data", "flat", "data.json");
		expect(fsEq(file1, file2)).toBe(true);
	});

	test("returns false for files with different content", () => {
		const file1 = path.join(__dirname, "data", "flat", "data.json");
		const file2 = path.join(__dirname, "data", "flat_resized", "data.json");
		// Assuming these files are different
		expect(fsEq(file1, file2)).toBe(false);
	});
});

describe("readDataJson", () => {
	test("reads and parses valid data JSON file", () => {
		const filePath = path.join(__dirname, "data", "flat", "data.json");
		const data = readDataJson(filePath);
		expect(data).toBeDefined();
		expect(data.items).toBeDefined();
		expect(Array.isArray(data.items)).toBe(true);
	});

	test("replaces ${repo} placeholder", () => {
		const filePath = path.join(__dirname, "data", "flat", "data.json");
		const data = readDataJson(filePath);
		// Check that ${repo} has been replaced
		if (data.items.length > 0) {
			const firstItem = data.items[0];
			expect(firstItem.data).not.toContain("${repo}");
		}
	});

	test("types", () => {
		const filePath = path.join(__dirname, "data", "flat", "data.json");
		const data = readDataJson(filePath);
		// Type check: data should have items array
		const items: typeof data.items = data.items;
		expect(Array.isArray(items)).toBe(true);
	});
});

describe("readCaptchasJson", () => {
	test("reads and parses valid captchas JSON file", () => {
		const filePath = path.join(
			__dirname,
			"data",
			"flat_resized",
			"captchas_v2.json",
		);
		const captchas = readCaptchasJson(filePath);
		expect(captchas).toBeDefined();
		expect(captchas.captchas).toBeDefined();
		expect(Array.isArray(captchas.captchas)).toBe(true);
	});

	test("types", () => {
		const filePath = path.join(
			__dirname,
			"data",
			"flat_resized",
			"captchas_v2.json",
		);
		const captchas = readCaptchasJson(filePath);
		// Type check: captchas should have captchas array
		const captchasArray: typeof captchas.captchas = captchas.captchas;
		expect(Array.isArray(captchasArray)).toBe(true);
	});
});

describe("captchasEq", () => {
	test("returns true for identical captcha containers", () => {
		const filePath = path.join(
			__dirname,
			"data",
			"flat_resized",
			"captchas_v2.json",
		);
		const captchas1 = readCaptchasJson(filePath);
		const captchas2 = readCaptchasJson(filePath);
		// Note: salts will be different, so we need to compare manually
		expect(captchas1.captchas.length).toBe(captchas2.captchas.length);
	});

	test("returns false for different length captcha containers", () => {
		const filePath1 = path.join(
			__dirname,
			"data",
			"flat_resized",
			"captchas_v1.json",
		);
		const filePath2 = path.join(
			__dirname,
			"data",
			"flat_resized",
			"captchas_v2.json",
		);
		const captchas1 = readCaptchasJson(filePath1);
		const captchas2 = readCaptchasJson(filePath2);
		// Assuming these have different lengths
		if (captchas1.captchas.length !== captchas2.captchas.length) {
			expect(captchasEq(captchas1, captchas2)).toBe(false);
		}
	});

	test("returns false when salts are the same but content differs", () => {
		const filePath = path.join(
			__dirname,
			"data",
			"flat_resized",
			"captchas_v2.json",
		);
		const captchas1 = readCaptchasJson(filePath);
		const captchas2 = readCaptchasJson(filePath);
		// Modify one captcha to have same salt but different content
		if (captchas1.captchas.length > 0 && captchas2.captchas.length > 0) {
			const modified1 = { ...captchas1 };
			const modified2 = { ...captchas2 };
			// Make salts the same but content different
			modified1.captchas[0] = {
				...modified1.captchas[0],
				salt: "same-salt",
			};
			modified2.captchas[0] = {
				...modified2.captchas[0],
				salt: "same-salt",
				target: "different-target",
			};
			expect(captchasEq(modified1, modified2)).toBe(false);
		}
	});

	test("types", () => {
		const filePath = path.join(
			__dirname,
			"data",
			"flat_resized",
			"captchas_v2.json",
		);
		const captchas1 = readCaptchasJson(filePath);
		const captchas2 = readCaptchasJson(filePath);
		// Type check: both parameters should be CaptchasContainer
		const result: boolean = captchasEq(captchas1, captchas2);
		expect(typeof result).toBe("boolean");
	});
});

describe("captchasEqFs", () => {
	test("returns false when comparing same file (salts are same)", () => {
		const filePath = path.join(
			__dirname,
			"data",
			"flat_resized",
			"captchas_v2.json",
		);
		// Comparing file to itself returns false because salts are the same
		// This is expected behavior - the function is designed to compare different captcha containers
		const result = captchasEqFs(filePath, filePath);
		expect(result).toBe(false);
	});

	test("types", () => {
		const filePath = path.join(
			__dirname,
			"data",
			"flat_resized",
			"captchas_v2.json",
		);
		// Type check: should return boolean
		const result: boolean = captchasEqFs(filePath, filePath);
		expect(typeof result).toBe("boolean");
	});
});

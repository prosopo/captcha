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

import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getEnv, getEnvFile, loadEnv } from "../env.js";

// Mock dependencies
vi.mock("node:fs");
vi.mock("dotenv");

describe("env", () => {
	const mockFs = vi.mocked(fs);
	const mockDotenv = vi.mocked(dotenv);

	beforeEach(() => {
		vi.clearAllMocks();
		// Reset process.env.NODE_ENV - use Reflect.deleteProperty to avoid lint error
		Reflect.deleteProperty(process.env, "NODE_ENV");
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("getEnv", () => {
		it("types", () => {
			// Check return type is string
			const result: string = getEnv();
			expect(typeof result).toBe("string");
		});

		it("should return 'development' when NODE_ENV is not set", () => {
			Reflect.deleteProperty(process.env, "NODE_ENV");
			expect(getEnv()).toBe("development");
		});

		it("should return cleaned NODE_ENV when set to 'production'", () => {
			process.env.NODE_ENV = "production";
			expect(getEnv()).toBe("production");
		});

		it("should return cleaned NODE_ENV when set to 'test'", () => {
			process.env.NODE_ENV = "test";
			expect(getEnv()).toBe("test");
		});

		it("should remove non-word characters from NODE_ENV", () => {
			process.env.NODE_ENV = "test-env_123";
			// Underscores are word characters, so only hyphens are removed
			expect(getEnv()).toBe("testenv_123");
		});

		it("should handle NODE_ENV with spaces", () => {
			process.env.NODE_ENV = "test env";
			expect(getEnv()).toBe("testenv");
		});

		it("should handle NODE_ENV with special characters", () => {
			process.env.NODE_ENV = "test@#$%env";
			expect(getEnv()).toBe("testenv");
		});

		it("should handle empty NODE_ENV string", () => {
			process.env.NODE_ENV = "";
			expect(getEnv()).toBe("development");
		});
	});

	describe("getEnvFile", () => {
		beforeEach(() => {
			mockFs.existsSync = vi.fn();
			mockFs.readFileSync = vi.fn();
		});

		it("types", () => {
			// Check parameter types and return type
			const result1: string = getEnvFile();
			const result2: string = getEnvFile("rootDir");
			const result3: string = getEnvFile("rootDir", "filename");
			const result4: string = getEnvFile("rootDir", "filename", "filepath");
			const result5: string = getEnvFile(
				"rootDir",
				"filename",
				"filepath",
				"nodeEnv",
			);
			expect(typeof result1).toBe("string");
			expect(typeof result2).toBe("string");
			expect(typeof result3).toBe("string");
			expect(typeof result4).toBe("string");
			expect(typeof result5).toBe("string");
		});

		it("should return path when file exists in rootDir", () => {
			const rootDir = "/test/root";
			const filename = ".env";
			const nodeEnv = "test";
			const expectedPath = path.join(rootDir, `${filename}.${nodeEnv}`);

			mockFs.existsSync.mockReturnValue(true);

			const result = getEnvFile(rootDir, filename, undefined, nodeEnv);

			expect(result).toBe(expectedPath);
			expect(mockFs.existsSync).toHaveBeenCalledWith(expectedPath);
		});

		it("should search up directories when file not found in rootDir", () => {
			const rootDir = "/test/root";
			const filename = ".env";
			const nodeEnv = "test";
			const resolvedRootDir = path.resolve(rootDir);
			const parentPath = path.resolve(resolvedRootDir, "..");
			const expectedPath = path.join(parentPath, `${filename}.${nodeEnv}`);

			// File not found in rootDir, but found in parent
			// The function checks: file in rootDir (false), package.json in rootDir (false), file in parent (true), final check (true)
			mockFs.existsSync
				.mockReturnValueOnce(false) // file in rootDir - loop continues
				.mockReturnValueOnce(false) // package.json in rootDir - doesn't exist
				.mockReturnValueOnce(true) // file in parent - loop exits
				.mockReturnValueOnce(true); // final check of foundPath

			mockFs.readFileSync.mockReturnValue(
				JSON.stringify({ name: "some-package" }),
			);

			const result = getEnvFile(rootDir, filename, undefined, nodeEnv);

			expect(result).toBe(expectedPath);
			expect(mockFs.existsSync).toHaveBeenCalledTimes(4);
		});

		it("should stop searching when reaching workspace root package.json", () => {
			const rootDir = "/test/root";
			const filename = ".env";
			const nodeEnv = "test";
			const filepath = "/fallback/path";
			const resolvedRootDir = path.resolve(rootDir);
			// When file not found and workspace root is reached, loop breaks, then final check fails, so returns fallback
			const expectedPath = path.join(resolvedRootDir, `${filename}.${nodeEnv}`);

			// File not found, and workspace root package.json found
			// The function checks: file in rootDir (false), package.json in rootDir (true), reads it, breaks loop
			// Then checks foundPath (false), so returns fallback using rootDir
			mockFs.existsSync
				.mockReturnValueOnce(false) // file in rootDir - loop continues
				.mockReturnValueOnce(true) // package.json in rootDir - exists
				.mockReturnValueOnce(false); // final check of foundPath - doesn't exist

			mockFs.readFileSync.mockReturnValue(
				JSON.stringify({ name: "@prosopo/captcha-private" }),
			);

			const result = getEnvFile(rootDir, filename, filepath, nodeEnv);

			expect(result).toBe(expectedPath);
			expect(mockFs.existsSync).toHaveBeenCalledTimes(3);
		});

		it("should stop searching after 10 levels", () => {
			const rootDir = "/test/root";
			const filename = ".env";
			const nodeEnv = "test";
			const filepath = "/fallback/path";
			const resolvedRootDir = path.resolve(rootDir);
			// When file not found after 10 levels, loop breaks, then final check fails, so returns fallback
			const expectedPath = path.join(resolvedRootDir, `${filename}.${nodeEnv}`);

			// File never found, and we hit 10 levels
			// Each iteration: 1 file check + 1 package.json check = 2 calls per level
			// 11 iterations (initial + 10 levels) = 22 calls
			// Plus 1 final check = 23 calls total
			mockFs.existsSync.mockReturnValue(false);
			mockFs.readFileSync.mockReturnValue(
				JSON.stringify({ name: "some-package" }),
			);

			const result = getEnvFile(rootDir, filename, filepath, nodeEnv);

			expect(result).toBe(expectedPath);
			// 11 iterations (initial + 10 levels) * 2 checks per iteration + 1 final check = 23 calls
			expect(mockFs.existsSync).toHaveBeenCalledTimes(23);
		});

		it("should use default filename when not provided", () => {
			const rootDir = "/test/root";
			const nodeEnv = "development";
			const expectedPath = path.join(rootDir, `.env.${nodeEnv}`);

			mockFs.existsSync.mockReturnValue(true);

			const result = getEnvFile(rootDir, undefined, undefined, nodeEnv);

			expect(result).toBe(expectedPath);
		});

		it("should use getEnv() when nodeEnv not provided", () => {
			const rootDir = "/test/root";
			const filename = ".env";
			process.env.NODE_ENV = "production";
			const expectedPath = path.join(rootDir, `${filename}.production`);

			mockFs.existsSync.mockReturnValue(true);

			const result = getEnvFile(rootDir, filename);

			expect(result).toBe(expectedPath);
		});

		it("should return fallback path when file not found anywhere", () => {
			const rootDir = "/test/root";
			const filename = ".env";
			const filepath = "/fallback/path";
			const nodeEnv = "test";
			const resolvedRootDir = path.resolve(rootDir);
			// When file not found, it returns path.join(rootDir || filepath, fileNameFull)
			// Since rootDir is provided, it uses resolved rootDir
			const expectedPath = path.join(resolvedRootDir, `${filename}.${nodeEnv}`);

			mockFs.existsSync.mockReturnValue(false);
			mockFs.readFileSync.mockReturnValue(
				JSON.stringify({ name: "some-package" }),
			);

			const result = getEnvFile(rootDir, filename, filepath, nodeEnv);

			expect(result).toBe(expectedPath);
		});

		it("should use default filepath when rootDir and filepath not provided", () => {
			const filename = ".env";
			const nodeEnv = "test";

			// Mock the default filepath calculation
			mockFs.existsSync.mockReturnValue(true);

			const result = getEnvFile(undefined, filename, undefined, nodeEnv);

			// Should resolve to current directory
			expect(mockFs.existsSync).toHaveBeenCalled();
			expect(result).toContain(`${filename}.${nodeEnv}`);
		});

		it("should handle package.json with different name", () => {
			const rootDir = "/test/root";
			const filename = ".env";
			const nodeEnv = "test";
			const resolvedRootDir = path.resolve(rootDir);
			const parentPath = path.resolve(resolvedRootDir, "..");
			const expectedPath = path.join(parentPath, `${filename}.${nodeEnv}`);

			// File not found in rootDir, package.json exists with different name, so continues searching
			// File found in parent, loop exits, final check passes
			mockFs.existsSync
				.mockReturnValueOnce(false) // file in rootDir - loop continues
				.mockReturnValueOnce(true) // package.json in rootDir - exists
				.mockReturnValueOnce(true) // file in parent - loop exits
				.mockReturnValueOnce(true); // final check of foundPath

			mockFs.readFileSync.mockReturnValue(
				JSON.stringify({ name: "different-package" }),
			);

			const result = getEnvFile(rootDir, filename, undefined, nodeEnv);

			expect(result).toBe(expectedPath);
		});

		it("should handle missing package.json gracefully", () => {
			const rootDir = "/test/root";
			const filename = ".env";
			const nodeEnv = "test";
			const resolvedRootDir = path.resolve(rootDir);
			const parentPath = path.resolve(resolvedRootDir, "..");
			const expectedPath = path.join(parentPath, `${filename}.${nodeEnv}`);

			// File not found in rootDir, package.json doesn't exist, so continues searching
			// File found in parent, loop exits, final check passes
			mockFs.existsSync
				.mockReturnValueOnce(false) // file in rootDir - loop continues
				.mockReturnValueOnce(false) // package.json in rootDir - doesn't exist
				.mockReturnValueOnce(true) // file in parent - loop exits
				.mockReturnValueOnce(true); // final check of foundPath

			const result = getEnvFile(rootDir, filename, undefined, nodeEnv);

			expect(result).toBe(expectedPath);
		});
	});

	describe("loadEnv", () => {
		beforeEach(() => {
			mockFs.existsSync = vi.fn();
			mockFs.readFileSync = vi.fn();
			mockDotenv.config = vi.fn();
		});

		it("types", () => {
			// Check parameter types and return type
			mockFs.existsSync.mockReturnValue(true);
			mockDotenv.config.mockReturnValue({ parsed: {} });

			const result1: string = loadEnv();
			const result2: string = loadEnv("rootDir");
			const result3: string = loadEnv("rootDir", "filename");
			const result4: string = loadEnv("rootDir", "filename", "filePath");
			const result5: string = loadEnv(
				"rootDir",
				"filename",
				"filePath",
				"nodeEnv",
			);
			const result6: string = loadEnv(
				"rootDir",
				"filename",
				"filePath",
				"nodeEnv",
				true,
			);
			expect(typeof result1).toBe("string");
			expect(typeof result2).toBe("string");
			expect(typeof result3).toBe("string");
			expect(typeof result4).toBe("string");
			expect(typeof result5).toBe("string");
			expect(typeof result6).toBe("string");
		});

		it("should load env file with default parameters", () => {
			// loadEnv uses path.resolve(rootDir || ".") which resolves to absolute path
			const expectedPath = path.resolve(".", ".env.development");

			mockFs.existsSync.mockReturnValue(true);
			mockDotenv.config.mockReturnValue({ parsed: {} });

			const result = loadEnv();

			expect(result).toBe(expectedPath);
			expect(mockDotenv.config).toHaveBeenCalledWith({
				path: expectedPath,
				override: false,
			});
		});

		it("should load env file with custom rootDir", () => {
			const rootDir = "/custom/root";
			const expectedPath = path.join(rootDir, ".env.development");

			mockFs.existsSync.mockReturnValue(true);
			mockDotenv.config.mockReturnValue({ parsed: {} });

			const result = loadEnv(rootDir);

			expect(result).toBe(expectedPath);
			expect(mockDotenv.config).toHaveBeenCalledWith({
				path: expectedPath,
				override: false,
			});
		});

		it("should load env file with custom filename", () => {
			const rootDir = "/test/root";
			const filename = "custom.env";
			const expectedPath = path.join(rootDir, `${filename}.development`);

			mockFs.existsSync.mockReturnValue(true);
			mockDotenv.config.mockReturnValue({ parsed: {} });

			const result = loadEnv(rootDir, filename);

			expect(result).toBe(expectedPath);
			expect(mockDotenv.config).toHaveBeenCalledWith({
				path: expectedPath,
				override: false,
			});
		});

		it("should load env file with custom filePath", () => {
			const rootDir = "/test/root";
			const filename = ".env";
			const filePath = "/fallback/path";
			const resolvedRootDir = path.resolve(rootDir);
			// When file not found, getEnvFile returns path.join(rootDir, fileNameFull)
			const expectedPath = path.join(
				resolvedRootDir,
				`${filename}.development`,
			);

			mockFs.existsSync.mockReturnValue(false);
			mockFs.readFileSync.mockReturnValue(
				JSON.stringify({ name: "some-package" }),
			);
			mockDotenv.config.mockReturnValue({ parsed: {} });

			const result = loadEnv(rootDir, filename, filePath);

			expect(result).toBe(expectedPath);
			expect(mockDotenv.config).toHaveBeenCalledWith({
				path: expectedPath,
				override: false,
			});
		});

		it("should load env file with custom nodeEnv", () => {
			const rootDir = "/test/root";
			const filename = ".env";
			const nodeEnv = "production";
			const expectedPath = path.join(rootDir, `${filename}.${nodeEnv}`);

			mockFs.existsSync.mockReturnValue(true);
			mockDotenv.config.mockReturnValue({ parsed: {} });

			const result = loadEnv(rootDir, filename, undefined, nodeEnv);

			expect(result).toBe(expectedPath);
			expect(mockDotenv.config).toHaveBeenCalledWith({
				path: expectedPath,
				override: false,
			});
		});

		it("should load env file with override set to true", () => {
			const rootDir = "/test/root";
			const expectedPath = path.join(rootDir, ".env.development");

			mockFs.existsSync.mockReturnValue(true);
			mockDotenv.config.mockReturnValue({ parsed: {} });

			const result = loadEnv(rootDir, undefined, undefined, undefined, true);

			expect(result).toBe(expectedPath);
			expect(mockDotenv.config).toHaveBeenCalledWith({
				path: expectedPath,
				override: true,
			});
		});

		it("should load env file with all parameters provided", () => {
			const rootDir = "/test/root";
			const filename = "custom.env";
			const filePath = "/fallback/path";
			const nodeEnv = "staging";
			const override = true;
			const expectedPath = path.join(rootDir, `${filename}.${nodeEnv}`);

			mockFs.existsSync.mockReturnValue(true);
			mockDotenv.config.mockReturnValue({ parsed: {} });

			const result = loadEnv(rootDir, filename, filePath, nodeEnv, override);

			expect(result).toBe(expectedPath);
			expect(mockDotenv.config).toHaveBeenCalledWith({
				path: expectedPath,
				override: true,
			});
		});

		it("should return the resolved env path", () => {
			const rootDir = "/test/root";
			const filename = ".env";
			const nodeEnv = "test";
			const expectedPath = path.join(rootDir, `${filename}.${nodeEnv}`);

			mockFs.existsSync.mockReturnValue(true);
			mockDotenv.config.mockReturnValue({ parsed: {} });

			const result = loadEnv(rootDir, filename, undefined, nodeEnv);

			expect(typeof result).toBe("string");
			expect(result).toBe(expectedPath);
		});
	});
});

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

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getEnv, getEnvFile, loadEnv } from "../env.js";

describe("env integration tests", () => {
	let tempDir: string;
	let originalEnv: NodeJS.ProcessEnv;
	let originalCwd: string;

	beforeEach(() => {
		// Save original environment and working directory
		originalEnv = { ...process.env };
		originalCwd = process.cwd();

		// Create temporary directory for testing
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dotenv-test-"));

		// Change to temp directory
		process.chdir(tempDir);
	});

	afterEach(() => {
		// Restore original environment and working directory
		process.env = originalEnv;
		process.chdir(originalCwd);

		// Clean up temp directory
		try {
			fs.rmSync(tempDir, { recursive: true, force: true });
		} catch (error) {
			// Ignore cleanup errors
		}
	});

	describe("getEnv integration", () => {
		// Tests the getEnv function with real environment variables
		// to ensure it properly reads and cleans NODE_ENV values

		it("should return 'development' when NODE_ENV is not set", () => {
			// Testing the default behavior when NODE_ENV environment variable is undefined
			delete process.env.NODE_ENV;
			expect(getEnv()).toBe("development");
		});

		it("should return cleaned NODE_ENV when set to 'production'", () => {
			// Testing that valid NODE_ENV values are returned unchanged
			process.env.NODE_ENV = "production";
			expect(getEnv()).toBe("production");
		});

		it("should remove non-word characters from NODE_ENV", () => {
			// Testing the regex cleaning functionality that removes non-word characters
			// except underscores (which are word characters in regex)
			process.env.NODE_ENV = "test-env_123";
			expect(getEnv()).toBe("testenv_123");
		});

		it("should handle NODE_ENV with spaces", () => {
			// Testing that spaces are treated as non-word characters and removed
			process.env.NODE_ENV = "test env";
			expect(getEnv()).toBe("testenv");
		});

		it("should handle NODE_ENV with special characters", () => {
			// Testing removal of various special characters from NODE_ENV
			process.env.NODE_ENV = "test@#$%env";
			expect(getEnv()).toBe("testenv");
		});

		it("should handle empty NODE_ENV string", () => {
			// Testing edge case where NODE_ENV is set to an empty string
			process.env.NODE_ENV = "";
			expect(getEnv()).toBe("development");
		});
	});

	describe("getEnvFile integration", () => {
		// Tests the getEnvFile function with real file system operations
		// to ensure it correctly locates .env files in directory hierarchies

		it("should return path when .env file exists in current directory", () => {
			// Testing basic functionality: finding .env file in specified root directory
			const envFile = ".env.test";
			const envPath = path.join(tempDir, envFile);
			fs.writeFileSync(envPath, "TEST_VAR=test_value");

			process.env.NODE_ENV = "test";

			const result = getEnvFile(tempDir, ".env", undefined, "test");
			expect(result).toBe(envPath);
		});

		it("should search up directories when file not found in rootDir", () => {
			// Testing directory traversal: searching parent directories for .env file
			const subDir = path.join(tempDir, "subdir");
			fs.mkdirSync(subDir);
			process.chdir(subDir);

			const envFile = ".env.test";
			const envPath = path.join(tempDir, envFile);
			fs.writeFileSync(envPath, "TEST_VAR=test_value");

			process.env.NODE_ENV = "test";

			const result = getEnvFile(subDir, ".env", undefined, "test");
			expect(result).toBe(envPath);
		});

		it("should stop searching when reaching workspace root package.json", () => {
			// Testing workspace boundary detection: stopping search at workspace root
			const subDir = path.join(tempDir, "subdir");
			fs.mkdirSync(subDir);
			process.chdir(subDir);

			const pkgJsonPath = path.join(subDir, "package.json");
			fs.writeFileSync(
				pkgJsonPath,
				JSON.stringify({ name: "@prosopo/captcha-private" }),
			);

			process.env.NODE_ENV = "test";

			// Should return fallback path since workspace root is found
			const result = getEnvFile(subDir, ".env", tempDir, "test");
			const expectedPath = path.join(subDir, ".env.test");
			expect(result).toBe(expectedPath);
		});

		it("should stop searching after 10 levels", () => {
			// Testing search depth limit: ensuring search doesn't go infinitely up
			let currentDir = tempDir;
			for (let i = 0; i < 12; i++) {
				currentDir = path.join(currentDir, `level${i}`);
				fs.mkdirSync(currentDir);
			}
			process.chdir(currentDir);

			process.env.NODE_ENV = "test";

			// Should return fallback path after hitting 10 level limit
			const result = getEnvFile(currentDir, ".env", tempDir, "test");
			const expectedPath = path.join(currentDir, ".env.test");
			expect(result).toBe(expectedPath);
		});

		it("should use default filename when not provided", () => {
			// Testing default parameter handling for filename
			const envFile = ".env.development";
			const envPath = path.join(tempDir, envFile);
			fs.writeFileSync(envPath, "TEST_VAR=test_value");

			delete process.env.NODE_ENV;

			const result = getEnvFile(tempDir);
			expect(result).toBe(envPath);
		});

		it("should use getEnv() when nodeEnv not provided", () => {
			// Testing automatic environment detection using getEnv() function
			const envFile = ".env.production";
			const envPath = path.join(tempDir, envFile);
			fs.writeFileSync(envPath, "TEST_VAR=test_value");

			process.env.NODE_ENV = "production";

			const result = getEnvFile(tempDir, ".env");
			expect(result).toBe(envPath);
		});

		it("should return fallback path when file not found anywhere", () => {
			// Testing fallback behavior when no .env file is found in search path
			process.env.NODE_ENV = "test";

			const result = getEnvFile(tempDir, ".env", tempDir, "test");
			const expectedPath = path.join(tempDir, ".env.test");
			expect(result).toBe(expectedPath);
		});
	});

	describe("loadEnv integration", () => {
		// Tests the loadEnv function with real file system operations
		// to ensure it correctly loads environment variables from .env files

		it("should load environment variables from .env file", () => {
			// Testing basic env file loading functionality with real files
			const envFile = ".env.development";
			const envPath = path.join(tempDir, envFile);
			const envContent = "TEST_VAR=test_value\nANOTHER_VAR=another_value\n";
			fs.writeFileSync(envPath, envContent);

			delete process.env.NODE_ENV;

			// Load the env file and verify the returned path
			const result = loadEnv(tempDir);
			expect(result).toBe(envPath);

			// Note: We test the file path resolution logic here.
			// Actual dotenv loading behavior is tested indirectly through path correctness.
		});

		it("should load env file with custom filename", () => {
			// Testing custom filename parameter for env file loading
			const envFile = "custom.env.development";
			const envPath = path.join(tempDir, envFile);
			const envContent = "CUSTOM_VAR=custom_value\n";
			fs.writeFileSync(envPath, envContent);

			delete process.env.NODE_ENV;

			const result = loadEnv(tempDir, "custom.env");
			expect(result).toBe(envPath);
		});

		it("should load env file with custom nodeEnv", () => {
			// Testing custom environment override parameter
			const envFile = ".env.production";
			const envPath = path.join(tempDir, envFile);
			const envContent = "PROD_VAR=prod_value\n";
			fs.writeFileSync(envPath, envContent);

			const result = loadEnv(tempDir, ".env", undefined, "production");
			expect(result).toBe(envPath);
		});

		it("should load env file with all custom parameters", () => {
			// Testing all parameters together: rootDir, filename, filePath, nodeEnv
			const envFile = "my.custom.env.staging";
			const envPath = path.join(tempDir, envFile);
			const envContent = "STAGING_VAR=staging_value\n";
			fs.writeFileSync(envPath, envContent);

			const result = loadEnv(tempDir, "my.custom.env", undefined, "staging");
			expect(result).toBe(envPath);
		});

		it("should handle missing env files gracefully", () => {
			// Testing error handling when env files don't exist
			delete process.env.NODE_ENV;

			// Should not throw error, but return the expected path for missing file
			const result = loadEnv(tempDir);
			const expectedPath = path.join(tempDir, ".env.development");
			expect(result).toBe(expectedPath);
		});
	});
});
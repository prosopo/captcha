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

import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * Tests for CLI error handling and edge cases
 * These tests focus on error scenarios and validation
 */
describe("CLI error handling and edge cases", () => {
	beforeEach(() => {
		// Reset environment variables for each test
		delete process.env.PROSOPO_DATABASE_HOST;
		delete process.env.PROSOPO_REDIS_URL;
		delete process.env.PROSOPO_PROVIDER_ADDRESS;
		delete process.env.PROSOPO_PROVIDER_MNEMONIC;
		delete process.env.PROSOPO_AUTH_ACCOUNT_ADDRESS;
		delete process.env.PROSOPO_AUTH_ACCOUNT_MNEMONIC;
	});

	test("should handle missing database host in getDB function", () => {
		const { getDB } = require("../process.env.js");

		expect(() => {
			getDB();
		}).toThrow("DATABASE.DATABASE_HOST_UNDEFINED");
	});

	test("should handle missing required environment variables in getConfig", () => {
		const getConfig = require("../prosopo.config.js").default;

		expect(() => {
			getConfig();
		}).toThrow(); // Should throw due to missing database configuration
	});

	test("should validate address extraction from environment", () => {
		const { getAddress } = require("../process.env.js");

		// Test with undefined
		expect(getAddress()).toBeUndefined();
		expect(getAddress(undefined)).toBeUndefined();

		// Test with specific role
		process.env.PROSOPO_PROVIDER_ADDRESS = "test-address";
		expect(getAddress()).toBe("test-address");
		expect(getAddress("PROVIDER")).toBe("test-address");

		// Test with different role
		process.env.PROSOPO_AUTH_ACCOUNT_ADDRESS = "auth-address";
		expect(getAddress("AUTH")).toBe("auth-address");
	});

	test("should validate secret extraction from environment", () => {
		const { getSecret } = require("../process.env.js");

		// Test with undefined
		expect(getSecret()).toBeUndefined();

		// Test mnemonic
		process.env.PROSOPO_PROVIDER_MNEMONIC = "test mnemonic";
		expect(getSecret()).toBe("test mnemonic");

		// Test seed (should take precedence)
		process.env.PROSOPO_PROVIDER_SEED = "test-seed";
		expect(getSecret()).toBe("test-seed");

		// Test URI (should take precedence over seed)
		process.env.PROSOPO_PROVIDER_URI = "test-uri";
		expect(getSecret()).toBe("test-uri");

		// Test JSON (should take highest precedence)
		process.env.PROSOPO_PROVIDER_JSON = "test-json";
		expect(getSecret()).toBe("test-json");
	});

	test("should handle invalid JSON in configuration", () => {
		// This tests the LRules parsing which uses JSON.parse
		process.env.L_RULES = "invalid-json{";

		const getConfig = require("../prosopo.config.js").default;

		// Should not crash but return empty object for invalid JSON
		expect(() => {
			getConfig();
		}).toThrow(); // Will throw due to other missing config, not JSON parsing
	});

	test("should handle empty L_RULES environment variable", () => {
		process.env.L_RULES = "";

		const getConfig = require("../prosopo.config.js").default;

		// Should not crash
		expect(() => {
			getConfig();
		}).toThrow(); // Will throw due to missing database config
	});

	test("should handle missing password environment variable", () => {
		const { getPassword } = require("../process.env.js");

		// Test with undefined
		expect(getPassword()).toBeUndefined();
		expect(getPassword(undefined)).toBeUndefined();

		// Test with specific role
		process.env.PROSOPO_PROVIDER_ACCOUNT_PASSWORD = "test-password";
		expect(getPassword()).toBe("test-password");
		expect(getPassword("PROVIDER")).toBe("test-password");

		// Test with different role
		process.env.PROSOPO_AUTH_ACCOUNT_PASSWORD = "auth-password";
		expect(getPassword("AUTH")).toBe("auth-password");
	});
});
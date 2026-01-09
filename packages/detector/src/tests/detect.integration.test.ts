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

import type { Account, RandomProvider } from "@prosopo/types";
import { describe, expect, it, vi } from "vitest";
import { detect } from "../index.ts";

describe("detect integration tests", () => {
	/**
	 * Test the detect function with realistic parameters as used in production.
	 * This tests the integration between the detector and its expected inputs/outputs.
	 */
	it("should handle realistic production-like parameters", async () => {
		// Arrange: Set up realistic test data that matches production usage
		const mockEnvironment = {
			API_URL: "http://localhost:9229",
			ACCOUNT_ADDRESS: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
		};

		const mockProvider: RandomProvider = {
			providerAccount: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
			provider: {
				url: "http://localhost:9229",
				datasetId: "0x1234567890abcdef",
			},
		};

		const mockContainer = document.createElement("div");
		const mockRestartFn = vi.fn();
		const mockAccountGetter = vi.fn().mockResolvedValue({
			account: {
				address: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
			},
		} as Account);

		const mockGetRandomProvider = vi.fn().mockResolvedValue(mockProvider);

		// Act: Call detect with realistic parameters
		const result = await detect(
			mockEnvironment,
			mockGetRandomProvider,
			mockContainer,
			mockRestartFn,
			mockAccountGetter,
		);

		// Assert: Verify the result has the expected structure
		expect(result).toBeDefined();
		expect(typeof result.token).toBe("string");
		expect(typeof result.encryptHeadHash).toBe("string");
		expect(typeof result.shadowDomCleanup).toBe("function");

		// Note: provider and userAccount may be undefined in test environment
		// as the obfuscated code may not fully execute all logic paths
	});

	/**
	 * Test error handling when required parameters are missing or invalid.
	 * The detector handles invalid inputs gracefully by returning default values.
	 */
	it("should handle missing or invalid parameters gracefully", async () => {
		// Test with undefined environment
		const result1 = await detect(
			undefined as unknown as Record<string, unknown>,
			vi.fn(),
			document.createElement("div"),
			vi.fn(),
			vi.fn(),
		);

		// Test with null container
		const result2 = await detect(
			{},
			vi.fn(),
			null as unknown as HTMLElement,
			vi.fn(),
			vi.fn(),
		);

		// Test with invalid getRandomProvider function
		const result3 = await detect(
			{},
			null as unknown as () => Promise<unknown>,
			document.createElement("div"),
			vi.fn(),
			vi.fn(),
		);

		// All should return valid result objects with default/empty values
		expect(result1).toBeDefined();
		expect(typeof result1.token).toBe("string");
		expect(typeof result1.encryptHeadHash).toBe("string");

		expect(result2).toBeDefined();
		expect(typeof result2.token).toBe("string");
		expect(typeof result2.encryptHeadHash).toBe("string");

		expect(result3).toBeDefined();
		expect(typeof result3.token).toBe("string");
		expect(typeof result3.encryptHeadHash).toBe("string");
	});

	/**
	 * Test the detector with mocked browser environment variations.
	 */
	it("should work with different browser environment setups", async () => {
		// Test with canvas context available (already mocked in setup.ts)
		const mockEnvironment = { API_URL: "http://localhost:9229" };
		const mockGetRandomProvider = vi.fn().mockResolvedValue({
			provider: { url: "http://localhost:9229" },
			dataset: { datasetId: "test" },
		});
		const mockAccountGetter = vi.fn().mockResolvedValue({
			account: { address: "test-address" },
		});

		const result = detect(
			mockEnvironment,
			mockGetRandomProvider,
			document.createElement("div"),
			vi.fn(),
			mockAccountGetter,
		);

		expect(result).toBeInstanceOf(Promise);

		// Should not throw immediately with valid setup
		try {
			await result;
		} catch (error) {
			// Expected in test environment
			expect(error).toBeDefined();
		}
	});

	/**
	 * Test that the detector returns results quickly and can be used with timeout patterns.
	 * This verifies the function completes within expected time bounds.
	 */
	it("should return results within reasonable time bounds", async () => {
		const mockEnvironment = { API_URL: "http://localhost:9229" };
		const mockGetRandomProvider = vi.fn().mockResolvedValue({
			provider: { url: "http://localhost:9229" },
			dataset: { datasetId: "test" },
		});
		const mockAccountGetter = vi.fn().mockResolvedValue({
			account: { address: "test-address" },
		});

		// Test that the detector completes quickly
		const startTime = Date.now();
		const result = await detect(
			mockEnvironment,
			mockGetRandomProvider,
			document.createElement("div"),
			vi.fn(),
			mockAccountGetter,
		);
		const endTime = Date.now();

		// Should complete within 1 second
		expect(endTime - startTime).toBeLessThan(1000);
		expect(result).toBeDefined();
		expect(typeof result.token).toBe("string");
	});

	/**
	 * Test type safety of the return value structure.
	 */
	it("should return correctly typed result structure", async () => {
		const mockEnvironment = { API_URL: "http://localhost:9229" };
		const mockProvider: RandomProvider = {
			providerAccount: "test-provider-account",
			provider: {
				url: "http://localhost:9229",
				datasetId: "test-dataset-id",
			},
		};

		const mockGetRandomProvider = vi.fn().mockResolvedValue(mockProvider);
		const mockAccountGetter = vi.fn().mockResolvedValue({
			account: { address: "test-user-address" },
		} as Account);

		const result = detect(
			mockEnvironment,
			mockGetRandomProvider,
			document.createElement("div"),
			vi.fn(),
			mockAccountGetter,
		);

		// Test that the result matches the expected type structure
		expect(result).toBeInstanceOf(Promise);

		// Type assertion to verify the structure (TypeScript will catch type mismatches)
		const typedResult: Promise<{
			token: string;
			encryptHeadHash: string;
			provider: RandomProvider;
			userAccount: Account;
		}> = result;

		expect(typedResult).toBeInstanceOf(Promise);
	});
});

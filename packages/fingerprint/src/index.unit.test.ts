// Copyright 2021-2025 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the @fingerprintjs/fingerprintjs module before importing the module under test
const mockGet = vi.fn();
const mockLoad = vi.fn();

vi.mock("@fingerprintjs/fingerprintjs", () => {
	const mockFingerprintJS = {
		load: mockLoad,
	};
	return {
		default: mockFingerprintJS,
	};
});

describe("getFingerprint", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset module cache to ensure fresh imports
		vi.resetModules();
	});

	/**
	 * Test the happy path: successful fingerprint generation
	 * Verifies that getFingerprint returns the visitorId from the fingerprint library
	 * and that both load() and get() methods are called as expected
	 */
	it("should return visitorId when fingerprint is successfully generated", async () => {
		const expectedVisitorId = "test-visitor-id-12345";
		mockGet.mockResolvedValue({
			visitorId: expectedVisitorId,
		});
		mockLoad.mockResolvedValue({
			get: mockGet,
		});

		const { getFingerprint } = await import("./index.js");
		const result = await getFingerprint();

		expect(result).toBe(expectedVisitorId);
		expect(mockLoad).toHaveBeenCalled();
		expect(mockGet).toHaveBeenCalled();
	});

	/**
	 * Test that getFingerprint handles various visitorId formats correctly
	 * This ensures the function works with different types of fingerprint strings
	 * that the underlying library might return
	 */
	it("should handle different visitorId formats", async () => {
		const testCases = [
			"abc123def456",
			"1234567890",
			"visitor-id-with-dashes",
			"UPPERCASE_ID",
			"mixedCase123",
		];

		for (const visitorId of testCases) {
			vi.resetModules();
			mockGet.mockResolvedValueOnce({
				visitorId,
			});
			mockLoad.mockResolvedValueOnce({
				get: mockGet,
			});

			const { getFingerprint } = await import("./index.js");
			const result = await getFingerprint();

			expect(result).toBe(visitorId);
		}
	});

	/**
	 * Test error handling when FingerprintJS library fails to load
	 * This covers the case where browser environment doesn't support fingerprinting
	 * or when the library encounters an initialization error
	 */
	it("should propagate error when FingerprintJS.load() fails", async () => {
		const loadError = new Error("Failed to load FingerprintJS");
		mockLoad.mockRejectedValueOnce(loadError);

		const { getFingerprint } = await import("./index.js");

		await expect(getFingerprint()).rejects.toThrow(
			"Failed to load FingerprintJS",
		);
		expect(mockLoad).toHaveBeenCalled();
		expect(mockGet).not.toHaveBeenCalled();
	});

	/**
	 * Test error handling when fingerprint generation fails after successful loading
	 * This covers cases where the browser blocks fingerprinting or encounters
	 * runtime errors during fingerprint calculation
	 */
	it("should propagate error when fp.get() fails", async () => {
		const getError = new Error("Failed to get fingerprint");
		mockGet.mockRejectedValueOnce(getError);
		mockLoad.mockResolvedValueOnce({
			get: mockGet,
		});

		const { getFingerprint } = await import("./index.js");

		await expect(getFingerprint()).rejects.toThrow("Failed to get fingerprint");
		expect(mockLoad).toHaveBeenCalled();
		expect(mockGet).toHaveBeenCalled();
	});

	/**
	 * Test edge case where fingerprint library returns an object without visitorId
	 * This handles potential API changes in the underlying library or
	 * cases where fingerprinting is blocked/disabled
	 */
	it("should handle result without visitorId property", async () => {
		mockGet.mockResolvedValueOnce({
			// Missing visitorId property
		});
		mockLoad.mockResolvedValueOnce({
			get: mockGet,
		});

		const { getFingerprint } = await import("./index.js");
		const result = await getFingerprint();

		expect(result).toBeUndefined();
		expect(mockLoad).toHaveBeenCalled();
		expect(mockGet).toHaveBeenCalled();
	});

	/**
	 * Test edge case where fingerprint library returns an empty string
	 * This ensures the function correctly handles and returns empty fingerprints
	 * rather than treating them as missing values
	 */
	it("should handle empty string visitorId", async () => {
		mockGet.mockResolvedValueOnce({
			visitorId: "",
		});
		mockLoad.mockResolvedValueOnce({
			get: mockGet,
		});

		const { getFingerprint } = await import("./index.js");
		const result = await getFingerprint();

		expect(result).toBe("");
		expect(mockLoad).toHaveBeenCalled();
		expect(mockGet).toHaveBeenCalled();
	});
});

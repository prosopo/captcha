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

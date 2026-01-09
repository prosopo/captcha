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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchWithETag } from "../fetchWithEtag.js";

describe("fetchWithETag", () => {
	const originalFetch = global.fetch;
	let mockFetch: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockFetch = vi.fn();
		global.fetch = mockFetch;
	});

	afterEach(() => {
		global.fetch = originalFetch;
		vi.restoreAllMocks();
	});

	it("should make request without If-None-Match header when etag is null", async () => {
		const mockResponse = {
			ok: true,
			status: 200,
			headers: {
				get: vi.fn().mockReturnValue('"new-etag"'),
			},
			text: vi.fn().mockResolvedValue("response content"),
		};
		mockFetch.mockResolvedValue(mockResponse);

		const result = await fetchWithETag("https://example.com", null);

		expect(mockFetch).toHaveBeenCalledWith("https://example.com", {
			method: "GET",
			headers: {},
		});
		expect(result).toEqual({
			content: "response content",
			etag: "new-etag",
			notModified: false,
		});
	});

	it("should include If-None-Match header when etag is provided", async () => {
		const mockResponse = {
			ok: true,
			status: 200,
			headers: {
				get: vi.fn().mockReturnValue('"new-etag"'),
			},
			text: vi.fn().mockResolvedValue("response content"),
		};
		mockFetch.mockResolvedValue(mockResponse);

		const result = await fetchWithETag("https://example.com", "old-etag");

		expect(mockFetch).toHaveBeenCalledWith("https://example.com", {
			method: "GET",
			headers: {
				"If-None-Match": "old-etag",
			},
		});
		expect(result).toEqual({
			content: "response content",
			etag: "new-etag",
			notModified: false,
		});
	});

	it("should handle 304 Not Modified response", async () => {
		const mockResponse = {
			ok: false, // 304 is not ok, but we handle it specially
			status: 304,
			headers: {
				get: vi.fn().mockReturnValue(null),
			},
			text: vi.fn().mockResolvedValue(""),
		};
		mockFetch.mockResolvedValue(mockResponse);

		const result = await fetchWithETag("https://example.com", "cached-etag");

		expect(result).toEqual({
			content: null,
			etag: null,
			notModified: true,
		});
	});

	it("should remove quotes from etag header", async () => {
		const mockResponse = {
			ok: true,
			status: 200,
			headers: {
				get: vi.fn().mockReturnValue('"etag-with-quotes"'),
			},
			text: vi.fn().mockResolvedValue("content"),
		};
		mockFetch.mockResolvedValue(mockResponse);

		const result = await fetchWithETag("https://example.com", null);

		expect(result.etag).toBe("etag-with-quotes");
	});

	it("should handle missing etag header", async () => {
		const mockResponse = {
			ok: true,
			status: 200,
			headers: {
				get: vi.fn().mockReturnValue(null),
			},
			text: vi.fn().mockResolvedValue("content"),
		};
		mockFetch.mockResolvedValue(mockResponse);

		const result = await fetchWithETag("https://example.com", null);

		expect(result.etag).toBe(null);
	});

	it("should throw error on HTTP error responses", async () => {
		const mockResponse = {
			ok: false,
			status: 404,
			headers: {
				get: vi.fn(),
			},
			text: vi.fn().mockResolvedValue("Not Found"),
		};
		mockFetch.mockResolvedValue(mockResponse);

		await expect(fetchWithETag("https://example.com", null)).rejects.toThrow(
			"HTTP error! status: 404"
		);
	});

	it("should throw error when fetch fails", async () => {
		const error = new Error("Network error");
		mockFetch.mockRejectedValue(error);

		await expect(fetchWithETag("https://example.com", null)).rejects.toThrow(
			"Fetch error: Error: Network error"
		);
	});

	it("should handle different content types", async () => {
		const mockResponse = {
			ok: true,
			status: 200,
			headers: {
				get: vi.fn().mockReturnValue('"etag"'),
			},
			text: vi.fn().mockResolvedValue('{"key": "value"}'),
		};
		mockFetch.mockResolvedValue(mockResponse);

		const result = await fetchWithETag("https://api.example.com/data", null);

		expect(result.content).toBe('{"key": "value"}');
		expect(result.etag).toBe("etag");
		expect(result.notModified).toBe(false);
	});

	it("should handle empty response content", async () => {
		const mockResponse = {
			ok: true,
			status: 200,
			headers: {
				get: vi.fn().mockReturnValue('"etag"'),
			},
			text: vi.fn().mockResolvedValue(""),
		};
		mockFetch.mockResolvedValue(mockResponse);

		const result = await fetchWithETag("https://example.com", null);

		expect(result.content).toBe("");
		expect(result.etag).toBe("etag");
		expect(result.notModified).toBe(false);
	});
});
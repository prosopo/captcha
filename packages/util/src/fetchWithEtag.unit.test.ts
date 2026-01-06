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
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fetchWithETag } from "./fetchWithEtag.js";

describe("fetchWithETag", () => {
	test("types", () => {
		// check the types are picked up correctly by ts
		// Note: This is a type-only test, actual implementation is async
		type FetchResult = {
			content: string | null;
			etag: string | null;
			notModified: boolean;
		};

		// This will fail at compile time if return type doesn't match
		const _resultType: FetchResult = {} as Awaited<
			ReturnType<typeof fetchWithETag>
		>;
	});

	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn());
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	test("fetches content without etag", async () => {
		const mockResponse = {
			status: 200,
			ok: true,
			headers: new Headers({
				etag: '"abc123"',
			}),
			text: vi.fn().mockResolvedValue("test content"),
		};

		vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

		const result = await fetchWithETag("https://example.com", null);

		expect(fetch).toHaveBeenCalledWith("https://example.com", {
			method: "GET",
			headers: {},
		});
		expect(result).toEqual({
			content: "test content",
			etag: "abc123",
			notModified: false,
		});
	});

	test("fetches content with etag", async () => {
		const mockResponse = {
			status: 200,
			ok: true,
			headers: new Headers({
				etag: '"def456"',
			}),
			text: vi.fn().mockResolvedValue("new content"),
		};

		vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

		const result = await fetchWithETag("https://example.com", "abc123");

		expect(fetch).toHaveBeenCalledWith("https://example.com", {
			method: "GET",
			headers: {
				"If-None-Match": "abc123",
			},
		});
		expect(result).toEqual({
			content: "new content",
			etag: "def456",
			notModified: false,
		});
	});

	test("returns notModified when status is 304", async () => {
		const mockResponse = {
			status: 304,
			ok: true,
			headers: new Headers(),
		};

		vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

		const result = await fetchWithETag("https://example.com", "abc123");

		expect(result).toEqual({
			content: null,
			etag: null,
			notModified: true,
		});
	});

	test("removes quotes from etag", async () => {
		const mockResponse = {
			status: 200,
			ok: true,
			headers: new Headers({
				etag: '"quoted-etag"',
			}),
			text: vi.fn().mockResolvedValue("content"),
		};

		vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

		const result = await fetchWithETag("https://example.com", null);

		expect(result.etag).toBe("quoted-etag");
	});

	test("handles etag without quotes", async () => {
		const mockResponse = {
			status: 200,
			ok: true,
			headers: new Headers({
				etag: "unquoted-etag",
			}),
			text: vi.fn().mockResolvedValue("content"),
		};

		vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

		const result = await fetchWithETag("https://example.com", null);

		expect(result.etag).toBe("unquoted-etag");
	});

	test("handles missing etag header", async () => {
		const mockResponse = {
			status: 200,
			ok: true,
			headers: new Headers(),
			text: vi.fn().mockResolvedValue("content"),
		};

		vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

		const result = await fetchWithETag("https://example.com", null);

		expect(result.etag).toBe(null);
	});

	test("throws error when response is not ok", async () => {
		const mockResponse = {
			status: 404,
			ok: false,
			headers: new Headers(),
		};

		vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

		await expect(fetchWithETag("https://example.com", null)).rejects.toThrow(
			"HTTP error! status: 404",
		);
	});

	test("throws error when response is 500", async () => {
		const mockResponse = {
			status: 500,
			ok: false,
			headers: new Headers(),
		};

		vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

		await expect(fetchWithETag("https://example.com", null)).rejects.toThrow(
			"HTTP error! status: 500",
		);
	});

	test("handles fetch network errors", async () => {
		const networkError = new Error("Network error");
		vi.mocked(fetch).mockRejectedValue(networkError);

		await expect(fetchWithETag("https://example.com", null)).rejects.toThrow(
			"Fetch error: Error: Network error",
		);
	});

	test("handles multiple quote types in etag", async () => {
		const mockResponse = {
			status: 200,
			ok: true,
			headers: new Headers({
				etag: '"etag-with-"quotes"-inside"',
			}),
			text: vi.fn().mockResolvedValue("content"),
		};

		vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

		const result = await fetchWithETag("https://example.com", null);

		// Should remove all quotes
		expect(result.etag).toBe("etag-with-quotes-inside");
	});
});

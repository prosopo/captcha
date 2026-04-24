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
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cacheFile } from "../cacheFile.js";
import * as cacheFileModule from "../cacheFile.js";
import * as fetchModule from "../fetchWithEtag.js";

// Helper function to create a ReadableStream from a string
function stringToStream(content: string): ReadableStream<Uint8Array> {
	return new ReadableStream({
		start(controller) {
			const encoder = new TextEncoder();
			const chunk = encoder.encode(content);
			controller.enqueue(chunk);
			controller.close();
		},
	});
}

describe("cacheFile", () => {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);
	const testCacheDir = path.join(__dirname, "test-cache");
	const testUrl = "https://example.com/data.txt";
	const filePrefix = "test-file-";
	const fileType = ".txt" as const;
	const mockLogger = {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	};
	beforeEach(() => {
		if (fs.existsSync(testCacheDir)) {
			fs.rmSync(testCacheDir, { recursive: true, force: true });
		}
		vi.clearAllMocks();
	});
	afterEach(() => {
		if (fs.existsSync(testCacheDir)) {
			fs.rmSync(testCacheDir, { recursive: true, force: true });
		}
		vi.restoreAllMocks();
	});
	describe("ETag handling", () => {
		beforeEach(() => {
			if (!fs.existsSync(testCacheDir)) {
				fs.mkdirSync(testCacheDir, { recursive: true });
			}
		});
		it("should correctly round-trip weak ETags through cache cycle", async () => {
			const content = "test content";
			const weakETag = 'W/"abc123"';
			const mock = vi.spyOn(fetchModule, "fetchWithETag");
			mock.mockResolvedValueOnce({
				stream: stringToStream(content),
				etag: weakETag,
				notModified: false,
			});
			mock.mockResolvedValueOnce({
				stream: null,
				etag: null,
				notModified: true,
			});
			await cacheFile(testCacheDir, testUrl, mockLogger, filePrefix, fileType);
			await cacheFile(testCacheDir, testUrl, mockLogger, filePrefix, fileType);
			expect(mock).toHaveBeenNthCalledWith(2, testUrl, 'W/"abc123"');
		});
		it("should correctly round-trip strong ETags through cache cycle", async () => {
			const content = "test content";
			const strongETag = '"abc123"';
			const mock = vi.spyOn(fetchModule, "fetchWithETag");
			mock.mockResolvedValueOnce({
				stream: stringToStream(content),
				etag: strongETag,
				notModified: false,
			});
			mock.mockResolvedValueOnce({
				stream: null,
				etag: null,
				notModified: true,
			});
			await cacheFile(testCacheDir, testUrl, mockLogger, filePrefix, fileType);
			await cacheFile(testCacheDir, testUrl, mockLogger, filePrefix, fileType);
			expect(mock).toHaveBeenNthCalledWith(2, testUrl, '"abc123"');
		});

		it("should handle empty response body with valid ETag", async () => {
			const emptyContent = "";
			const etag = '"empty123"';

			vi.spyOn(fetchModule, "fetchWithETag").mockResolvedValue({
				stream: stringToStream(emptyContent),
				etag,
				notModified: false,
			});

			const filePath = await cacheFile(
				testCacheDir,
				testUrl,
				mockLogger,
				filePrefix,
				fileType,
			);

			expect(fs.existsSync(filePath)).toBe(true);
			expect(fs.readFileSync(filePath, "utf-8")).toBe("");
			expect(mockLogger.info).toHaveBeenCalledWith(expect.any(Function));
		});
	});
	describe("Last-Modified handling", () => {
		beforeEach(() => {
			if (!fs.existsSync(testCacheDir)) {
				fs.mkdirSync(testCacheDir, { recursive: true });
			}
		});
		it("should correctly round-trip Last-Modified through cache cycle", async () => {
			const content = "test content";
			const lastModified = "Sunday, 23-Mar-26 10:15:30 GMT"; // RFC 850 format to test lossless encoding
			// Mock ETag to return null so it falls back to Last-Modified
			vi.spyOn(fetchModule, "fetchWithETag").mockResolvedValue({
				stream: null,
				etag: null,
				notModified: false,
			});
			const spy = vi.spyOn(
				cacheFileModule.cacheFileUtils,
				"fetchWithLastModified",
			);
			spy.mockResolvedValueOnce({
				stream: stringToStream(content),
				lastModified,
				notModified: false,
			});
			spy.mockResolvedValueOnce({
				stream: null,
				lastModified: null,
				notModified: true,
			});
			await cacheFile(testCacheDir, testUrl, mockLogger, filePrefix, fileType);
			await cacheFile(testCacheDir, testUrl, mockLogger, filePrefix, fileType);
			expect(spy).toHaveBeenNthCalledWith(
				2,
				testUrl,
				"Sunday, 23-Mar-26 10:15:30 GMT",
			);
		});

		it("should handle empty response body with valid Last-Modified", async () => {
			const emptyContent = "";
			const lastModified = "Wed, 25 Mar 2026 11:19:09 GMT";

			// Mock ETag to return null so it falls back to Last-Modified
			vi.spyOn(fetchModule, "fetchWithETag").mockResolvedValue({
				stream: null,
				etag: null,
				notModified: false,
			});

			const spy = vi.spyOn(
				cacheFileModule.cacheFileUtils,
				"fetchWithLastModified",
			);
			spy.mockResolvedValue({
				stream: stringToStream(emptyContent),
				lastModified,
				notModified: false,
			});

			const filePath = await cacheFile(
				testCacheDir,
				testUrl,
				mockLogger,
				filePrefix,
				fileType,
			);

			expect(fs.existsSync(filePath)).toBe(true);
			expect(fs.readFileSync(filePath, "utf-8")).toBe("");
			expect(mockLogger.info).toHaveBeenCalledWith(expect.any(Function));
		});

		it("should fall back to Last-Modified when ETag is not available", async () => {
			const content = "test content";
			const lastModified = "Wed, 25 Mar 2026 11:19:09 GMT";

			// Mock ETag fetch to return no ETag
			vi.spyOn(fetchModule, "fetchWithETag").mockResolvedValue({
				stream: null,
				etag: null,
				notModified: false,
			});

			// Mock Last-Modified fetch to succeed
			const spy = vi.spyOn(
				cacheFileModule.cacheFileUtils,
				"fetchWithLastModified",
			);
			spy.mockResolvedValue({
				stream: stringToStream(content),
				lastModified,
				notModified: false,
			});

			const filePath = await cacheFile(
				testCacheDir,
				testUrl,
				mockLogger,
				filePrefix,
				fileType,
			);

			expect(fs.existsSync(filePath)).toBe(true);
			expect(fs.readFileSync(filePath, "utf-8")).toBe(content);
			expect(mockLogger.info).toHaveBeenCalledWith(expect.any(Function));
		});
	});
});

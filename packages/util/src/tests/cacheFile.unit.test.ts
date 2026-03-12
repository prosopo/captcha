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
import { cacheFile, getCurrentETag, saveFileWithETag } from "../cacheFile.js";
import * as fetchModule from "../fetchWithEtag.js";

vi.mock("../fetchWithEtag.js");

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
	});
	describe("ETag handling", () => {
		beforeEach(() => {
			if (!fs.existsSync(testCacheDir)) {
				fs.mkdirSync(testCacheDir, { recursive: true });
			}
		});
		it("should save and reconstruct weak ETags correctly", () => {
			const content = "test content";
			const weakETag = 'W/"abc123"';
			const filePath = saveFileWithETag(
				content,
				weakETag,
				testCacheDir,
				filePrefix,
				fileType,
			);
			expect(path.basename(filePath)).toBe("test-file-W_abc123.txt");
			const reconstructedETag = getCurrentETag(
				testCacheDir,
				filePrefix,
				fileType,
			);
			expect(reconstructedETag).toBe('W/"abc123"');
		});
		it("should save and reconstruct strong ETags correctly", () => {
			const content = "test content";
			const strongETag = '"abc123"';
			const filePath = saveFileWithETag(
				content,
				strongETag,
				testCacheDir,
				filePrefix,
				fileType,
			);
			expect(path.basename(filePath)).toBe("test-file-abc123.txt");
			const reconstructedETag = getCurrentETag(
				testCacheDir,
				filePrefix,
				fileType,
			);
			expect(reconstructedETag).toBe('"abc123"');
		});
		it("should correctly round-trip weak ETags through cache cycle", async () => {
			const content = "test content";
			const weakETag = 'W/"abc123"';
			vi.spyOn(fetchModule, "fetchWithETag").mockResolvedValue({
				content,
				etag: weakETag,
				notModified: false,
			});
			await cacheFile(testCacheDir, testUrl, mockLogger, filePrefix, fileType);
			const fetchSpy = vi
				.spyOn(fetchModule, "fetchWithETag")
				.mockResolvedValue({
					content: null,
					etag: null,
					notModified: true,
				});
			await cacheFile(testCacheDir, testUrl, mockLogger, filePrefix, fileType);
			expect(fetchSpy).toHaveBeenCalledWith(testUrl, 'W/"abc123"');
		});
		it("should correctly round-trip strong ETags through cache cycle", async () => {
			const content = "test content";
			const strongETag = '"abc123"';
			vi.spyOn(fetchModule, "fetchWithETag").mockResolvedValue({
				content,
				etag: strongETag,
				notModified: false,
			});
			await cacheFile(testCacheDir, testUrl, mockLogger, filePrefix, fileType);
			const fetchSpy = vi
				.spyOn(fetchModule, "fetchWithETag")
				.mockResolvedValue({
					content: null,
					etag: null,
					notModified: true,
				});
			await cacheFile(testCacheDir, testUrl, mockLogger, filePrefix, fileType);
			expect(fetchSpy).toHaveBeenCalledWith(testUrl, '"abc123"');
		});

		it("should handle empty response body with valid ETag", async () => {
			const emptyContent = "";
			const etag = '"empty123"';

			vi.spyOn(fetchModule, "fetchWithETag").mockResolvedValue({
				content: emptyContent,
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
});

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
import type { ReadableStream as streamWeb } from "node:stream/web";
import { fetchWithETag } from "./fetchWithEtag.js";

export const ensureDirExists = (cacheDir: string): void => {
	if (!fs.existsSync(cacheDir)) {
		fs.mkdirSync(cacheDir, { recursive: true });
	}
};

function sanitizeETagForFilename(etag: string): string {
	// Handle W/"etag" or "etag" format
	// Encode W/ prefix as W_ to preserve weak ETag indicator, remove quotes, replace invalid filename characters
	return etag
		.replace(/^W\//, "W_") // Encode W/ prefix as W_ to preserve weak ETag indicator
		.replace(/"/g, "") // Remove quotes
		.replace(/[/\\:*?"<>|]/g, "_"); // Replace invalid filename characters with underscore
}

function sanitizeLastModifiedForFilename(lastModified: string): string {
	// Convert Last-Modified date to a safe filename format
	// Input: "Wed, 25 Mar 2026 11:19:09 GMT"
	// Output: "Wed_25_Mar_2026_11_19_09_GMT"
	return lastModified
		.replace(/[,:\s]/g, "_") // Replace commas, colons, and spaces with underscores
		.replace(/__/g, "_"); // Remove double underscores
}

function isLastModifiedFilename(filename: string): boolean {
	return filename.match(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)_/) !== null;
}

function reconstructETagFromFilename(
	filename: string,
	filePrefix: string,
	fileType: `.${string}` = ".txt",
): string {
	// Extract sanitized etag from filename and reconstruct original format
	const sanitizedETag = filename.replace(filePrefix, "").replace(fileType, "");

	// The sanitized ETag had W/ replaced with W_, so reverse that
	// and handle the case where it was just a quoted etag without W/
	if (sanitizedETag.startsWith("W_")) {
		return `W/"${sanitizedETag.substring(2)}"`;
	}
	return `"${sanitizedETag}"`;
}

function reconstructLastModifiedFromFilename(
	filename: string,
	filePrefix: string,
	fileType: `.${string}` = ".txt",
): string {
	// Extract sanitized lastModified from filename and reconstruct original format
	const sanitizedLastModified = filename
		.replace(filePrefix, "")
		.replace(fileType, "");

	// Convert back from "Wed_25_Mar_2026_11_19_09_GMT" to "Wed, 25 Mar 2026 11:19:09 GMT"
	const parts = sanitizedLastModified.split("_");
	if (parts.length >= 7) {
		const [day, date, month, year, hour, minute, second, ...rest] = parts;
		const tz = rest.join("_"); // GMT or similar
		return `${day}, ${date} ${month} ${year} ${hour}:${minute}:${second} ${tz}`;
	}
	return sanitizedLastModified; // Fallback
}

export function purgeOldCache(
	cacheDir: string,
	filePrefix: string,
	fileType: `.${string}` = ".txt",
): void {
	if (!fs.existsSync(cacheDir)) {
		return;
	}

	const files = fs.readdirSync(cacheDir);
	for (const file of files) {
		if (file.startsWith(filePrefix) && file.endsWith(fileType)) {
			fs.unlinkSync(path.join(cacheDir, file));
		}
	}
}

export function getCurrentETag(
	cacheDir: string,
	filePrefix: string,
	fileType: `.${string}` = ".txt",
): string | null {
	if (!fs.existsSync(cacheDir)) {
		return null;
	}

	const files = fs.readdirSync(cacheDir);
	const cachedFile = files.find(
		(file) => file.startsWith(filePrefix) && file.endsWith(fileType),
	);

	if (!cachedFile) {
		return null;
	}

	// Check if it's a Last-Modified based filename (contains day of week)
	// If it contains day names, it's Last-Modified, otherwise it's ETag
	if (isLastModifiedFilename(cachedFile)) {
		return null; // It's Last-Modified
	}
	// It's an ETag - reconstruct it
	return reconstructETagFromFilename(cachedFile, filePrefix, fileType);
}

export function getCurrentLastModified(
	cacheDir: string,
	filePrefix: string,
	fileType: `.${string}` = ".txt",
): string | null {
	if (!fs.existsSync(cacheDir)) {
		return null;
	}

	const files = fs.readdirSync(cacheDir);
	const cachedFile = files.find(
		(file) => file.startsWith(filePrefix) && file.endsWith(fileType),
	);

	if (!cachedFile) {
		return null;
	}

	// Check if it's a Last-Modified based filename (contains day of week)
	if (isLastModifiedFilename(cachedFile)) {
		return reconstructLastModifiedFromFilename(
			cachedFile,
			filePrefix,
			fileType,
		);
	}
	return null;
}

export async function saveFileWithETag(
	stream: ReadableStream<Uint8Array>,
	etag: string,
	cacheDir: string,
	filePrefix: `${string}-`,
	fileType: `.${string}` = ".txt",
): Promise<string> {
	// Ensure this only runs in Node.js environment
	if (typeof window !== "undefined" || typeof process === "undefined") {
		throw new Error(
			"saveFileWithETag can only be used in Node.js environments",
		);
	}

	const sanitizedETag = sanitizeETagForFilename(etag);
	const filename = `${filePrefix}${sanitizedETag}${fileType}`;
	const filepath = path.join(cacheDir, filename);

	// Dynamically import Node.js stream modules to avoid bundling issues
	const [{ Readable }, { pipeline }] = await Promise.all([
		import("node:stream"),
		import("node:stream/promises"),
	]);

	// Convert Web ReadableStream to Node.js Readable
	const nodeStream = Readable.fromWeb(<streamWeb>stream);

	// Create write stream
	const fileStream = fs.createWriteStream(filepath);

	return pipeline(nodeStream, fileStream)
		.then(() => filepath)
		.catch((error) => {
			// Clean up on error: destroy streams and remove partial file
			nodeStream.destroy();
			fileStream.destroy();

			// Remove partially written file if it exists
			try {
				if (fs.existsSync(filepath)) {
					fs.unlinkSync(filepath);
				}
			} catch (cleanupError) {
				// Ignore cleanup errors
			}

			throw error;
		});
}

export async function saveFileWithLastModified(
	stream: ReadableStream<Uint8Array>,
	lastModified: string,
	cacheDir: string,
	filePrefix: `${string}-`,
	fileType: `.${string}` = ".txt",
): Promise<string> {
	// Ensure this only runs in Node.js environment
	if (typeof window !== "undefined" || typeof process === "undefined") {
		throw new Error(
			"saveFileWithLastModified can only be used in Node.js environments",
		);
	}

	const sanitizedLastModified = sanitizeLastModifiedForFilename(lastModified);
	const filename = `${filePrefix}${sanitizedLastModified}${fileType}`;
	const filepath = path.join(cacheDir, filename);

	// Dynamically import Node.js stream modules to avoid bundling issues
	const [{ Readable }, { pipeline }] = await Promise.all([
		import("node:stream"),
		import("node:stream/promises"),
	]);

	// Convert Web ReadableStream to Node.js Readable
	const nodeStream = Readable.fromWeb(<streamWeb>stream);

	// Create write stream
	const fileStream = fs.createWriteStream(filepath);

	return pipeline(nodeStream, fileStream)
		.then(() => filepath)
		.catch((error) => {
			// Clean up on error: destroy streams and remove partial file
			nodeStream.destroy();
			fileStream.destroy();

			// Remove partially written file if it exists
			try {
				if (fs.existsSync(filepath)) {
					fs.unlinkSync(filepath);
				}
			} catch (cleanupError) {
				// Ignore cleanup errors
			}

			throw error;
		});
}

export function getCachedFilePath(
	cacheDir: string,
	filePrefix: `${string}-`,
	fileType: `.${string}` = ".txt",
): string | null {
	if (!fs.existsSync(cacheDir)) {
		return null;
	}

	const files = fs.readdirSync(cacheDir);
	const filePath = files.find(
		(file) => file.startsWith(filePrefix) && file.endsWith(fileType),
	);

	return filePath ? path.join(cacheDir, filePath) : null;
}

type LogObj = (msg: () => { msg: string }) => void;

export const fetchWithLastModified = async (
	url: string,
	lastModified: string | null,
): Promise<{
	stream: ReadableStream<Uint8Array> | null;
	lastModified: string | null;
	notModified: boolean;
	contentLength?: number;
}> => {
	const headers: Record<string, string> = {};
	if (lastModified) {
		headers["If-Modified-Since"] = lastModified;
	}

	try {
		const response = await fetch(url, {
			method: "GET",
			headers,
		});

		if (response.status === 304) {
			return { stream: null, lastModified: null, notModified: true };
		}

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const responseLastModified = response.headers.get("last-modified") || null;
		const contentLengthHeader = response.headers.get("content-length");
		const contentLength = contentLengthHeader
			? (() => {
					const parsed = Number.parseInt(contentLengthHeader, 10);
					return Number.isFinite(parsed) ? parsed : undefined;
				})()
			: undefined;

		return {
			stream: response.body,
			lastModified: responseLastModified,
			notModified: false,
			contentLength,
		};
	} catch (error) {
		throw new Error(`Fetch error: ${error}`);
	}
};

export const cacheFileUtils = {
	fetchWithLastModified,
};

export const cacheFile = async (
	cacheDir: string,
	url: string,
	logger: {
		debug: LogObj;
		info: LogObj;
		warn: LogObj;
		error: LogObj;
	},
	filePrefix: `${string}-`,
	fileType: `.${string}` = ".txt",
) => {
	ensureDirExists(cacheDir);

	const currentETag = getCurrentETag(cacheDir, filePrefix, fileType);
	const currentLastModified = getCurrentLastModified(
		cacheDir,
		filePrefix,
		fileType,
	);
	let filePath = getCachedFilePath(cacheDir, filePrefix, fileType);

	try {
		// Try ETag first if available
		if (currentETag) {
			const result = await fetchWithETag(url, currentETag);

			if (result.notModified && filePath) {
				logger.debug(() => ({
					msg: "File not modified (ETag), using cached version",
				}));
			} else if (result.stream !== null && result.etag) {
				logger.info(() => ({
					msg: "File updated (ETag), caching new version",
				}));
				purgeOldCache(cacheDir, filePrefix, fileType);
				filePath = await saveFileWithETag(
					result.stream,
					result.etag,
					cacheDir,
					filePrefix,
					fileType,
				);
			} else {
				throw new Error("Failed to fetch file or no ETag received");
			}
		} else if (currentLastModified) {
			// Fall back to Last-Modified
			const result = await cacheFileUtils.fetchWithLastModified(
				url,
				currentLastModified,
			);

			if (result.notModified && filePath) {
				logger.debug(() => ({
					msg: "File not modified (Last-Modified), using cached version",
				}));
			} else if (result.stream !== null && result.lastModified) {
				logger.info(() => ({
					msg: "File updated (Last-Modified), caching new version",
				}));
				purgeOldCache(cacheDir, filePrefix, fileType);
				filePath = await saveFileWithLastModified(
					result.stream,
					result.lastModified,
					cacheDir,
					filePrefix,
					fileType,
				);
			} else {
				throw new Error("Failed to fetch file or no Last-Modified received");
			}
		} else {
			// No cached version, fetch fresh
			const etagResult = await fetchWithETag(url, null);
			if (etagResult.stream !== null && etagResult.etag) {
				logger.info(() => ({
					msg: "Fetching file for first time (ETag)",
				}));
				filePath = await saveFileWithETag(
					etagResult.stream,
					etagResult.etag,
					cacheDir,
					filePrefix,
					fileType,
				);
			} else {
				// Try Last-Modified if ETag not available
				const lmResult = await cacheFileUtils.fetchWithLastModified(url, null);
				if (lmResult.stream !== null && lmResult.lastModified) {
					logger.info(() => ({
						msg: "Fetching file for first time (Last-Modified)",
					}));
					filePath = await saveFileWithLastModified(
						lmResult.stream,
						lmResult.lastModified,
						cacheDir,
						filePrefix,
						fileType,
					);
				} else {
					throw new Error(
						"Failed to fetch file - no ETag or Last-Modified available",
					);
				}
			}
		}
	} catch (error) {
		logger.warn(() => ({
			msg: "Failed to fetch file from remote, using cached version if available",
			err: error,
		}));

		// Fall back to cached file if available
		if (!filePath) {
			throw new Error(
				"No cached file available and failed to fetch from remote",
			);
		}
	}
	return filePath;
};

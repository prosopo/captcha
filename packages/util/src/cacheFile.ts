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
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
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

	// Reconstruct the original ETag format for HTTP header use
	return reconstructETagFromFilename(cachedFile, filePrefix, fileType);
}

export function saveFileWithETag(
	stream: ReadableStream<Uint8Array>,
	etag: string,
	cacheDir: string,
	filePrefix: `${string}-`,
	fileType: `.${string}` = ".txt",
): Promise<string> {
	const sanitizedETag = sanitizeETagForFilename(etag);
	const filename = `${filePrefix}${sanitizedETag}${fileType}`;
	const filepath = path.join(cacheDir, filename);

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
	let filePath = getCachedFilePath(cacheDir, filePrefix, fileType);

	try {
		const result = await fetchWithETag(url, currentETag);

		if (result.notModified && filePath) {
			logger.debug(() => ({
				msg: "File not modified, using cached version",
			}));
		} else if (result.stream !== null && result.etag) {
			logger.info(() => ({
				msg: "File updated, caching new version",
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

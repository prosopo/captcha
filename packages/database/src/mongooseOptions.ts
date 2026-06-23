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
import { ServerApiVersion } from "mongodb";
import type { ConnectOptions } from "mongoose";

export type MongoCompressor = "zstd" | "none" | "snappy" | "zlib";

const DEFAULT_COMPRESSORS: MongoCompressor[] = [
	"zstd",
	"snappy",
	"zlib",
	"none",
];

/**
 * Determines MongoDB compression settings based on whether the connection URL is a remote domain.
 * Remote domains (e.g., abc.com, x.y.com) will use compression, while local connections
 * (e.g., localhost, container names like "database", "db", "mongo") will not.
 *
 * @param url - The MongoDB connection URL string
 * @param compressors - Optional array of compressor strings. Defaults to ["zstd", "snappy", "zlib", "none"]
 * @returns Array of compressor strings if the URL is a remote domain, empty array otherwise
 */
export const getMongoCompressors = (
	url: string,
	compressors: MongoCompressor[] = DEFAULT_COMPRESSORS,
): MongoCompressor[] => {
	try {
		// Extract the part after "://" to handle any protocol (mongodb://, mongodb+srv://, etc.)
		const protocolIndex = url.indexOf("://");
		const urlWithoutProtocol =
			protocolIndex !== -1 ? url.slice(protocolIndex + 3) : url;
		const parsedUrl = new URL(`mongodb://${urlWithoutProtocol}`);
		const hostname = parsedUrl.hostname;

		// Localhost variants should not use compression. Node's URL keeps the
		// brackets on an IPv6 loopback ("[::1]"); the bare "::1" form is included
		// defensively in case a host arrives unbracketed.
		const isLocalhost =
			hostname === "localhost" ||
			hostname === "127.0.0.1" ||
			hostname === "[::1]" ||
			hostname === "::1";

		if (isLocalhost) {
			return [];
		}

		// Domains and IP addresses (IPv4/IPv6) include dots or colons; bare
		// single-label hostnames (container/service names) do not.
		return hostname.includes(".") || hostname.includes(":") ? compressors : [];
	} catch {
		// If URI parsing fails, default to compression
		return compressors;
	}
};

/**
 * Returns default mongoose connection options with the ability to override specific values.
 *
 * @param options - Configuration options
 * @param options.url - MongoDB connection URL string
 * @param options.appName - Application name (typically from fileURLToPath(import.meta.url))
 * @param options.maxPoolSize - Maximum pool size (default: 10)
 * @param options.minPoolSize - Minimum pool size (default: 0)
 * @param options.dbName - Optional database name
 * @returns Mongoose connection options object
 */
export const getMongoConnectionOptions = (options: {
	url: string;
	appName: string;
	maxPoolSize?: number;
	minPoolSize?: number;
	dbName?: string;
}): ConnectOptions => {
	const { url, appName, maxPoolSize = 10, minPoolSize = 0, dbName } = options;

	if (!url || url.trim() === "") {
		throw new Error(
			"MongoDB connection URL is required and cannot be empty or whitespace-only",
		);
	}

	const compressors = getMongoCompressors(url);

	const connectionOptions: ConnectOptions = {
		serverApi: {
			version: ServerApiVersion.v1,
			// strict mode rejects any command outside the Stable API; leave it
			// off so non-stable operations (index/admin commands etc.) keep working.
			strict: false,
			deprecationErrors: false,
		},
		maxPoolSize, // allow up to N connections at any given time. >1 connection allows parallel db operations
		minPoolSize, // pool may close idle connections down to this amount (0 = close all idle past maxIdleTimeMS)
		maxConnecting: 2, // maximum number of concurrent connection attempts
		connectTimeoutMS: 10000, // max time to connect to the database
		socketTimeoutMS: 30000, // max time to wait for a response from the database when doing an operation
		maxIdleTimeMS: 300000, // max time spent idle before closing the connection
		appName,
		serverSelectionTimeoutMS: 20000, // max time to wait for a response from the database
		compressors,
	};

	if (dbName) {
		connectionOptions.dbName = dbName;
	}

	return connectionOptions;
};

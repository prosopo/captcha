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

// The default is empty (no compression) because the provider CLI ships as a
// vite ESM bundle and the mongodb driver loads native compressor modules
// (@mongodb-js/zstd, @mongodb-js/snappy) via CommonJS `require`, which is
// undefined in the bundle — any negotiated native compressor crashes the
// connection with MongoMissingDependencyError. Callers that run unbundled and
// want compression can pass an explicit list.
const DEFAULT_COMPRESSORS: MongoCompressor[] = [];

/**
 * Determines MongoDB compression settings based on whether the connection points
 * at a remote host. Compression is enabled for domains (e.g. abc.com) and for
 * IPv4/IPv6 hosts (anything whose hostname contains a "." or ":"), and disabled
 * for localhost and bare single-label hosts (container/service names like
 * "database", "db", "mongo") or when no host is present.
 *
 * @param url - The MongoDB connection URL string
 * @param compressors - Optional array of compressor strings. Defaults to [] (no compression)
 * @returns A new array of compressor strings when compression is enabled, empty array otherwise
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

		// No host present (e.g. "" or "mongodb://") means there is nothing to
		// compress to; treat it as local and skip compression.
		if (urlWithoutProtocol.trim() === "") {
			return [];
		}

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
		// single-label hostnames (container/service names) do not. Return a copy
		// so callers can't mutate the shared DEFAULT_COMPRESSORS constant.
		return hostname.includes(".") || hostname.includes(":")
			? [...compressors]
			: [];
	} catch {
		// If URI parsing fails, default to compression
		return [...compressors];
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

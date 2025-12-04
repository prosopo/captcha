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
import { ServerApiVersion } from "mongodb";
import type { ConnectOptions } from "mongoose";

/**
 * Determines MongoDB compression settings based on whether the connection URL is a remote domain.
 * Remote domains (e.g., abc.com, x.y.com) will use compression, while local connections
 * (e.g., localhost, container names like "database", "db", "mongo", or IP addresses) will not.
 *
 * @param url - The MongoDB connection URL string
 * @param compressors - Optional array of compressor strings. Defaults to ["zstd", "snappy", "zlib", "none"]
 * @returns Array of compressor strings if the URL is a remote domain, empty array otherwise
 */
export const getMongoCompressors = (
    url: string,
    compressors: ("zstd" | "none" | "snappy" | "zlib")[] = [
        "zstd",
        "snappy",
        "zlib",
        "none",
    ],
): ("zstd" | "none" | "snappy" | "zlib")[] => {
    try {
        // Extract the part after "://" to handle any protocol (mongodb://, mongodb+srv://, etc.)
        const protocolIndex = url.indexOf("://");
        const urlWithoutProtocol =
            protocolIndex !== -1 ? url.slice(protocolIndex + 3) : url;
        const parsedUrl = new URL(`mongodb://${urlWithoutProtocol}`);
        const hostname = parsedUrl.hostname;

        // Localhost variants should not use compression
        const isLocalhost =
            hostname === "localhost" ||
            hostname === "127.0.0.1" ||
            hostname === "::1" ||
            hostname === "[::1]";

        // If it's localhost, no compression
        if (isLocalhost) {
            return [];
        }

        // Domains and IP addresses (IPv4/IPv6) include dots or colons
        return hostname.includes(".") ||
            hostname.includes(":")
            ? compressors
            : [];
    } catch {
        // If URI parsing fails, default to compression
        return compressors;
    }
};

export interface MongoConnectionOptions extends Partial<ConnectOptions> {
    serverApi: {
        version: ServerApiVersion;
        strict: boolean;
        deprecationErrors: boolean;
    };
    maxPoolSize: number;
    minPoolSize: number;
    connectTimeoutMS: number;
    socketTimeoutMS: number;
    maxIdleTimeMS: number;
    appName: string;
    serverSelectionTimeoutMS: number;
    compressors: ("zstd" | "none" | "snappy" | "zlib")[];
    dbName?: string;
}

/**
 * Returns default mongoose connection options with the ability to override specific values.
 *
 * @param options - Configuration options
 * @param options.url - MongoDB connection URL string
 * @param options.appName - Application name (typically from fileURLToPath(import.meta.url))
 * @param options.maxPoolSize - Maximum pool size (default: 10)
 * @param options.dbName - Optional database name
 * @returns Mongoose connection options object
 */
export const getMongoConnectionOptions = (
    options: {
        url: string;
        appName: string;
        maxPoolSize?: number;
        dbName?: string;
    },
): MongoConnectionOptions => {
    const {
        url,
        appName,
        maxPoolSize = 10,
        dbName,
    } = options;

    if (!url || url.trim() === "") {
        throw new Error("MongoDB connection URL is required and cannot be empty");
    }

    const compressors = getMongoCompressors(url);

    const connectionOptions: MongoConnectionOptions = {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        },
        maxPoolSize, // allow up to N connections at any given time. >1 connection allows parallel db operations
        minPoolSize: 0, // allow pool to close idle connections down to this amount, 0 keep no connections open if they've been idle for longer than maxIdleTimeMS
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


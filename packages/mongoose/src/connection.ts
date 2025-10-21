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

import { type Logger, getLogger } from "@prosopo/common";
import { ServerApiVersion } from "mongodb";
import mongoose, { type Connection } from "mongoose";

mongoose.set("strictQuery", false);

const DEFAULT_ENDPOINT = "mongodb://127.0.0.1:27017";

// Singleton connection cache keyed by connection string
const connectionCache = new Map<string, Promise<Connection>>();

export interface MongooseConnectionOptions {
	url?: string;
	dbname?: string;
	authSource?: string;
	logger?: Logger;
}

/**
 * Creates and manages a singleton mongoose connection to MongoDB
 * Returns the same connection instance for the same connection parameters
 * @param options Connection options
 * @returns Promise that resolves to the mongoose Connection
 */
export async function createMongooseConnection(
	options: MongooseConnectionOptions,
): Promise<Connection> {
	const logger = options.logger || getLogger("info", import.meta.url);
	const baseEndpoint = options.url || DEFAULT_ENDPOINT;
	const parsedUrl = new URL(baseEndpoint);

	if (options.dbname) {
		parsedUrl.pathname = options.dbname;
	}
	if (options.authSource) {
		parsedUrl.searchParams.set("authSource", options.authSource);
	}

	const connectionUrl = parsedUrl.toString();
	const safeURL = connectionUrl.replace(/\w+:\w+/, "<Credentials>");
	const dbname = options.dbname || parsedUrl.pathname.replace("/", "");

	// Create a cache key from connection URL and dbname
	const cacheKey = `${connectionUrl}::${dbname}`;

	// Return existing connection if available
	if (connectionCache.has(cacheKey)) {
		logger.debug(() => ({
			data: { mongoUrl: safeURL },
			msg: "Reusing existing mongoose connection",
		}));
		return connectionCache.get(cacheKey)!;
	}

	logger.debug(() => ({
		data: { mongoUrl: safeURL },
		msg: "Creating new mongoose connection",
	}));

	// Create new connection promise and cache it
	const connectionPromise = new Promise<Connection>((resolve, reject) => {
		const connection = mongoose.createConnection(connectionUrl, {
			dbName: dbname,
			serverApi: ServerApiVersion.v1,
		});

		const onConnected = () => {
			logger.debug(() => ({
				data: { mongoUrl: safeURL },
				msg: "Mongoose connection opened",
			}));
			resolve(connection);
		};

		const onError = (err: unknown) => {
			logger.error(() => ({
				err,
				data: { mongoUrl: safeURL },
				msg: "Mongoose connection error",
			}));
			// Remove from cache on error
			connectionCache.delete(cacheKey);
			reject(err);
		};

		connection.once("open", onConnected);
		connection.once("error", onError);

		// Handle other events
		connection.on("disconnected", () => {
			logger.debug(() => ({
				data: { mongoUrl: safeURL },
				msg: "Mongoose disconnected",
			}));
		});

		connection.on("reconnected", () => {
			logger.debug(() => ({
				data: { mongoUrl: safeURL },
				msg: "Mongoose reconnected",
			}));
		});

		connection.on("close", () => {
			logger.debug(() => ({
				data: { mongoUrl: safeURL },
				msg: "Mongoose connection closed",
			}));
			// Remove from cache when connection closes
			connectionCache.delete(cacheKey);
		});

		connection.on("fullsetup", () => {
			logger.debug(() => ({
				data: { mongoUrl: safeURL },
				msg: "Mongoose connection is fully setup",
			}));
		});
	});

	connectionCache.set(cacheKey, connectionPromise);
	return connectionPromise;
}

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
import mongoose, { type Connection } from "mongoose";

mongoose.set("strictQuery", false);

const DEFAULT_ENDPOINT = "mongodb://127.0.0.1:27017";

export interface MongooseConnectionOptions {
	url?: string;
	dbname?: string;
	authSource?: string;
	/**
	 * Optional logger object with debug and error methods
	 * Compatible with @prosopo/common Logger type
	 */
	logger?: {
		debug: (fn: () => { err?: unknown; data?: Record<string, unknown>; msg?: string }) => void;
		error: (fn: () => { err?: unknown; data?: Record<string, unknown>; msg?: string }) => void;
	};
}

/**
 * Creates and manages a mongoose connection to MongoDB
 * @param options Connection options
 * @returns Promise that resolves to the mongoose Connection
 */
export async function createMongooseConnection(
	options: MongooseConnectionOptions,
): Promise<Connection> {
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

	if (options.logger) {
		options.logger.debug(() => ({
			data: { mongoUrl: safeURL },
			msg: "Creating mongoose connection",
		}));
	}

	return new Promise((resolve, reject) => {
		const connection = mongoose.createConnection(connectionUrl, {
			dbName: dbname,
			serverApi: ServerApiVersion.v1,
		});

		const onConnected = () => {
			if (options.logger) {
				options.logger.debug(() => ({
					data: { mongoUrl: safeURL },
					msg: "Mongoose connection opened",
				}));
			}
			resolve(connection);
		};

		const onError = (err: unknown) => {
			if (options.logger) {
				options.logger.error(() => ({
					err,
					data: { mongoUrl: safeURL },
					msg: "Mongoose connection error",
				}));
			}
			reject(err);
		};

		connection.once("open", onConnected);
		connection.once("error", onError);

		// Optional: handle other events
		if (options.logger) {
			connection.on("disconnected", () => {
				if (options.logger) {
					options.logger.debug(() => ({
						data: { mongoUrl: safeURL },
						msg: "Mongoose disconnected",
					}));
				}
			});

			connection.on("reconnected", () => {
				if (options.logger) {
					options.logger.debug(() => ({
						data: { mongoUrl: safeURL },
						msg: "Mongoose reconnected",
					}));
				}
			});

			connection.on("close", () => {
				if (options.logger) {
					options.logger.debug(() => ({
						data: { mongoUrl: safeURL },
						msg: "Mongoose connection closed",
					}));
				}
			});

			connection.on("fullsetup", () => {
				if (options.logger) {
					options.logger.debug(() => ({
						data: { mongoUrl: safeURL },
						msg: "Mongoose connection is fully setup",
					}));
				}
			});
		}
	});
}

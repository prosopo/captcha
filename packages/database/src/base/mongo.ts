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
import { type Logger, ProsopoDBError, getLogger } from "@prosopo/common";
import type { IDatabase } from "@prosopo/types-database";
import { ServerApiVersion } from "mongodb";
import mongoose, { type Connection } from "mongoose";

mongoose.set("strictQuery", false);

// mongodb://username:password@127.0.0.1:27017
const DEFAULT_ENDPOINT = "mongodb://127.0.0.1:27017";

/**
 * Returns a generic Mongo database layer
 * @param {string} url          The database endpoint
 * @param {string} dbname       The database name
 * @return {MongoDatabase}    Database layer
 */
export class MongoDatabase implements IDatabase {
	protected readonly _url: string;
	safeURL: string;
	dbname: string;
	connection?: Connection;
	logger: Logger;
	connected = false;
	private connecting?: Promise<void>;

	constructor(
		url: string,
		dbname?: string,
		authSource?: string,
		logger?: Logger,
	) {
		const baseEndpoint = url || DEFAULT_ENDPOINT;
		const parsedUrl = new URL(baseEndpoint);
		if (dbname) {
			parsedUrl.pathname = dbname;
		}
		if (authSource) {
			parsedUrl.searchParams.set("authSource", authSource);
		}
		this._url = parsedUrl.toString();
		this.safeURL = this.url.replace(/\w+:\w+/, "<Credentials>");
		this.dbname = dbname || parsedUrl.pathname.replace("/", "");
		this.logger = logger || getLogger("info", import.meta.url);
	}

	get url(): string {
		return this._url;
	}

	getConnection(): mongoose.Connection {
		if (!this.connection) {
			throw new ProsopoDBError("DATABASE.CONNECTION_UNDEFINED", {
				context: { failedFuncName: this.getConnection.name },
				logger: this.logger,
			});
		}
		return this.connection;
	}

	/**
	 * @description Connect to the database and set the various tables
	 */
	async connect(): Promise<void> {
		this.logger.info(() => ({
			data: { mongoUrl: this.safeURL },
			msg: "Connecting to database",
		}));
		try {
			// Already connected
			if (this.connected) {
				this.logger.info(() => ({
					data: { mongoUrl: this.safeURL },
					msg: "Database connection already open",
				}));
				return;
			}

			// If a connection is in progress, await it
			if (this.connecting) {
				this.logger.info(() => ({
					data: { mongoUrl: this.safeURL },
					msg: "Database connection in progress, waiting for it to finish",
				}));
				return this.connecting;
			}

			// Start a new connection
			this.connecting = new Promise((resolve, reject) => {
				const connection = mongoose.createConnection(this.url, {
					dbName: this.dbname,
					serverApi: ServerApiVersion.v1,
				});

				const onConnected = () => {
					this.logger.info(() => ({
						data: { mongoUrl: this.safeURL },
						msg: "Database connection opened",
					}));
					this.connected = true;
					this.connection = connection;
					this.connecting = undefined;
					resolve();
				};

				const onError = (err: unknown) => {
					this.logger.error(() => ({
						err,
						data: { mongoUrl: this.safeURL },
						msg: "Database error",
					}));
					this.connected = false;
					this.connecting = undefined;
					reject(err);
				};

				connection.once("open", onConnected);
				connection.once("error", onError);

				// Optional: handle other events
				connection.on("disconnected", () => {
					this.connected = false;
					this.logger.info(() => ({
						data: { mongoUrl: this.safeURL },
						msg: "Database disconnected",
					}));
				});

				connection.on("reconnected", () => {
					this.connected = true;
					this.logger.info(() => ({
						data: { mongoUrl: this.safeURL },
						msg: "Database reconnected",
					}));
				});

				connection.on("close", () => {
					this.connected = false;
					this.logger.info(() => ({
						data: { mongoUrl: this.safeURL },
						msg: "Database connection closed",
					}));
				});

				connection.on("fullsetup", () => {
					this.connected = true;
					this.logger.info(() => ({
						data: { mongoUrl: this.safeURL },
						msg: "Database connection is fully setup",
					}));
				});
			});

			return this.connecting;
		} catch (e) {
			this.logger.error(() => ({
				err: e,
				data: { mongoUrl: this.safeURL },
				msg: "Database connection error",
			}));
			throw e;
		}
	}

	/** Close connection to the database */
	async close(): Promise<void> {
		this.logger.debug(() => ({
			data: { mongoUrl: this.safeURL },
			msg: "Closing connection",
		}));
		await this.connection?.close();
	}
}

// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import { getLoggerDefault, type Logger, ProsopoDBError } from "@prosopo/common";
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
export class MongoDatabase {
  protected readonly _url: string;
  safeURL: string;
  dbname: string;
  connection?: Connection;
  logger: Logger;
  connected = false;

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
    this.logger = logger || getLoggerDefault();
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
    this.logger.info(`Mongo url: ${this.safeURL}`);

    if (this.connected) {
      this.logger.info(`Database connection to ${this.safeURL} already open`);
      return;
    }

    this.connection = await new Promise((resolve, reject) => {
      const connection = mongoose.createConnection(this.url, {
        dbName: this.dbname,
        serverApi: ServerApiVersion.v1,
      });

      connection.on("open", () => {
        this.logger.info(`Database connection to ${this.safeURL} opened`);
        this.connected = true;
        resolve(connection);
      });

      connection.on("error", (err) => {
        this.connected = false;
        this.logger.error(`Database error: ${err}`);
        reject(err);
      });

      connection.on("connected", () => {
        this.logger.info(`Database connected to ${this.safeURL}`);
        this.connected = true;
        resolve(connection);
      });

      connection.on("disconnected", () => {
        this.connected = false;
        this.logger.info(`Database disconnected from ${this.safeURL}`);
      });

      connection.on("reconnected", () => {
        this.logger.info(`Database reconnected to ${this.safeURL}`);
        this.connected = true;
        resolve(connection);
      });

      connection.on("reconnectFailed", () => {
        this.connected = false;
        this.logger.error(`Database reconnect failed to ${this.safeURL}`);
      });

      connection.on("close", () => {
        this.connected = false;
        this.logger.info(`Database connection to ${this.safeURL} closed`);
      });

      connection.on("fullsetup", () => {
        this.connected = true;
        this.logger.info(
          `Database connection to ${this.safeURL} is fully setup`,
        );
        resolve(connection);
      });
    });
  }

  /** Close connection to the database */
  async close(): Promise<void> {
    this.logger.debug(`Closing connection to ${this.safeURL}`);
    await this.connection?.close();
  }
}

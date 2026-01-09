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
import type { Logger } from "@prosopo/common";
import { MongoDatabase } from "./mongo.js";

/**
 * MongoMemoryDatabase is now a wrapper around MongoDatabase that uses testcontainers
 * or environment-provided MongoDB URL for testing. It maintains backward compatibility
 * with the old MongoMemoryServer approach.
 */
export class MongoMemoryDatabase extends MongoDatabase {
	private isTestContainerMode = false;

	constructor(
		url: string, // Can be empty for testcontainers mode or a real MongoDB URL
		dbname: string,
		logger: Logger,
		authSource?: string,
	) {
		// Use provided URL or fall back to testcontainers environment variable
		const mongoUrl = url || process.env.MONGODB_URL || "mongodb://127.0.0.1:27017";
		super(mongoUrl, dbname, authSource, logger);

		// If no URL was provided and we're using MONGODB_URL, we're in testcontainers mode
		this.isTestContainerMode = !url && !!process.env.MONGODB_URL;
	}

	override async connect(): Promise<void> {
		await super.connect();
	}

	override async close(): Promise<void> {
		// In testcontainers mode, we don't close the connection as the container
		// will be managed by the test setup/teardown
		if (!this.isTestContainerMode) {
			await super.close();
		}
	}
}

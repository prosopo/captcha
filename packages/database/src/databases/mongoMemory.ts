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
import type { Logger } from "@prosopo/common";
import { MongoMemoryServer } from "mongodb-memory-server";
import { ProsopoDatabase as MongoDatabase } from "./mongo.js";

export class MongoMemoryDatabase extends MongoDatabase {
	private mongod: MongoMemoryServer | undefined;
	private running = false;

	override async init(
		url: string,
		dbname: string,
		logger: Logger,
		authSource?: string,
	): Promise<this> {
		this.mongod = await MongoMemoryServer.create();
		this.running = true;
		const mongoMemoryURL = this.mongod.getUri();
		await super.init(mongoMemoryURL, dbname, logger, authSource);
		return this;
	}

	override connect(): Promise<void> {
		if (!this.running) {
			// start the mongo memory server if not already running
			// this will error if already running
			this.mongod?.start();
			this.running = true;
		} else {
			// already running, do nothing
		}
		return super.connect();
	}

	override async close(): Promise<void> {
		await super.close();
		// stop the mongo memory server
		// this will not error if already stopped
		await this.mongod?.stop();
		this.running = false;
	}
}

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
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoDatabase } from "./mongo.js";

export class MongoMemoryDatabase extends MongoDatabase {
	protected override _url = "";
	private mongod: MongoMemoryServer | undefined;

	constructor(
		_url: string, // this param is unused, but kept for compatibility
		dbname: string,
		logger: Logger,
		authSource?: string,
	) {
		super("", dbname, authSource, logger); // temporarily use empty URL, will set it later in connect()
	}

	override async connect(): Promise<void> {
		if (!this.mongod) {
			this.mongod = await MongoMemoryServer.create();
			this._url = this.mongod.getUri();
		}
		await super.connect();
	}

	override async close(): Promise<void> {
		await super.close();
		await this.mongod?.stop();
		this.mongod = undefined;
	}
}

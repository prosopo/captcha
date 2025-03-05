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

import { type Logger, ProsopoDBError } from "@prosopo/common";
import type { Timestamp } from "@prosopo/types";
import {
	AccountSchema,
	type ClientRecord,
	type IClientDatabase,
	TableNames,
	type Tables,
	UserDataSchema,
} from "@prosopo/types-database";
import { MongoDatabase } from "../base/index.js";

const CLIENT_TABLES = [
	{
		collectionName: TableNames.accounts,
		modelName: "Account",
		schema: AccountSchema,
	},
];

export class ClientDatabase extends MongoDatabase implements IClientDatabase {
	tables: Tables<TableNames>;

	constructor(
		url: string,
		dbname?: string,
		authSource?: string,
		logger?: Logger,
	) {
		super(url, dbname, authSource, logger);
		this.tables = {} as Tables<TableNames>;
	}

	override async connect(): Promise<void> {
		await super.connect();
		CLIENT_TABLES.map(({ collectionName, modelName, schema }) => {
			if (this.connection) {
				this.tables[collectionName] = this.connection.model(modelName, schema);
			}
		});
	}

	getTables(): Tables<TableNames> {
		if (!this.tables) {
			throw new ProsopoDBError("DATABASE.TABLES_UNDEFINED", {
				context: { failedFuncName: this.getTables.name },
				logger: this.logger,
			});
		}
		return this.tables;
	}

	async getUpdatedClients(
		updatedAtTimestamp: Timestamp,
	): Promise<ClientRecord[]> {
		await this.connect();
		// get remote client records that have been updated since the last task
		const newClientRecords = await this.tables.accounts
			.find<ClientRecord>(
				{
					$or: [
						{ "sites.updatedAt": { $gt: updatedAtTimestamp } },
						{ "sites.updatedAt": { $exists: false } },
					],
					"users.active": true,
				},
				{ "sites.siteKey": 1, "sites.settings": 1, "sites.tier": 1 },
			)
			.lean()
			.then((records) =>
				records.map(
					(record) =>
						({
							account: record.sites.siteKey, // Rename "sites.siteKey" to "account"
							settings: record.sites.settings, // Rename "sites.settings" to "settings"
							tier: record.tier, // Keep "tier" as is
						}) as ClientRecord,
				),
			);

		await this.close();
		return newClientRecords;
	}
}

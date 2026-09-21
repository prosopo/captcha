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

import { ProsopoDBError } from "@prosopo/common";
import type { Logger } from "@prosopo/logger";
import type { IUserSettings, Tier, Timestamp } from "@prosopo/types";
import {
	AccountSchema,
	type IClientDatabase,
	type IUserDataSlim,
	TableNames,
	type Tables,
} from "@prosopo/types-database";
import { MongoDatabase } from "../base/index.js";

// The projected shape of an account returned by `getUpdatedClients`. Stated
// here rather than reusing the full account type so the projection and the
// fields read below cannot drift apart.
interface UpdatedClientAccount {
	tier: Tier;
	sites?: {
		siteKey?: string;
		settings?: IUserSettings;
		updatedAt?: Timestamp;
	}[];
}

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
	): Promise<IUserDataSlim[]> {
		await this.connect();
		// get remote client records that have been updated since the last task
		//
		// The query matches at document level, so an account is returned when
		// ANY of its sites is new — the per-site test below is what decides
		// which of them are actually carried across. `tier` is projected from
		// the account: it does not exist on a site.
		const accounts = await this.tables.accounts
			.find<UpdatedClientAccount>(
				{
					$or: [
						{ "sites.updatedAt": { $gt: updatedAtTimestamp } },
						{ "sites.updatedAt": { $exists: false } },
					],
					"users.status": "active",
				},
				{
					tier: 1,
					"sites.siteKey": 1,
					"sites.settings": 1,
					"sites.updatedAt": 1,
				},
			)
			.lean();

		// `sites` is an array. Reading `.siteKey` off it yields undefined, so
		// every record has to be flattened site by site — otherwise they all
		// arrive at `updateClientRecords` with no account and upsert into a
		// single row keyed on `account: undefined`.
		const newClientRecords: IUserDataSlim[] = [];
		for (const account of accounts) {
			for (const site of account.sites ?? []) {
				if (!site.siteKey || !site.settings) continue;
				const isNew =
					site.updatedAt === undefined || site.updatedAt > updatedAtTimestamp;
				if (!isNew) continue;
				newClientRecords.push({
					account: site.siteKey,
					settings: site.settings,
					tier: account.tier,
				});
			}
		}

		await this.close();
		return newClientRecords;
	}
}

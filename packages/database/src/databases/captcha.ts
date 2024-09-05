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

import { type Logger, ProsopoDBError, getLoggerDefault } from "@prosopo/common";
import {
	type ICaptchaDatabase,
	type PoWCaptchaRecord,
	PoWCaptchaRecordSchema,
	type Tables,
	type UserCommitmentRecord,
	UserCommitmentRecordSchema,
} from "@prosopo/types-database";
import { MongoDatabase } from "../base/index.js";
const logger = getLoggerDefault();

enum TableNames {
	commitment = "commitment",
	powcaptcha = "powcaptcha",
}

const CAPTCHA_TABLES = [
	{
		collectionName: TableNames.powcaptcha,
		modelName: "PowCaptcha",
		schema: PoWCaptchaRecordSchema,
	},
	{
		collectionName: TableNames.commitment,
		modelName: "UserCommitment",
		schema: UserCommitmentRecordSchema,
	},
];

export class CaptchaDatabase extends MongoDatabase implements ICaptchaDatabase {
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
		CAPTCHA_TABLES.map(({ collectionName, modelName, schema }) => {
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

	async saveCaptchas(
		imageCaptchaEvents: UserCommitmentRecord[],
		powCaptchaEvents: PoWCaptchaRecord[],
	) {
		await this.connect();
		if (imageCaptchaEvents.length) {
			const result = await this.tables.commitment.bulkWrite(
				imageCaptchaEvents.map((doc) => {
					// remove the _id field to avoid problems when upserting
					const { _id, ...safeDoc } = doc;
					return {
						updateOne: {
							filter: { id: safeDoc.id },
							update: { $set: safeDoc },
							upsert: true,
						},
					};
				}),
			);
			logger.info("Mongo Saved Image Events", result);
		}
		if (powCaptchaEvents.length) {
			const result = await this.tables.powcaptcha.bulkWrite(
				powCaptchaEvents.map((doc) => {
					// remove the _id field to avoid problems when upserting
					const { _id, ...safeDoc } = doc;
					return {
						updateOne: {
							filter: { challenge: safeDoc.challenge },
							update: { $set: safeDoc },
							upsert: true,
						},
					};
				}),
			);
			logger.info("Mongo Saved PoW Events", result);
		}

		await this.close();
	}
}

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
import {
	type CaptchaProperties,
	type ICaptchaDatabase,
	type PoWCaptchaRecord,
	StoredPoWCaptchaRecordSchema,
	type StoredSession,
	StoredSessionRecordSchema,
	StoredUserCommitmentRecordSchema,
	type Tables,
	type UserCommitmentRecord,
} from "@prosopo/types-database";
import type { RootFilterQuery } from "mongoose";
import { MongoDatabase } from "../base/index.js";

const logger = getLogger("info", import.meta.url);

enum TableNames {
	frictionlessToken = "frictionlessToken",
	session = "session",
	commitment = "commitment",
	powcaptcha = "powcaptcha",
}

const CAPTCHA_TABLES = [
	{
		collectionName: TableNames.session,
		modelName: "Session",
		schema: StoredSessionRecordSchema,
	},
	{
		collectionName: TableNames.powcaptcha,
		modelName: "PowCaptcha",
		schema: StoredPoWCaptchaRecordSchema,
	},
	{
		collectionName: TableNames.commitment,
		modelName: "UserCommitment",
		schema: StoredUserCommitmentRecordSchema,
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
		sessionEvents: StoredSession[],
		imageCaptchaEvents: UserCommitmentRecord[],
		powCaptchaEvents: PoWCaptchaRecord[],
	) {
		await this.connect();
		if (sessionEvents.length) {
			const result = await this.tables.session.bulkWrite(
				sessionEvents.map((document) => {
					const { _id, ...safeDoc } = document;
					return {
						insertOne: {
							document: safeDoc,
						},
					};
				}),
			);
			logger.info(() => ({
				data: { 
					insertedCount: result.insertedCount,
					totalProcessed: sessionEvents.length 
				},
				msg: "Mongo Saved Session Events",
			}));
		}

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
			logger.info(() => ({
				data: { 
					upsertedCount: result.upsertedCount,
					matchedCount: result.matchedCount,
					modifiedCount: result.modifiedCount,
					totalProcessed: imageCaptchaEvents.length
				},
				msg: "Mongo Saved Image Events",
			}));
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
			logger.info(() => ({
				data: { 
					upsertedCount: result.upsertedCount,
					matchedCount: result.matchedCount,
					modifiedCount: result.modifiedCount,
					totalProcessed: powCaptchaEvents.length
				},
				msg: "Mongo Saved PoW Events",
			}));
		}

		await this.close();
	}

	async getCaptchas(
		filter: RootFilterQuery<CaptchaProperties> = {},
		limit = 100,
	): Promise<{
		userCommitmentRecords: UserCommitmentRecord[];
		powCaptchaRecords: PoWCaptchaRecord[];
	}> {
		await this.connect();

		try {
			const commitmentResults = await this.tables.commitment
				.find(filter)
				.limit(limit)
				.lean<UserCommitmentRecord[]>();

			const powCaptchaResults = await this.tables.powcaptcha
				.find(filter)
				.limit(limit)
				.lean<PoWCaptchaRecord[]>();

			return {
				userCommitmentRecords: commitmentResults,
				powCaptchaRecords: powCaptchaResults,
			};
		} catch (error) {
			throw new ProsopoDBError("DATABASE.QUERY_ERROR", {
				context: {
					error,
					filter,
					limit,
					failedFuncName: this.getCaptchas.name,
				},
				logger: this.logger,
			});
		} finally {
			await this.close();
		}
	}
}

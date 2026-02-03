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

import { type Logger, ProsopoDBError, getLogger } from "@prosopo/common";
import {
	type CaptchaProperties,
	type ICaptchaDatabase,
	type ImageCaptchaRecord,
	type PoWCaptchaRecord,
	StoredImageCaptchaRecordSchema,
	StoredPoWCaptchaRecordSchema,
	type StoredSession,
	StoredSessionRecordSchema,
	type Tables,
} from "@prosopo/types-database";
import type { RootFilterQuery } from "mongoose";
import { MongoDatabase } from "../base/index.js";

const logger = getLogger("info", import.meta.url);

enum TableNames {
	frictionlessToken = "frictionlessToken",
	session = "session",
	imagecaptcha = "imagecaptcha",
	powcaptcha = "powcaptcha",
	// Legacy collection name (deprecated)
	commitment = "commitment",
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
		collectionName: TableNames.imagecaptcha,
		modelName: "ImageCaptcha",
		schema: StoredImageCaptchaRecordSchema,
	},
];

export class CaptchaDatabase extends MongoDatabase implements ICaptchaDatabase {
	tables: Tables<TableNames>;
	private indexesEnsured = false;

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

	async ensureIndexes(): Promise<void> {
		const indexPromises: Promise<void>[] = [];
		if (!this.indexesEnsured) {
			CAPTCHA_TABLES.map(({ collectionName }) => {
				indexPromises.push(
					new Promise((resolve) => {
						if (this.connected) {
							this.tables[collectionName].collection.dropIndexes().then(() => {
								this.tables[collectionName]
									.ensureIndexes()
									.then(() => {
										resolve();
									})
									.catch((err) => {
										this.logger.warn(() => ({
											err,
											msg: `Error creating indexes for collection ${collectionName}`,
										}));
										resolve();
									});
							});
						} else {
							this.logger.info(() => ({
								msg: `Skipping index creation for collection ${collectionName} as not connected`,
							}));
							resolve();
						}
					}),
				);
			});
		}
		await Promise.all(indexPromises);
		this.indexesEnsured = true;
	}

	async saveCaptchas(
		sessionEvents: StoredSession[],
		imageCaptchaEvents: ImageCaptchaRecord[],
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
					totalProcessed: sessionEvents.length,
				},
				msg: "Mongo Saved Session Events",
			}));
		}

		if (imageCaptchaEvents.length) {
			const result = await this.tables.imagecaptcha.bulkWrite(
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
					totalProcessed: imageCaptchaEvents.length,
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
					totalProcessed: powCaptchaEvents.length,
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
		imageCaptchaRecords: ImageCaptchaRecord[];
		powCaptchaRecords: PoWCaptchaRecord[];
	}> {
		await this.connect();

		try {
			const commitmentResults = await this.tables.imagecaptcha
				.find(filter)
				.limit(limit)
				.lean<ImageCaptchaRecord[]>();

			const powCaptchaResults = await this.tables.powcaptcha
				.find(filter)
				.limit(limit)
				.lean<PoWCaptchaRecord[]>();

			return {
				imageCaptchaRecords: commitmentResults,
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

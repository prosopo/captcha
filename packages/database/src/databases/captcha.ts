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
import { type Logger, getLogger } from "@prosopo/logger";
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
import { Decimal128, Long } from "bson";

// Duck-typed check for BSON Long. Avoids `instanceof Long` because the
// MongoDB driver uses its bundled `bson` copy when deserialising, and
// hoisting differences across npm trees can put the `Long` class from
// this file's import on a different identity than the one stamped on
// the lean-doc values — which would silently skip the normalisation.
const isBsonLong = (value: unknown): boolean =>
	typeof value === "object" &&
	value !== null &&
	"_bsontype" in value &&
	(value as { _bsontype: string })._bsontype === "Long";
import type { RootFilterQuery } from "mongoose";
import { MongoDatabase } from "../base/index.js";

const logger = getLogger("info", "database:captcha");

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

	/**
	 * Convert a BSON `Long` (which Mongoose's Decimal128 caster rejects)
	 * into a Decimal128 with the *unsigned* numeric value — so a Long
	 * representing an IPv6 lower half with bit 63 set (signed Long shows
	 * as a negative integer) converts to a positive Decimal128 that
	 * matches what `bigint→string→Decimal128` would have produced if the
	 * schema setter had run on the original write.
	 *
	 * Production background: pipeline-form updates (`updateOne(filter,
	 * [{ $set: ... }])`) bypass Mongoose schema casting, so a `bigint`
	 * passed for an IP half is serialised by the driver as BSON Int64
	 * (Long) instead of going through the `Decimal128` setter. The
	 * central-streaming sweep below reads those docs via `.lean()` and
	 * tries to replay them with `bulkWrite`, but `bulkWrite` also skips
	 * setters — so the cast fires raw and throws. Normalising the lean
	 * doc here is the only place that's guaranteed to run before the
	 * bulkWrite sees it.
	 */
	private static normaliseCompositeIp<
		T extends { lower?: unknown; upper?: unknown } | undefined,
	>(ip: T): T {
		if (!ip) return ip;
		const normaliseHalf = (v: unknown): unknown => {
			if (isBsonLong(v)) {
				const lng = v as { low: number; high: number };
				return Decimal128.fromString(
					Long.fromBits(lng.low, lng.high, true).toString(),
				);
			}
			return v;
		};
		return {
			...ip,
			lower: normaliseHalf(ip.lower),
			upper: normaliseHalf(ip.upper),
		};
	}

	private static normaliseDocCompositeIps<
		T extends {
			ipAddress?: { lower?: unknown; upper?: unknown };
			providedIp?: { lower?: unknown; upper?: unknown };
		},
	>(doc: T): T {
		return {
			...doc,
			ipAddress: CaptchaDatabase.normaliseCompositeIp(doc.ipAddress),
			providedIp: CaptchaDatabase.normaliseCompositeIp(doc.providedIp),
		};
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
							document: CaptchaDatabase.normaliseDocCompositeIps(safeDoc),
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
			const result = await this.tables.commitment.bulkWrite(
				imageCaptchaEvents.map((doc) => {
					// remove the _id field to avoid problems when upserting
					const { _id, ...safeDoc } = doc;
					const normalised = CaptchaDatabase.normaliseDocCompositeIps(safeDoc);
					return {
						updateOne: {
							filter: { id: normalised.id },
							update: { $set: normalised },
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
					const normalised = CaptchaDatabase.normaliseDocCompositeIps(safeDoc);
					return {
						updateOne: {
							filter: { challenge: normalised.challenge },
							update: { $set: normalised },
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

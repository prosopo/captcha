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

import { createPrivateKey } from "node:crypto";
import { type Logger, ProsopoApiError } from "@prosopo/common";
import { CaptchaDatabase, ClientDatabase } from "@prosopo/database";
import {
	type IUserSettings,
	type ProsopoConfigOutput,
	ScheduledTaskNames,
	ScheduledTaskStatus,
	type Tier,
} from "@prosopo/types";
import {
	type ClientRecord,
	FrictionlessTokenRecord,
	type IProviderDatabase,
	type PoWCaptchaStored,
	type ScoreComponents,
	type SessionRecord,
	type StoredSession,
	type UserCommitment,
} from "@prosopo/types-database";
import type { FrictionlessTokenId } from "@prosopo/types-database";
import { parseUrl } from "@prosopo/util";
import type { OptionalId } from "mongodb";
import { validateSiteKey } from "../../api/validateAddress.js";

const isValidPrivateKey = (privateKeyString: string) => {
	const privateKey = Buffer.from(privateKeyString, "base64").toString("ascii");
	try {
		createPrivateKey({
			key: privateKey,
			format: "pem",
			type: "pkcs8",
		});
		return true;
	} catch (error) {
		return false;
	}
};

export class ClientTaskManager {
	config: ProsopoConfigOutput;
	logger: Logger;
	providerDB: IProviderDatabase;
	captchaDB: CaptchaDatabase | undefined;
	constructor(
		config: ProsopoConfigOutput,
		logger: Logger,
		db: IProviderDatabase,
	) {
		this.config = config;
		this.logger = logger;
		this.providerDB = db;
	}

	/**
	 * @description Get the captcha database connection or create a new one
	 * @returns CaptchaDatabase
	 */
	getCaptchaDB(mongoCaptchaUri: string): CaptchaDatabase {
		if (this.captchaDB) {
			return this.captchaDB;
		}
		if (!this.captchaDB) {
			this.captchaDB = new CaptchaDatabase(
				mongoCaptchaUri,
				undefined,
				undefined,
				this.logger,
			);
		}
		return this.captchaDB;
	}

	/**
	 * @description Store commitments externally in the database (Sends image captcha data to the big Mongo Cloud DB)
	 * @returns Promise<void>
	 */
	async storeCommitmentsExternal(): Promise<void> {
		if (!this.config.mongoCaptchaUri) {
			this.logger.info(() => ({ msg: "Mongo env not set" }));
			return;
		}

		const lastTask = await this.providerDB.getLastScheduledTaskStatus(
			ScheduledTaskNames.StoreCommitmentsExternal,
			ScheduledTaskStatus.Completed,
		);

		const taskID = await this.providerDB.createScheduledTaskStatus(
			ScheduledTaskNames.StoreCommitmentsExternal,
			ScheduledTaskStatus.Running,
		);

		try {
			const BATCH_SIZE = 1000;
			const captchaDB = this.getCaptchaDB(this.config.mongoCaptchaUri);

			// Process image commitments with cursor
			let processedCommitments = 0;

			await this.processBatchesWithCursor(
				async (skip: number) =>
					await this.providerDB.getUnstoredDappUserCommitments(
						BATCH_SIZE,
						skip,
					),
				async (batch) => {
					const filteredBatch = lastTask?.updated
						? batch.filter((commitment) => this.isRecordUpdated(commitment))
						: batch;

					if (filteredBatch.length > 0) {
						await captchaDB.saveCaptchas([], filteredBatch, []);
						await this.providerDB.markDappUserCommitmentsStored(
							filteredBatch.map((commitment) => commitment.id),
						);
					}
					processedCommitments += filteredBatch.length;
				},
			);

			// Process PoW records with cursor
			let processedPowRecords = 0;
			await this.processBatchesWithCursor(
				async (skip: number) =>
					await this.providerDB.getUnstoredDappUserPoWCommitments(
						BATCH_SIZE,
						skip,
					),
				async (batch) => {
					const filteredBatch = lastTask?.updated
						? batch.filter((record) => this.isRecordUpdated(record))
						: batch;

					if (filteredBatch.length > 0) {
						await captchaDB.saveCaptchas([], [], filteredBatch);
						await this.providerDB.markDappUserPoWCommitmentsStored(
							filteredBatch.map((record) => record.challenge),
						);
					}
					processedPowRecords += filteredBatch.length;
				},
			);

			// process session records with cursor
			let processedSessionRecords = 0;
			await this.processBatchesWithCursor(
				async (skip: number) =>
					await this.providerDB.getUnstoredSessionRecords(BATCH_SIZE, skip),
				async (batch) => {
					const filteredBatch = lastTask?.updated
						? batch.filter((record) => this.isRecordUpdated(record))
						: batch;
					// get corresponding frictionless scores
					const frictionlessTokenRecords =
						await this.providerDB.getFrictionlessTokenRecordsByTokenIds(
							filteredBatch.map((record) => record.tokenId),
						);
					this.logger.info(() => ({
						msg: `Frictionless token records: ${frictionlessTokenRecords.length}`,
					}));
					// attach scores to session records
					const filteredBatchWithScores = filteredBatch.map((record) => {
						const tokenRecord = frictionlessTokenRecords.find(
							(tokenRecord) =>
								tokenRecord._id?.toString() === record.tokenId.toString(),
						);
						if (!tokenRecord) {
							this.logger.error(() => ({
								msg: "No token record found",
								data: { tokenId: record.tokenId },
							}));
							return {
								...record,
								score: 0,
								scoreComponents: {
									baseScore: 0,
								},
								threshold: 0,
							} as StoredSession;
						}
						return {
							...record,
							score: tokenRecord?.score || 0,
							scoreComponents: tokenRecord?.scoreComponents,
							threshold: tokenRecord?.threshold || 0,
						} as StoredSession;
					});

					if (filteredBatch.length > 0) {
						await captchaDB.saveCaptchas(filteredBatchWithScores, [], []);
						await this.providerDB.markSessionRecordsStored(
							filteredBatch.map((record) => record.sessionId),
						);
					}
					processedSessionRecords += filteredBatch.length;
				},
			);

			await this.providerDB.updateScheduledTaskStatus(
				taskID,
				ScheduledTaskStatus.Completed,
				{
					data: {
						processedSessionRecords,
						processedCommitments,
						processedPowRecords,
					},
				},
			);
			this.captchaDB?.close();
		} catch (e: unknown) {
			this.logger.error(() => ({
				err: e,
				msg: "Error processing client tasks",
			}));
			this.captchaDB?.close();
			await this.providerDB.updateScheduledTaskStatus(
				taskID,
				ScheduledTaskStatus.Failed,
				{ error: String(e) },
			);
		}
	}

	/**
	 * @description Get a list of client accounts and their settings from the client database
	 * @returns Promise<void>
	 */
	async getClientList(): Promise<void> {
		if (!this.config.mongoClientUri) {
			this.logger.info(() => ({ msg: "Mongo env not set" }));
			return;
		}

		const lastTask = await this.providerDB.getLastScheduledTaskStatus(
			ScheduledTaskNames.GetClientList,
			ScheduledTaskStatus.Completed,
		);

		const taskID = await this.providerDB.createScheduledTaskStatus(
			ScheduledTaskNames.GetClientList,
			ScheduledTaskStatus.Running,
		);

		try {
			const clientDB = new ClientDatabase(
				this.config.mongoClientUri,
				undefined, // expected to come from URI
				undefined, // expected to come from URI
				this.logger,
			);

			// Get updated client records within a ten minute window of the last completed task
			const tenMinuteWindow = 10 * 60 * 1000;
			const updatedAtTimestamp = lastTask?.updated
				? lastTask.updated - tenMinuteWindow || 0
				: 0;

			this.logger.info(() => ({
				msg: `Getting updated client records since ${new Date(updatedAtTimestamp).toDateString()}`,
			}));

			const newClientRecords =
				await clientDB.getUpdatedClients(updatedAtTimestamp);

			if (newClientRecords) {
				await this.providerDB.updateClientRecords(newClientRecords);
			}

			await this.providerDB.updateScheduledTaskStatus(
				taskID,
				ScheduledTaskStatus.Completed,
				{
					data: {
						clientRecords: newClientRecords.length,
					},
				},
			);
		} catch (e: unknown) {
			const getClientListError = new ProsopoApiError("DATABASE.UNKNOWN", {
				context: { error: e },
				logger: this.logger,
			});
			this.logger.error(() => ({
				err: getClientListError,
				msg: "Error getting client list",
			}));
			await this.providerDB.updateScheduledTaskStatus(
				taskID,
				ScheduledTaskStatus.Failed,
				{ error: String(e) },
			);
		}
	}

	async registerSiteKey(
		siteKey: string,
		tier: Tier,
		settings: IUserSettings,
	): Promise<void> {
		validateSiteKey(siteKey);
		await this.providerDB.updateClientRecords([
			{
				account: siteKey,
				tier: tier,
				settings: settings,
			} as ClientRecord,
		]);
	}

	async updateDetectorKey(detectorKey: string): Promise<void> {
		if (!isValidPrivateKey(detectorKey)) {
			throw new ProsopoApiError("INVALID_DETECTOR_KEY", {
				context: { detectorKey },
				logger: this.logger,
			});
		}
		await this.providerDB.storeDetectorKey(detectorKey);
	}

	async removeDetectorKey(detectorKey: string): Promise<void> {
		if (!isValidPrivateKey(detectorKey)) {
			throw new ProsopoApiError("INVALID_DETECTOR_KEY", {
				context: { detectorKey },
				logger: this.logger,
			});
		}
		await this.providerDB.removeDetectorKey(detectorKey);
	}

	isSubdomainOrExactMatch(referrer: string, clientDomain: string): boolean {
		if (!referrer || !clientDomain) return false;
		if (clientDomain === "*") return true;
		try {
			const referrerDomain = parseUrl(referrer).hostname.replace(/\.$/, "");
			const allowedDomain = parseUrl(clientDomain).hostname.replace(/\.$/, "");

			return (
				referrerDomain === allowedDomain ||
				referrerDomain.endsWith(`.${allowedDomain}`)
			);
		} catch {
			this.logger.error(() => ({
				msg: "Error in isSubdomainOrExactMatch",
				data: { referrer, clientDomain },
			}));
			return false;
		}
	}

	private isRecordUpdated(
		record: UserCommitment | PoWCaptchaStored | SessionRecord,
	): boolean {
		const { lastUpdatedTimestamp, storedAtTimestamp } = record;
		return (
			!lastUpdatedTimestamp ||
			!storedAtTimestamp ||
			lastUpdatedTimestamp > storedAtTimestamp
		);
	}

	private async processBatchesWithCursor<T>(
		fetchBatch: (skip: number) => Promise<T[]>,
		processBatch: (batch: T[]) => Promise<void>,
	): Promise<void> {
		let skip = 0;
		while (true) {
			const batch = await fetchBatch(skip);
			if (!batch.length) break;

			await processBatch(batch);
			skip += batch.length;
		}
	}
}

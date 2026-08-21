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

import { createPrivateKey } from "node:crypto";
import { ProsopoApiError } from "@prosopo/common";
import { CaptchaDatabase, ClientDatabase } from "@prosopo/database";
import type { Logger } from "@prosopo/logger";
import {
	type DecisionMachineCaptchaType,
	type DecisionMachineKind,
	type DecisionMachineLanguage,
	type DecisionMachineRuntime,
	DecisionMachineScope,
	type IUserSettings,
	type PoWCaptchaStored,
	type ProsopoConfigOutput,
	ScheduledTaskNames,
	ScheduledTaskStatus,
	Tier,
	type UserCommitment,
} from "@prosopo/types";
import type {
	ClientRecord,
	IProviderDatabase,
	SessionRecord,
} from "@prosopo/types-database";
import { parseUrl } from "@prosopo/util";
import { validateSiteKey } from "../../api/validateAddress.js";
import {
	invalidateAllDecisionMachineArtifactCaches,
	invalidateDecisionMachineScriptCache,
} from "../decisionMachine/decisionMachineRunner.js";

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
			// Captured once at sweep start. Passed through to markXxxStored as
			// the guard cutoff so any record mutated after this point keeps
			// `pendingStage: true` and is picked up on the next sweep.
			const sweepStartedAt = new Date();

			// Process image commitments with cursor
			let processedCommitments = 0;

			await this.processBatchesWithCursor(
				async (afterId?: unknown) =>
					await this.providerDB.getUnstoredDappUserCommitments(
						BATCH_SIZE,
						afterId,
					),
				async (batch) => {
					const filteredBatch = (
						lastTask?.updated
							? batch.filter((commitment) => this.isRecordUpdated(commitment))
							: batch
					).filter((commitment) => commitment.id !== "");
					// Skip placeholder records — `storePendingImageCommitment`
					// inserts with `id: ""` until the user submits a solution.
					// Defense in depth: even if a stray placeholder slips into
					// the partial index, never pass `id: ""` to
					// markDappUserCommitmentsStored — Mongo collapses
					// `{ id: { $in: ["", "", ...] } }` to a single empty-string
					// bound and the IXSCAN on `id_-1` then walks every
					// empty-id document on the node (~100K rows).

					if (filteredBatch.length > 0) {
						await captchaDB.saveCaptchas([], filteredBatch, []);
						await this.providerDB.markDappUserCommitmentsStored(
							filteredBatch.map((commitment) => commitment.id),
							sweepStartedAt,
						);
					}
					processedCommitments += filteredBatch.length;
				},
				(row) => (row as { _id?: unknown })._id,
			);

			// Process PoW records with cursor
			let processedPowRecords = 0;
			await this.processBatchesWithCursor(
				async (afterId?: unknown) =>
					await this.providerDB.getUnstoredDappUserPoWCommitments(
						BATCH_SIZE,
						afterId,
					),
				async (batch) => {
					const filteredBatch = lastTask?.updated
						? batch.filter((record) => this.isRecordUpdated(record))
						: batch;

					if (filteredBatch.length > 0) {
						await captchaDB.saveCaptchas([], [], filteredBatch);
						await this.providerDB.markDappUserPoWCommitmentsStored(
							filteredBatch.map((record) => record.challenge),
							sweepStartedAt,
						);
					}
					processedPowRecords += filteredBatch.length;
				},
				(row) => (row as { _id?: unknown })._id,
			);

			// process session records with cursor
			let processedSessionRecords = 0;
			await this.processBatchesWithCursor(
				async (afterId?: unknown) =>
					await this.providerDB.getUnstoredSessionRecords(BATCH_SIZE, afterId),
				async (batch) => {
					const filteredBatch = lastTask?.updated
						? batch.filter((record) => this.isRecordUpdated(record))
						: batch;

					if (filteredBatch.length > 0) {
						await captchaDB.saveCaptchas(filteredBatch, [], []);
						await this.providerDB.markSessionRecordsStored(
							filteredBatch.map((record) => record.sessionId),
							sweepStartedAt,
						);
					}
					processedSessionRecords += filteredBatch.length;
				},
				(row) => (row as { _id?: unknown })._id,
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

			// Handle non-existent or invalid last updated times (were previously numbers). Delete this code after a few runs.
			const updatedAtTimestamp = (() => {
				const raw = lastTask?.updated;
				if (!raw) return 0;
				const ts =
					raw instanceof Date ? raw.getTime() : Date.parse(String(raw));
				if (Number.isNaN(ts)) return 0;
				return Math.max(ts - tenMinuteWindow, 0);
			})();

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

	async registerSiteKeys(
		siteKeys: Array<{ siteKey: string; tier: Tier; settings: IUserSettings }>,
	): Promise<void> {
		const records: ClientRecord[] = [];
		for (const { siteKey, tier, settings } of siteKeys) {
			validateSiteKey(siteKey);
			records.push({
				account: siteKey,
				tier,
				settings,
			} as ClientRecord);
		}
		await this.providerDB.updateClientRecords(records);
	}

	async removeSiteKey(siteKey: string): Promise<void> {
		validateSiteKey(siteKey);
		await this.providerDB.removeClientRecords([siteKey]);
	}

	async removeSiteKeys(siteKeys: Array<{ siteKey: string }>): Promise<void> {
		const accounts: string[] = [];
		for (const { siteKey } of siteKeys) {
			validateSiteKey(siteKey);
			accounts.push(siteKey);
		}
		await this.providerDB.removeClientRecords(accounts);
	}

	async updateDecisionMachine(
		scope: DecisionMachineScope,
		runtime: DecisionMachineRuntime,
		source: string,
		dappAccount?: string,
		language?: DecisionMachineLanguage,
		name?: string,
		version?: string,
		captchaType?: DecisionMachineCaptchaType,
		kind?: DecisionMachineKind,
	): Promise<{
		scope: DecisionMachineScope;
		dappAccount?: string;
		kind?: DecisionMachineKind;
		updatedAt: string;
	}> {
		if (scope === DecisionMachineScope.Dapp && !dappAccount) {
			throw new ProsopoApiError("API.BAD_REQUEST", {
				context: { scope, dappAccount },
				logger: this.logger,
			});
		}

		const now = new Date();
		await this.providerDB.upsertDecisionMachineArtifact({
			scope,
			dappAccount,
			kind,
			runtime,
			language,
			source,
			name,
			version,
			captchaType,
			createdAt: now,
			updatedAt: now,
		});

		// Flush both DM caches so the new artifact + source take effect on the
		// next request instead of waiting for TTL. Script cache is content-
		// addressed (a new source gets a new key) so `clear()` is defensive
		// against a source that reuses a prior SHA; the artifact cache is
		// keyed by (scope, kind, dappAccount) so a same-key overwrite would
		// otherwise return stale for up to 5 minutes.
		invalidateAllDecisionMachineArtifactCaches();
		invalidateDecisionMachineScriptCache();

		return {
			scope,
			dappAccount,
			kind,
			updatedAt: now.toISOString(),
		};
	}

	async getAllDecisionMachines(): Promise<
		{
			_id: string;
			scope: DecisionMachineScope;
			dappAccount?: string;
			kind?: DecisionMachineKind;
			runtime: DecisionMachineRuntime;
			language?: DecisionMachineLanguage;
			name?: string;
			version?: string;
			captchaType?: DecisionMachineCaptchaType;
			source: string;
			createdAt: string;
			updatedAt: string;
		}[]
	> {
		const artifacts = await this.providerDB.getAllDecisionMachineArtifacts();
		return artifacts.map((artifact) => ({
			_id: artifact._id.toString(),
			scope: artifact.scope,
			dappAccount: artifact.dappAccount,
			kind: artifact.kind,
			runtime: artifact.runtime,
			language: artifact.language,
			name: artifact.name,
			version: artifact.version,
			captchaType: artifact.captchaType,
			source: artifact.source,
			createdAt: artifact.createdAt.toISOString(),
			updatedAt: artifact.updatedAt.toISOString(),
		}));
	}

	async getDecisionMachine(id: string): Promise<{
		_id: string;
		scope: DecisionMachineScope;
		dappAccount?: string;
		kind?: DecisionMachineKind;
		runtime: DecisionMachineRuntime;
		language?: DecisionMachineLanguage;
		source: string;
		name?: string;
		version?: string;
		captchaType?: DecisionMachineCaptchaType;
		createdAt: string;
		updatedAt: string;
	}> {
		const artifact = await this.providerDB.getDecisionMachineArtifactById(id);
		if (!artifact) {
			throw new ProsopoApiError("API.BAD_REQUEST", {
				context: { id },
				logger: this.logger,
			});
		}
		return {
			_id: artifact._id.toString(),
			scope: artifact.scope,
			dappAccount: artifact.dappAccount,
			kind: artifact.kind,
			runtime: artifact.runtime,
			language: artifact.language,
			source: artifact.source,
			name: artifact.name,
			version: artifact.version,
			captchaType: artifact.captchaType,
			createdAt: artifact.createdAt.toISOString(),
			updatedAt: artifact.updatedAt.toISOString(),
		};
	}

	async removeDecisionMachine(id: string): Promise<{
		success: boolean;
		deletedId: string;
	}> {
		const success = await this.providerDB.removeDecisionMachineArtifact(id);
		if (!success) {
			throw new ProsopoApiError("API.BAD_REQUEST", {
				context: { id, message: "Decision machine not found" },
				logger: this.logger,
			});
		}
		return {
			success,
			deletedId: id,
		};
	}

	async removeAllDecisionMachines(): Promise<{
		success: boolean;
		deletedCount: number;
	}> {
		const deletedCount =
			await this.providerDB.removeAllDecisionMachineArtifacts();
		return {
			success: true,
			deletedCount,
		};
	}
	/**
	 * Matches a request referrer against an allowed domain pattern.
	 * Supports global '*', subdomain '*.example.com', glob '*example*',
	 * plain domains (exact or subdomain), and 'localhost'.
	 */
	domainPatternMatcher(referrer: string, clientDomain: string): boolean {
		if (!referrer || !clientDomain) return false;
		try {
			const referrerHost = parseUrl(referrer).hostname.replace(/\.$/, "");
			const pattern = clientDomain.trim().toLowerCase();

			// Global wildcard
			if (pattern === "*") return true;

			// Localhost allowance
			if (pattern === "localhost") {
				return (
					referrerHost === "localhost" || referrerHost.startsWith("localhost:")
				);
			}

			// Subdomain wildcard: *.example.com
			if (pattern.startsWith("*.")) {
				const suffix = pattern.slice(2);
				const allowed = parseUrl(suffix).hostname.replace(/\.$/, "");
				return referrerHost.endsWith(`.${allowed}`) || referrerHost === allowed;
			}

			// General glob pattern: convert * to .*
			if (pattern.includes("*")) {
				const escaped = pattern
					.replace(/[.+?^${}()|\[\]\\]/g, "\\$&")
					.replace(/\*/g, ".*");
				const regex = new RegExp(`^${escaped}$`, "i");
				return regex.test(referrerHost);
			}

			// Exact or subdomain match for plain domains
			const allowedHost = parseUrl(pattern).hostname.replace(/\.$/, "");
			return (
				referrerHost === allowedHost || referrerHost.endsWith(`.${allowedHost}`)
			);
		} catch (e) {
			this.logger.error(() => ({
				msg: "Error in domainPatternMatcher",
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
			lastUpdatedTimestamp.getTime() > storedAtTimestamp.getTime()
		);
	}

	/**
	 * Drive a keyset-paginated sweep. Each iteration passes the `_id` of the
	 * previous batch's last row to `fetchBatch` so the query resumes from
	 * `_id > afterId` — see `getUnstoredDappUserCommitments` for why we
	 * moved off `skip(N)`. `getLastId` extracts the resumption cursor from
	 * a batch row; both `PoWCaptchaRecord` and `UserCommitmentRecord` are
	 * `mongoose.Document` subtypes so `_id` is always present at runtime
	 * even though our stored types don't spell it out.
	 */
	private async processBatchesWithCursor<T>(
		fetchBatch: (afterId?: unknown) => Promise<T[]>,
		processBatch: (batch: T[]) => Promise<void>,
		getLastId: (row: T) => unknown,
	): Promise<void> {
		let afterId: unknown | undefined;
		while (true) {
			const batch = await fetchBatch(afterId);
			if (!batch.length) break;

			await processBatch(batch);
			const last = batch[batch.length - 1];
			if (last === undefined) break;
			const nextId = getLastId(last);
			if (nextId === undefined) break;
			afterId = nextId;
		}
	}
}

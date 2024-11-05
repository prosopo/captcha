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

import { validateAddress } from "@polkadot/util-crypto/address";
import type { Logger } from "@prosopo/common";
import { CaptchaDatabase, ClientDatabase } from "@prosopo/database";
import {
	type IUserSettings,
	type ProsopoConfigOutput,
	ScheduledTaskNames,
	ScheduledTaskStatus,
} from "@prosopo/types";
import {
	BlockRuleType,
	type ClientRecord,
	type IPAddressBlockRule,
	type IProviderDatabase,
	type PoWCaptchaStored,
	type UserAccountBlockRule,
	type UserCommitment,
} from "@prosopo/types-database";
import { getIPAddress } from "../../util.js";

export class ClientTaskManager {
	config: ProsopoConfigOutput;
	logger: Logger;
	providerDB: IProviderDatabase;
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
	 * @description Store commitments externally in the database
	 * @returns Promise<void>
	 */
	async storeCommitmentsExternal(): Promise<void> {
		if (!this.config.mongoCaptchaUri) {
			this.logger.info("Mongo env not set");
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
			const captchaDB = new CaptchaDatabase(
				this.config.mongoCaptchaUri,
				undefined,
				undefined,
				this.logger,
			);

			// Process image commitments with cursor
			let processedCommitments = 0;
			await this.processBatchesWithCursor(
				async (skip: number) =>
					await this.providerDB.getUnstoredDappUserCommitments(
						BATCH_SIZE,
						skip,
					),
				async (batch) => {
					const lastUpdated = lastTask?.updated || 0;
					const filteredBatch = lastTask?.updated
						? batch.filter((commitment) => this.isCommitmentUpdated(commitment))
						: batch;

					if (filteredBatch.length > 0) {
						await captchaDB.saveCaptchas(filteredBatch, []);
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
					const lastUpdated = lastTask?.updated || 0;
					const filteredBatch = lastTask?.updated
						? batch.filter((record) => this.isCommitmentUpdated(record))
						: batch;

					if (filteredBatch.length > 0) {
						await captchaDB.saveCaptchas([], filteredBatch);
						await this.providerDB.markDappUserPoWCommitmentsStored(
							filteredBatch.map((record) => record.challenge),
						);
					}
					processedPowRecords += filteredBatch.length;
				},
			);

			await this.providerDB.updateScheduledTaskStatus(
				taskID,
				ScheduledTaskStatus.Completed,
				{
					data: {
						processedCommitments,
						processedPowRecords,
					},
				},
			);
		} catch (e: unknown) {
			this.logger.error(e);
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
			this.logger.info("Mongo env not set");
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

			const updatedAtTimestamp = lastTask ? lastTask.updated || 0 : 0;

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
						clientRecords: newClientRecords.map((c: ClientRecord) => c.account),
					},
				},
			);
		} catch (e: unknown) {
			this.logger.error(e);
			await this.providerDB.updateScheduledTaskStatus(
				taskID,
				ScheduledTaskStatus.Failed,
				{ error: String(e) },
			);
		}
	}

	async registerSiteKey(
		siteKey: string,
		settings: IUserSettings,
	): Promise<void> {
		console.log(settings);
		await this.providerDB.updateClientRecords([
			{
				account: siteKey,
				settings: settings,
			} as ClientRecord,
		]);
	}

	async addIPBlockRules(
		ips: string[],
		global: boolean,
		hardBlock: boolean,
		dappAccount?: string,
	): Promise<void> {
		const rules: IPAddressBlockRule[] = ips.map((ip) => {
			return {
				ip: Number(getIPAddress(ip).bigInt()),
				global,
				type: BlockRuleType.ipAddress,
				dappAccount,
				hardBlock,
			};
		});
		await this.providerDB.storeIPBlockRuleRecords(rules);
	}

	async addUserBlockRules(
		userAccounts: string[],
		hardBlock: boolean,
		dappAccount: string,
	): Promise<void> {
		validateAddress(dappAccount, false, 42);
		const rules: UserAccountBlockRule[] = userAccounts.map((userAccount) => {
			validateAddress(userAccount, false, 42);
			return {
				dappAccount,
				userAccount,
				type: BlockRuleType.userAccount,
				// TODO don't store global on these
				global: false,
				hardBlock,
			};
		});
		await this.providerDB.storeUserBlockRuleRecords(rules);
	}

	isSubdomainOrExactMatch(referrer: string, clientDomain: string): boolean {
		if (!referrer || !clientDomain) return false;
		try {
			const cleanReferrer = referrer.toLowerCase().trim().replace(/\/+$/, "");
			const cleanAllowedInput = clientDomain
				.toLowerCase()
				.trim()
				.replace(/\/+$/, "");

			// Extract domain from URL if necessary
			const getDomain = (url: string) => {
				try {
					// If it's a full URL, use URL parser
					if (url.includes("://")) {
						return new URL(url).hostname;
					}
					// Otherwise, clean up any paths or ports
					const parts = url.split("/");
					if (!parts[0]) return url;
					const hostParts = parts[0].split(":");
					if (!hostParts[0]) return url;
					return hostParts[0];
				} catch {
					return url;
				}
			};

			const referrerDomain = getDomain(cleanReferrer).replace(/\.$/, "");
			const allowedDomain = getDomain(cleanAllowedInput).replace(/\.$/, "");

			console.log(referrerDomain, allowedDomain);

			// Special case for localhost
			if (referrerDomain === "localhost") return true;

			return (
				referrerDomain === allowedDomain ||
				referrerDomain.endsWith(`.${allowedDomain}`)
			);
		} catch {
			return false;
		}
	}

	private isCommitmentUpdated(
		commitment: UserCommitment | PoWCaptchaStored,
	): boolean {
		const { lastUpdatedTimestamp, storedAtTimestamp } = commitment;
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

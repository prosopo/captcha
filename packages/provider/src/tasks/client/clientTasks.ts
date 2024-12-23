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
import { type Logger, ProsopoApiError } from "@prosopo/common";
import { CaptchaDatabase, ClientDatabase } from "@prosopo/database";
import {
	type AddBlockRulesIP,
	type AddBlockRulesUser,
	BlockRuleType,
	type IUserSettings,
	type ProsopoConfigOutput,
	type RemoveBlockRulesIP,
	type RemoveBlockRulesUser,
	ScheduledTaskNames,
	ScheduledTaskStatus,
} from "@prosopo/types";
import type {
	ClientRecord,
	IPAddressBlockRule,
	IProviderDatabase,
	PoWCaptchaStored,
	UserAccountBlockRule,
	UserCommitment,
} from "@prosopo/types-database";
import { parseUrl } from "@prosopo/util";
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

			const updatedAtTimestamp = 0;

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
			const getClientListError = new ProsopoApiError("DATABASE.UNKNOWN", {
				context: { error: e },
				logger: this.logger,
			});
			this.logger.error(getClientListError, { context: { error: e } });
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
		await this.providerDB.updateClientRecords([
			{
				account: siteKey,
				settings: settings,
			} as ClientRecord,
		]);
	}

	/**
	 * @description Add IP block rules to the database. Allows specifying mutiple IPs for a single configuration
	 * @param {AddBlockRulesIP} opts
	 */
	async addIPBlockRules(opts: AddBlockRulesIP): Promise<void> {
		const rules: IPAddressBlockRule[] = opts.ips.map((ip) => {
			return {
				ip: Number(getIPAddress(ip).bigInt()),
				global: opts.global,
				type: BlockRuleType.ipAddress,
				dappAccount: opts.dappAccount,
				hardBlock: opts.hardBlock,
				...(opts.captchaConfig && { captchaConfig: opts.captchaConfig }),
			};
		});
		await this.providerDB.storeIPBlockRuleRecords(rules);
	}

	/**
	 * @description Remove IP block rules from the database by IP address and optionally dapp account
	 * @param {RemoveBlockRulesIP} opts
	 */
	async removeIPBlockRules(opts: RemoveBlockRulesIP): Promise<void> {
		await this.providerDB.removeIPBlockRuleRecords(
			opts.ips.map((ip) => getIPAddress(ip).bigInt()),
			opts.dappAccount,
		);
	}

	/**
	 * @description Add user block rules to the database. Allows specifying multiple users for a single configuration
	 * @param {AddBlockRulesUser} opts
	 */
	async addUserBlockRules(opts: AddBlockRulesUser): Promise<void> {
		validateAddress(opts.dappAccount, false, 42);
		const rules: UserAccountBlockRule[] = opts.users.map((userAccount) => {
			validateAddress(userAccount, false, 42);
			return {
				dappAccount: opts.dappAccount,
				userAccount,
				type: BlockRuleType.userAccount,
				global: opts.global,
				hardBlock: opts.hardBlock,
				...(opts.captchaConfig && { captchaConfig: opts.captchaConfig }),
			};
		});
		await this.providerDB.storeUserBlockRuleRecords(rules);
	}

	/**
	 * @description Remove user block rules from the database by user account and optionally dapp account
	 * @param {RemoveBlockRulesUser} opts
	 */
	async removeUserBlockRules(opts: RemoveBlockRulesUser): Promise<void> {
		if (opts.dappAccount) {
			validateAddress(opts.dappAccount, false, 42);
			await this.providerDB.removeUserBlockRuleRecords(
				opts.users,
				opts.dappAccount,
			);
		} else {
			await this.providerDB.removeUserBlockRuleRecords(opts.users);
		}
	}

	isSubdomainOrExactMatch(referrer: string, clientDomain: string): boolean {
		if (!referrer || !clientDomain) return false;
		if (clientDomain === "*") return true;
		try {
			const referrerDomain = parseUrl(referrer).hostname.replace(/\.$/, "");
			const allowedDomain = parseUrl(clientDomain).hostname.replace(/\.$/, "");

			// Special case for localhost
			if (referrerDomain === "localhost") return true;

			return (
				referrerDomain === allowedDomain ||
				referrerDomain.endsWith(`.${allowedDomain}`)
			);
		} catch {
			this.logger.error({
				message: "Error in isSubdomainOrExactMatch",
				context: { referrer, clientDomain },
			});
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

	private cleanReferrer(referrer: string): string {
		const lowered = referrer.toLowerCase().trim();

		// Remove trailing slashes safely
		let cleaned = lowered;
		const MAX_SLASHES = 10;
		let slashCount = 0;

		while (cleaned.endsWith("/") && slashCount < MAX_SLASHES) {
			cleaned = cleaned.slice(0, -1);
			slashCount++;
		}

		return cleaned;
	}
}

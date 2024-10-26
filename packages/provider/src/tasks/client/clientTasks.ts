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

import type { Logger } from "@prosopo/common";
import { CaptchaDatabase, ClientDatabase } from "@prosopo/database";
import {
	type IUserSettings,
	type ProsopoConfigOutput,
	ScheduledTaskNames,
	ScheduledTaskStatus,
} from "@prosopo/types";
import type {
	BlockRule,
	ClientRecord,
	IProviderDatabase,
	PoWCaptchaStored,
	UserCommitment,
} from "@prosopo/types-database";
import {Address6} from "ip-address"
import {getIPAddress} from "../../util.js";

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
			let commitments = await this.providerDB.getUnstoredDappUserCommitments();

			let powRecords =
				await this.providerDB.getUnstoredDappUserPoWCommitments();

			// filter to only get records that have been updated since the last task
			if (lastTask?.updated) {
				this.logger.info(
					`Filtering records to only get updated records: ${JSON.stringify(lastTask)}`,
				);
				this.logger.info(
					"Last task ran at ",
					new Date(lastTask.updated || 0),
					"Task ID",
					taskID,
				);

				const isCommitmentUpdated = (
					commitment: UserCommitment | PoWCaptchaStored,
				): boolean => {
					const { lastUpdatedTimestamp, storedAtTimestamp } = commitment;
					return (
						!lastUpdatedTimestamp ||
						!storedAtTimestamp ||
						lastUpdatedTimestamp > storedAtTimestamp
					);
				};

				const commitmentUpdated = (
					commitment: UserCommitment | PoWCaptchaStored,
				): boolean => {
					return !!lastTask.updated && isCommitmentUpdated(commitment);
				};

				commitments = commitments.filter((commitment) =>
					commitmentUpdated(commitment),
				);

				powRecords = powRecords.filter((commitment) =>
					commitmentUpdated(commitment),
				);
			}

			if (commitments.length || powRecords.length) {
				this.logger.info(
					`Storing ${commitments.length} commitments externally`,
				);

				this.logger.info(
					`Storing ${powRecords.length} pow challenges externally`,
				);

				const captchaDB = new CaptchaDatabase(
					this.config.mongoCaptchaUri,
					undefined,
					undefined,
					this.logger,
				);

				await captchaDB.saveCaptchas(commitments, powRecords);

				await this.providerDB.markDappUserCommitmentsStored(
					commitments.map((commitment) => commitment.id),
				);
				await this.providerDB.markDappUserPoWCommitmentsStored(
					powRecords.map((powRecords) => powRecords.challenge),
				);
			}
			await this.providerDB.updateScheduledTaskStatus(
				taskID,
				ScheduledTaskStatus.Completed,
				{
					data: {
						commitments: commitments.map((c) => c.id),
						powRecords: powRecords.map((pr) => pr.challenge),
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
		await this.providerDB.updateClientRecords([
			{
				account: siteKey,
				settings: settings,
			} as ClientRecord,
		]);
	}

	async addBlockRules(ips: string[], global: boolean): Promise<void> {
		const rules: BlockRule[] = ips.map((ip) => ({ ipAddress: getIPAddress(ip).bigInt(), global }));
		await this.providerDB.storeBlockRuleRecords(rules);
	}
}

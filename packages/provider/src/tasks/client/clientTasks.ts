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
	IUserSettings,
	type ProsopoConfigOutput,
	ScheduledTaskNames,
	ScheduledTaskStatus,
} from "@prosopo/types";
import type { ClientRecord, IProviderDatabase } from "@prosopo/types-database";

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

		console.log("\n ---- \n lastTask \n ---- \n", lastTask);

		const taskID = await this.providerDB.createScheduledTaskStatus(
			ScheduledTaskNames.StoreCommitmentsExternal,
			ScheduledTaskStatus.Running,


		);

		console.log("\n ---- \n taskID \n ---- \n", taskID);

		try {
			let commitments = await this.providerDB.getUnstoredDappUserCommitments();

			console.log("\n ---- \n commitments \n ---- \n", commitments);

			let powRecords =
				await this.providerDB.getUnstoredDappUserPoWCommitments();

			console.log("\n ---- \n powRecords \n ---- \n", powRecords);

			// filter to only get records that have been updated since the last task
			if (lastTask) {
				this.logger.info(
					`Filtering records to only get updated records: ${JSON.stringify(lastTask)}`,
				);
				this.logger.info(
					"Last task ran at ",
					new Date(lastTask.updated || 0),
					"Task ID",
					taskID,
				);

				commitments = commitments.filter(
					(commitment) =>
						lastTask.updated &&
						commitment.lastUpdatedTimestamp &&
						(commitment.lastUpdatedTimestamp > lastTask.updated ||
							!commitment.lastUpdatedTimestamp),
				);

				powRecords = powRecords.filter((commitment) => {
					return (
						lastTask.updated &&
						commitment.lastUpdatedTimestamp &&
						// either the update stamp is more recent than the last time this task ran or there is no update stamp,
						// so it is a new record
						(commitment.lastUpdatedTimestamp > lastTask.updated ||
							!commitment.lastUpdatedTimestamp)
					);
				});

				console.log("\n ---- \n commitments \n ---- \n", commitments);

				console.log("\n ---- \n powRecords \n ---- \n", powRecords);

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

			console.log("updatedAtTimestamp", updatedAtTimestamp);

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

	async registerSiteKey(siteKey: string, settings: IUserSettings): Promise<void> {
		console.log("\n ---- \n dbnam \n ---- \n", siteKey);
		await this.providerDB.updateClientRecords([
			{
				account: siteKey,
				settings: settings,
			} as ClientRecord,
		]);
	}
}

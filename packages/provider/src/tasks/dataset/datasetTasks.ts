import type { Logger } from "@prosopo/common";
import { saveCaptchaEvent, saveCaptchas } from "@prosopo/database";
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
import { parseCaptchaDataset } from "@prosopo/datasets";
import {
  CaptchaConfig,
  DatasetRaw,
  ProsopoConfigOutput,
  ScheduledTaskNames,
  ScheduledTaskStatus,
  StoredEvents,
} from "@prosopo/types";
import type { Database } from "@prosopo/types-database";
import { providerValidateDataset } from "./datasetTasksUtils.js";

export class DatasetManager {
  config: ProsopoConfigOutput;
  logger: Logger;
  captchaConfig: CaptchaConfig;
  db: Database;

  constructor(
    config: ProsopoConfigOutput,
    logger: Logger,
    captchaConfig: CaptchaConfig,
    db: Database,
  ) {
    this.config = config;
    this.logger = logger;
    this.captchaConfig = captchaConfig;
    this.db = db;
  }

  /**
   * @description Set the provider dataset from a file
   *
   * @param file JSON of the captcha dataset
   */
  async providerSetDatasetFromFile(file: JSON): Promise<void> {
    const datasetRaw = parseCaptchaDataset(file);
    return await this.providerSetDataset(datasetRaw);
  }

  async providerSetDataset(datasetRaw: DatasetRaw): Promise<void> {
    const dataset = await providerValidateDataset(
      datasetRaw,
      this.captchaConfig.solved.count,
      this.captchaConfig.unsolved.count,
    );

    await this.db?.storeDataset(dataset);
  }

  /**
   * @description Save captcha user events to external db
   *
   * **Note:** This is only used in development mode
   *
   * @param events
   * @param accountId
   * @returns
   */
  async saveCaptchaEvent(events: StoredEvents, accountId: string) {
    if (!this.config.devOnlyWatchEvents || !this.config.mongoEventsUri) {
      this.logger.info("Dev watch events not set to true, not saving events");
      return;
    }
    await saveCaptchaEvent(events, accountId, this.config.mongoEventsUri);
  }

  /**
   * @description Store commitments externally in the database
   * @returns
   */
  async storeCommitmentsExternal(): Promise<void> {
    if (!this.config.mongoCaptchaUri) {
      this.logger.info("Mongo env not set");
      return;
    }

    const taskID = await this.db.createScheduledTaskStatus(
      ScheduledTaskNames.StoreCommitmentsExternal,
      ScheduledTaskStatus.Running,
    );

    const lastTask = await this.db.getLastScheduledTaskStatus(
      ScheduledTaskNames.StoreCommitmentsExternal,
      ScheduledTaskStatus.Completed,
    );

    try {
      let commitments = await this.db.getUnstoredDappUserCommitments();

      let powRecords = await this.db.getUnstoredDappUserPoWCommitments();

      // filter to only get records that have been updated since the last task
      if (lastTask) {
        this.logger.info(
          `Filtering records to only get updated records: ${JSON.stringify(lastTask)}`,
        );
        commitments = commitments.filter(
          (commitment) =>
            lastTask.updated &&
            lastTask.updated &&
            commitment.lastUpdatedTimestamp &&
            commitment.lastUpdatedTimestamp > lastTask.updated &&
            !lastTask.result?.data.commitments.includes(commitment.id),
        );
        powRecords = powRecords.filter(
          (commitment) =>
            lastTask.updated &&
            commitment.lastUpdatedTimestamp &&
            commitment.lastUpdatedTimestamp > lastTask.updated &&
            !lastTask.result?.data.powRecords.includes(commitment.challenge),
        );
      }

      this.logger.info(`Storing ${commitments.length} commitments externally`);

      this.logger.info(
        `Storing ${powRecords.length} pow challenges externally`,
      );

      await saveCaptchas(commitments, powRecords, this.config.mongoCaptchaUri);

      await this.db.markDappUserCommitmentsStored(
        commitments.map((commitment) => commitment.id),
      );
      await this.db.markDappUserPoWCommitmentsStored(
        powRecords.map((powRecords) => powRecords.challenge),
      );

      await this.db.updateScheduledTaskStatus(
        taskID,
        ScheduledTaskStatus.Completed,
        {
          data: {
            commitments: commitments.map((c) => c.id),
            powRecords: powRecords.map((pr) => pr.challenge),
          },
        },
      );
    } catch (e: any) {
      this.logger.error(e);
      await this.db.updateScheduledTaskStatus(
        taskID,
        ScheduledTaskStatus.Failed,
        { error: e.toString() },
      );
    }
  }
}

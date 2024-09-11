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

import type { KeyringPair } from "@polkadot/keyring/types";
import { ProviderEnvironment } from "@prosopo/env";
import { type ProsopoConfigOutput, ScheduledTaskNames } from "@prosopo/types";
import { CronJob } from "cron";
import { Tasks } from "../tasks/tasks.js";
import { checkIfTaskIsRunning } from "../util.js";

/**
 * Get the list of registered clients that have access to the product on a schedule.
 * @param pair
 * @param config
 */
export async function getClientList(
	pair: KeyringPair,
	config: ProsopoConfigOutput,
) {
	const env = new ProviderEnvironment(config, pair);
	await env.isReady();

	const tasks = new Tasks(env);

	// Set the cron schedule to run on user configured schedule or every hour
	const defaultSchedule = "0 * * * *";
	const cronSchedule = config.scheduledTasks?.clientListScheduler
		? config.scheduledTasks.clientListScheduler.schedule
			? config.scheduledTasks.clientListScheduler.schedule
			: defaultSchedule
		: defaultSchedule;

	const job = new CronJob(cronSchedule, async () => {
		const taskRunning = await checkIfTaskIsRunning(
			ScheduledTaskNames.GetClientList,
			env.getDb(),
		);
		env.logger.info(
			`${ScheduledTaskNames.GetClientList} task running: ${taskRunning}`,
		);
		if (!taskRunning) {
			env.logger.info(`${ScheduledTaskNames.GetClientList} task....`);
			await tasks.clientTaskManager.getClientList().catch((err) => {
				env.logger.error(err);
			});
		}
	});

	job.start();
}

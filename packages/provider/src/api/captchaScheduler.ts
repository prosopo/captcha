import type { KeyringPair } from "@polkadot/keyring/types";
import { ProsopoEnvError } from "@prosopo/common";
import { ProviderEnvironment } from "@prosopo/env";
import type { ProsopoConfigOutput } from "@prosopo/types";
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
import { CronJob } from "cron";
import { Tasks } from "../tasks/tasks.js";

export async function storeCaptchasExternally(
	pair: KeyringPair,
	config: ProsopoConfigOutput,
) {
	const env = new ProviderEnvironment(config, pair);
	await env.isReady();

	const tasks = new Tasks(env);

	// Set the cron schedule to run every hour
	const cronSchedule = "0 * * * *";

	const job = new CronJob(cronSchedule, async () => {
		env.logger.log("storeCommitmentsExternal task....");
		await tasks.datasetManager.storeCommitmentsExternal().catch((err) => {
			env.logger.error(err);
		});
	});

	job.start();
}

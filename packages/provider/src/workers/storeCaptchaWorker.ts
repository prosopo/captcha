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
import {
	isMainThread,
	parentPort,
	threadId,
	workerData,
} from "node:worker_threads";
import { getPairAsync } from "@prosopo/contract";
import { ProviderEnvironment } from "@prosopo/env";
import { ScheduledTaskNames } from "@prosopo/types";
import { Tasks } from "../tasks/tasks.js";
import { checkIfTaskIsRunning } from "../util.js";

async function runTask() {
	const config = workerData.config;
	const secret =
		process.env.PROSOPO_PROVIDER_MNEMONIC ||
		process.env.PROSOPO_PROVIDER_SEED ||
		process.env.PROSOPO_PROVIDER_URI ||
		process.env.PROSOPO_PROVIDER_JSON;

	const pair = await getPairAsync(secret);

	const env = new ProviderEnvironment(config, pair);
	await env.isReady();

	env.logger.log(
		`Worker script - isMainThread: ${isMainThread}, threadId: ${threadId}, pid: ${process.pid}`,
	);

	const tasks = new Tasks(env);

	const taskRunning = await checkIfTaskIsRunning(
		ScheduledTaskNames.StoreCommitmentsExternal,
		env.getDb(),
	);
	env.logger.info(
		`${ScheduledTaskNames.StoreCommitmentsExternal} task running: ${taskRunning}`,
	);
	if (!taskRunning) {
		env.logger.info(`${ScheduledTaskNames.StoreCommitmentsExternal} task....`);
		await tasks.clientTaskManager.storeCommitmentsExternal().catch((err) => {
			env.logger.error(err);
		});
	}

	if (parentPort)
		parentPort.postMessage(
			`Store Captcha task completed in worker thread: ${threadId}`,
		);
}

runTask();

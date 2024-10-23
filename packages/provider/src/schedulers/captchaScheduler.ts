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

import path from "node:path";
import { Worker, isMainThread, threadId } from "node:worker_threads";
import type { KeyringPair } from "@polkadot/keyring/types";
import type { ProsopoConfigOutput } from "@prosopo/types";
import { CronJob } from "cron";

export async function storeCaptchasExternally(
	config: ProsopoConfigOutput,
) {
	console.log(
		`Main script - isMainThread: ${isMainThread}, threadId: ${threadId}, pid: ${process.pid}`,
	);

	// Set the cron schedule to run on user configured schedule or every hour
	const defaultSchedule = "0 * * * *";
	const cronSchedule = config.scheduledTasks?.captchaScheduler
		? config.scheduledTasks.captchaScheduler.schedule
			? config.scheduledTasks.captchaScheduler.schedule
			: defaultSchedule
		: defaultSchedule;

	const job = new CronJob(cronSchedule, () => {
		console.log(`Creating worker - from main thread: ${threadId}`);
		const worker = new Worker(
			path.resolve("../provider/dist/workers/storeCaptchaWorker.js"),
			{
				workerData: { config },
			},
		);

		worker.on("message", (message) => {
			console.log(`Worker message: ${message}`);
		});

		worker.on("error", (error) => {
			console.error(`Worker error: ${error}`);
		});

		worker.on("exit", (code) => {
			if (code !== 0) {
				console.error(`Worker stopped with exit code ${code}`);
			}
		});
	});

	job.start();
}

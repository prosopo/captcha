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

import { Worker, isMainThread, threadId } from "node:worker_threads";
import { getLoggerDefault } from "@prosopo/common";
import type { ProsopoConfigOutput } from "@prosopo/types";
import { CronJob } from "cron";

export async function storeCaptchasExternally(config: ProsopoConfigOutput) {
	const logger = getLoggerDefault();
	logger.log(
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
		logger.log(`Creating worker - from main thread: ${threadId}`);
		const worker = new Worker(
			new URL("../workers/storeCaptchaWorker.js", import.meta.url),
			{
				workerData: { config },
			},
		);

		worker.on("message", (message) => {
			logger.log(`Worker message: ${message}`);
		});

		worker.on("error", (error) => {
			logger.error(`Worker error: ${error}`);
		});

		worker.on("exit", (code) => {
			if (code !== 0) {
				logger.error(`Worker stopped with exit code ${code}`);
			}
		});
	});

	job.start();
}

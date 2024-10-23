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

	console.log(
		`Worker script - isMainThread: ${isMainThread}, threadId: ${threadId}, pid: ${process.pid}`,
	);

	const env = new ProviderEnvironment(config, pair);
	await env.isReady();

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
		parentPort.postMessage(`Store Captcha task completed in worker thread: ${threadId}`);
}

runTask();

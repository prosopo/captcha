import { getPairAsync } from "@prosopo/contract";
import { loadEnv } from "@prosopo/dotenv";
import { ProviderEnvironment } from "@prosopo/env";
import { Tasks } from "@prosopo/provider";
import { ScheduledTaskNames } from "@prosopo/types";
import getConfig from "./prosopo.config.js";

loadEnv();

const main = async () => {
	const config = getConfig();

	const pair = await getPairAsync(
		config.account.secret,
		config.account.address,
	);

	const env = new ProviderEnvironment(config, pair);
	await env.isReady();
	const tasks = new Tasks(env);
	env.logger.info(`${ScheduledTaskNames.GetClientList} task....`);
	await tasks.clientTaskManager.getClientList().catch((err) => {
		env.logger.error(err);
	});
};

main()
	.then(() => {
		console.log("Client list fetched");
		process.exit(0);
	})
	.catch((err) => {
		console.error(err);
	});

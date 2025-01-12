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

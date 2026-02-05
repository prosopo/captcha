// Copyright 2021-2026 Prosopo (UK) Ltd.
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
import { loadEnv } from "@prosopo/dotenv";
import { ProviderEnvironment } from "@prosopo/env";
import { getPair } from "@prosopo/keyring";
import {
	getClientList,
	setClientEntropy,
	startProviderApi,
	storeCaptchasExternally,
} from "@prosopo/provider";
import type { KeyringPair } from "@prosopo/types";
import { getDB, getSecret } from "./process.env.js";
import getConfig from "./prosopo.config.js";

export async function start(
	env?: ProviderEnvironment,
	admin?: boolean,
	port?: number,
) {
	if (!env) {
		loadEnv();

		// Fail to start api if db is not defined
		getDB();

		const secret = getSecret();
		const config = getConfig(undefined, {
			solved: { count: 2 },
			unsolved: { count: 0 },
		});

		const pair = getPair(secret);
		let authAccount: KeyringPair | undefined;
		if (config.authAccount) {
			authAccount = getPair(undefined, config.authAccount.address);
		}
		env = new ProviderEnvironment(config, pair, authAccount);
	} else {
		env.logger.debug(() => ({
			msg: "Env already defined",
			data: {
				config: env?.config,
			},
		}));
	}

	await env.isReady();

	// Get rid of any scheduled task records from previous runs
	env.cleanup();

	// Start the scheduled jobs if they are defined
	if (env.pair) {
		const cronScheduleStorage =
			env.config.scheduledTasks?.captchaScheduler?.schedule;
		if (cronScheduleStorage) {
			storeCaptchasExternally(env.pair, cronScheduleStorage, env.config).catch(
				(err) => {
					console.error("Failed to start scheduler:", err);
				},
			);
		}
		const cronScheduleClient =
			env.config.scheduledTasks?.clientListScheduler?.schedule;
		if (cronScheduleClient) {
			getClientList(env.pair, cronScheduleClient, env.config).catch((err) => {
				env.logger.error(() => ({
					msg: "Failed to start client list scheduler",
					err,
					context: { failedFuncName: getClientList.name },
				}));
			});
		}

		const cronClientEntropySetter =
			env.config.scheduledTasks?.clientEntropyScheduler?.schedule;
		if (cronClientEntropySetter) {
			setClientEntropy(env.pair, cronClientEntropySetter, env.config).catch(
				(err) => {
					env.logger.error(() => ({
						msg: "Failed to start client entropy scheduler",
						err,
						context: { failedFuncName: setClientEntropy.name },
					}));
				},
			);
		}
	}

	return startProviderApi(env, admin, port);
}

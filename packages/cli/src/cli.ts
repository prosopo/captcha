// Copyright 2021-2025 Prosopo (UK) Ltd.
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
import process from "node:process";
import { LogLevel, getLogger } from "@prosopo/common";
import { loadEnv } from "@prosopo/dotenv";
import { getPairAsync } from "@prosopo/keyring";
import { loadI18next } from "@prosopo/locale";
import type { ProsopoConfigOutput } from "@prosopo/types";
import { isMain } from "@prosopo/util";
import { processArgs } from "./argv.js";
import getConfig from "./prosopo.config.js";
import ReloadingAPI from "./reloader.js";

const log = getLogger(LogLevel.enum.info, "CLI");

async function main() {
	const envPath = loadEnv();

	// quick fix to allow for new dataset structure that only has `{ solved: true }` captchas
	const config: ProsopoConfigOutput = getConfig(undefined, {
		solved: { count: 2 },
		unsolved: { count: 0 },
	});

	if (config.devOnlyWatchEvents) {
		log.warn(
			`
        ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! 
        EVENT TRACKING ON. IF NOT DEVELOPMENT, PLEASE STOP, CHANGE THE ENVIRONMENT, AND RESTART
        ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! 
            `,
		);
	}

	const pair = await getPairAsync(
		config.account.secret,
		config.account.address,
	);

	const authAccount = await getPairAsync(
		config.authAccount.secret,
		config.authAccount.address,
	);

	log.info(`Pair address: ${pair.address}`);

	const processedArgs = await processArgs(
		process.argv,
		pair,
		authAccount,
		config,
	);

	log.info({ cliArgs: processedArgs });
	if (processedArgs.api) {
		if (process.env.NODE_ENV === "development") {
			await new ReloadingAPI(envPath, config, pair, authAccount, processedArgs)
				.startDev()
				.then(() => {
					log.info("Reloading API started...");
				});
		} else {
			await new ReloadingAPI(envPath, config, pair, authAccount, processedArgs)
				.start()
				.then(() => {
					log.info("Reloading API started...");
				});
		}
	} else {
		process.exit(0);
	}
}

//if main process
if (isMain(import.meta.url, "provider")) {
	loadI18next(true).then(() => {
		main()
			.then(() => {
				log.info("Running main process...");
			})
			.catch((error) => {
				log.error(error);
			});
	});
}

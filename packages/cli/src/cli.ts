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
import { getPair } from "@prosopo/keyring";
import { loadI18next } from "@prosopo/locale";
import type { ProsopoConfigOutput } from "@prosopo/types";
import { isMain } from "@prosopo/util";
import { processArgs } from "./argv.js";
import getConfig from "./prosopo.config.js";
import ReloadingAPI from "./reloader.js";

const log = getLogger(LogLevel.enum.info, "CLI");

async function main() {
	const envPath = loadEnv();

	const config: ProsopoConfigOutput = getConfig();

	if (config.devOnlyWatchEvents) {
		log.warn(() => ({
			msg: `
        ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! 
        EVENT TRACKING ON. IF NOT DEVELOPMENT, PLEASE STOP, CHANGE THE ENVIRONMENT, AND RESTART
        ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! ! 
            `,
		}));
	}

	const pair = getPair(config.account.secret, config.account.address);

	const authAccount = getPair(
		config.authAccount.secret,
		config.authAccount.address,
	);

	log.info(() => ({ data: { pairAddress: pair.address } }));

	const processedArgs = await processArgs(
		process.argv,
		pair,
		authAccount,
		config,
	);

	log.info(() => ({ data: { cliArgs: processedArgs } }));
	if (processedArgs.api) {
		await new ReloadingAPI(envPath, config, pair, authAccount, processedArgs)
			.start()
			.then(() => {
				log.info(() => ({ msg: "Reloading API started..." }));
			});
	} else {
		process.exit(0);
	}
}

//if main process
if (isMain(import.meta.url, "provider")) {
	loadI18next(true).then(() => {
		main()
			.then(() => {
				log.info(() => ({ msg: "Running main process..." }));
			})
			.catch((error) => {
				log.error(() => ({ err: error }));
			});
	});
}

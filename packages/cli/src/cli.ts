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
import process from "node:process";
import { LogLevel, getLogger } from "@prosopo/common";
import { getPairAsync } from "@prosopo/contract";
import type { ProsopoConfigOutput } from "@prosopo/types";
import { isMain } from "@prosopo/util";
import { processArgs } from "./argv.js";
import { loadEnv } from "@prosopo/dotenv";
import getConfig from "./prosopo.config.js";
import ReloadingAPI from "./reloader.js";

const log = getLogger(LogLevel.enum.info, "CLI");

async function main() {
  const envPath = loadEnv();

  // quick fix to allow for new dataset structure that only has `{ solved: true }` captchas
  const config: ProsopoConfigOutput = getConfig(
    undefined,
    undefined,
    undefined,
    {
      solved: { count: 2 },
      unsolved: { count: 0 },
    },
  );

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
    config.networks[config.defaultNetwork],
    config.account.secret,
    config.account.address,
  );

  log.info(`Pair address: ${pair.address}`);

  log.info(`Contract address: ${process.env.PROSOPO_CONTRACT_ADDRESS}`);

  const processedArgs = await processArgs(process.argv, pair, config);

  log.info(`Processsed args: ${JSON.stringify(processedArgs, null, 4)}`);
  if (processedArgs.api) {
    await new ReloadingAPI(envPath, config, pair, processedArgs)
      .start()
      .then(() => {
        log.info("Reloading API started...");
      });
  } else {
    process.exit(0);
  }
}

//if main process
if (isMain(import.meta.url, "provider")) {
  main()
    .then(() => {
      log.info("Running main process...");
    })
    .catch((error) => {
      log.error(error);
    });
}

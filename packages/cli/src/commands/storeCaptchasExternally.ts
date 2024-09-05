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

import type { KeyringPair } from "@polkadot/keyring/types";
import { LogLevel, type Logger, getLogger } from "@prosopo/common";
import { ProviderEnvironment } from "@prosopo/env";
import { Tasks } from "@prosopo/provider";
import type { ProsopoConfigOutput } from "@prosopo/types";

export default (
  pair: KeyringPair,
  config: ProsopoConfigOutput,
  cmdArgs?: { logger?: Logger },
) => {
  const logger =
    cmdArgs?.logger || getLogger(LogLevel.enum.info, "cli.store_captchas");

  return {
    command: "store_captchas",
    describe: "Store captcha records externally for billing purposes",
    handler: async () => {
      try {
        const env = new ProviderEnvironment(config, pair);
        await env.isReady();
        const tasks = new Tasks(env);
        await tasks.clientTaskManager
          .storeCommitmentsExternal()
          .catch((err) => {
            env.logger.error(err);
          });
      } catch (err) {
        logger.error(err);
      }
    },
    middlewares: [],
  };
};

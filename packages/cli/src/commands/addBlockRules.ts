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
import {
	AddBlockRulesIPSpec,
	AddBlockRulesUserSpec,
	type ProsopoCaptchaCountConfigSchemaOutput,
	type ProsopoConfigOutput,
} from "@prosopo/types";
import type { ArgumentsCamelCase, Argv } from "yargs";

export default (
	pair: KeyringPair,
	config: ProsopoConfigOutput,
	cmdArgs?: { logger?: Logger },
) => {
	const logger =
		cmdArgs?.logger ||
		getLogger(LogLevel.enum.info, "cli.provider_set_data_set");

	return {
		command: "add_block_rules",
		describe: "Add a rule for blocking requests to the database",
		builder: (yargs: Argv) =>
			yargs
				.option("ips", {
					type: "array" as const,
					demandOption: false,
					desc: "The ips to be blocked",
				} as const)
				.option("users", {
					type: "array" as const,
					demandOption: false,
					desc: "The users to be blocked",
				} as const)
				.option("dapp", {
					type: "string" as const,
					demandOption: false,
					desc: "The users to be blocked",
				} as const)
				.option("global", {
					type: "string" as const,
					demandOption: true,
					default: true,
					desc: "Whether the ip is to be blocked globally or not",
				} as const)
				.option("hardBlock", {
					type: "string" as const,
					demandOption: true,
					default: false,
					desc: "Hardblock stops requests, softblock informs frictionless",
				} as const)
				.option("solved", {
					type: "number" as const,
					demandOption: false,
					desc: "The number of solved captchas",
				} as const)
				.option("unsolved", {
					type: "number" as const,
					demandOption: false,
					desc: "The number of unsolved captchas",
				} as const),

		handler: async (argv: ArgumentsCamelCase) => {
			try {
				const env = new ProviderEnvironment(config, pair);
				await env.isReady();
				const tasks = new Tasks(env);
				let captchaConfig: ProsopoCaptchaCountConfigSchemaOutput | undefined;
				if (argv.solved) {
					captchaConfig = {
						solved: {
							count: argv.solved as unknown as number,
						},
						unsolved: {
							count: (argv.unsolved as unknown as number) || 0,
						},
					};
				}

				if (argv.ips) {
					await tasks.clientTaskManager.addIPBlockRules(
						AddBlockRulesIPSpec.parse({
							ips: argv.ips,
							global: argv.global,
							hardBlock: argv.hardBlock,
							dapp: argv.dapp,
							captchaConfig,
						}),
					);
					logger.info("IP Block rules added");
				}
				if (argv.users) {
					await tasks.clientTaskManager.addUserBlockRules(
						AddBlockRulesUserSpec.parse({
							users: argv.users,
							global: argv.global,
							hardBlock: argv.hardBlock,
							dapp: argv.dapp,
							captchaConfig,
						}),
					);
					logger.info("User Block rules added");
				}
			} catch (err) {
				logger.error(err);
			}
		},
		middlewares: [],
	};
};

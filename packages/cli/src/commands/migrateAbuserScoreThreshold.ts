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

import { LogLevel, type Logger, getLogger } from "@prosopo/common";
import { ProviderEnvironment } from "@prosopo/env";
import { Tasks } from "@prosopo/provider";
import type { KeyringPair, ProsopoConfigOutput } from "@prosopo/types";
import type { ArgumentsCamelCase, Argv } from "yargs";

export default (
	pair: KeyringPair,
	config: ProsopoConfigOutput,
	cmdArgs?: { logger?: Logger },
) => {
	const logger =
		cmdArgs?.logger ||
		getLogger(LogLevel.enum.info, "cli.migrate_abuser_score_threshold");

	return {
		command: "migrate_abuser_score_threshold",
		describe:
			"Add abuserScoreThreshold field (default 0) to trafficFilter in provider client records",
		builder: (yargs: Argv) =>
			yargs.option("dryRun", {
				type: "boolean",
				default: false,
				description: "Run without making changes to verify the migration",
			}),
		handler: async (argv: ArgumentsCamelCase) => {
			try {
				const dryRun = (argv.dryRun as boolean) ?? false;

				logger.info(() => ({
					msg: "Starting abuserScoreThreshold migration on provider DB...",
					data: { dryRun },
				}));

				const env = new ProviderEnvironment(config, pair);
				await env.isReady();
				const tasks = new Tasks(env);

				const clientModel = tasks.db.tables.client;
				if (!clientModel) {
					throw new Error("Client table not available");
				}

				const filter = {
					"settings.trafficFilter": { $exists: true },
					"settings.trafficFilter.abuserScoreThreshold": { $exists: false },
				};

				const count = await clientModel.countDocuments(filter);
				logger.info(() => ({
					msg: `Found ${count} client records needing migration`,
				}));

				if (!dryRun && count > 0) {
					const result = await clientModel.updateMany(filter, {
						$set: {
							"settings.trafficFilter.abuserScoreThreshold": 0,
						},
					});
					logger.info(() => ({
						msg: `Updated ${result.modifiedCount} client records`,
					}));
				}

				logger.info(() => ({
					msg: "Migration completed",
					data: { recordsFound: count, dryRun },
				}));

				if (dryRun) {
					logger.info(() => ({
						msg: "DRY RUN: No changes were made. Run without --dryRun to apply changes.",
					}));
				}
			} catch (err) {
				logger.error(() => ({
					err,
					msg: "Failed to migrate abuserScoreThreshold",
				}));
			}
		},
		middlewares: [],
	};
};

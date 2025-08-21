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

import { LogLevel, type Logger, getLogger } from "@prosopo/common";
import type { KeyringPair, ProsopoConfigOutput } from "@prosopo/types";
import type { ArgumentsCamelCase, Argv, CommandModule } from "yargs";
import * as z from "zod";
import { getDb } from "./getDb.js";
import { migrateIpField } from "./migrateIpField.js";

const collectionsToUpgrade = [
	"powcaptchas",
	"usercommitments",
	"frictionlesstokens",
	"pendings",
];

export const migrateIpInCaptchaRecordsCommand = (
	pair: KeyringPair,
	config: ProsopoConfigOutput,
	logger: Logger | undefined,
): CommandModule => {
	logger =
		logger ||
		getLogger(LogLevel.enum.info, "cli.migrate_ip_in_captcha_records");

	return {
		command: "migrateIpInCaptchaRecords",
		describe: "Migrate IP addresses in captcha records",
		builder: (yargs: Argv) =>
			yargs.option("uri", {
				type: "string" as const,
				desc: "DB Uri. When skipped, used the default connection based on the current environment",
			} as const),
		handler: async (argv: ArgumentsCamelCase) => {
			const uri = z.string().parse(argv.uri || "");

			try {
				const db = await getDb(pair, config, uri, logger);

				await migrateIpField(db, collectionsToUpgrade, logger);

				logger.info(() => ({
					msg: "migration completed",
				}));
			} catch (err) {
				logger.error(() => ({
					err,
					msg: "Error migrating captcha records",
				}));
			}
		},
	};
};

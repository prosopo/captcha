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

import { ProviderEnvironment } from "@prosopo/env";
import { LogLevel, type Logger, getLogger } from "@prosopo/logger";
import { updateSpamEmailDomains } from "@prosopo/provider";
import type { KeyringPair } from "@prosopo/types";
import type { ProsopoConfigOutput } from "@prosopo/types";
import type { ArgumentsCamelCase, Argv } from "yargs";

export default (
	pair: KeyringPair,
	config: ProsopoConfigOutput,
	cmdArgs?: { logger?: Logger },
) => {
	const logger =
		cmdArgs?.logger ||
		getLogger(LogLevel.enum.info, "cli.update_spam_email_domains");

	return {
		command: "update_spam_email_domains",
		describe: "Update spam email domains from configured URLs",
		builder: (yargs: Argv) =>
			yargs.option("dryRun", {
				type: "boolean",
				default: false,
				description: "Report the before/after domain counts without writing",
			}),
		handler: async (argv: ArgumentsCamelCase<{ dryRun?: boolean }>) => {
			try {
				const dryRun = argv.dryRun ?? false;
				const env = new ProviderEnvironment(config, pair);
				await env.isReady();

				const spamEmailDomainsUrls = config.spamEmailDomainsUrls || [];
				if (spamEmailDomainsUrls.length === 0) {
					logger.warn(() => ({
						msg: "No spam email domains URLs configured. Set SPAM_EMAIL_DOMAINS_URLS in environment.",
					}));
					return;
				}

				logger.info(() => ({
					msg: "Starting spam email domains update",
					data: { urlCount: spamEmailDomainsUrls.length },
				}));

				await updateSpamEmailDomains(env.getDb(), env.logger, {
					blocklistUrls: spamEmailDomainsUrls,
					allowlistUrls: config.spamEmailDomainsAllowlistUrls,
					expiryDays: config.spamEmailDomainsExpiryDays,
					dryRun,
				}).catch((err: Error) => {
					env.logger.error(() => ({
						msg: "Error updating spam email domains",
						err,
					}));
					throw err;
				});

				logger.info(() => ({
					msg: "Spam email domains update completed successfully",
				}));
			} catch (err) {
				logger.error(() => ({
					msg: "Failed to update spam email domains",
					err,
				}));
				throw err;
			}
		},
		middlewares: [],
	};
};

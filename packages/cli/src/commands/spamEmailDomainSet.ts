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
import type { KeyringPair, ProsopoConfigOutput } from "@prosopo/types";
import type { HandAddedSpamEmailDomainKind } from "@prosopo/types-database";
import { validateDomain } from "@prosopo/util";
import type { ArgumentsCamelCase, Argv } from "yargs";

export default (
	pair: KeyringPair,
	config: ProsopoConfigOutput,
	cmdArgs?: { logger?: Logger },
) => {
	const logger =
		cmdArgs?.logger ||
		getLogger(LogLevel.enum.info, "cli.spam_email_domain_set");

	return {
		command: "spam_email_domain_set",
		describe:
			"Hand-add a spam email domain the list sync never expires (block) or never flags (allow)",
		builder: (yargs: Argv) =>
			yargs
				.option("domain", {
					type: "string",
					demandOption: true,
					description: "The email domain",
				})
				.option("kind", {
					choices: ["block", "allow"] as const,
					demandOption: true,
					description: "block: always flag it; allow: never flag it",
				}),
		handler: async (argv: ArgumentsCamelCase) => {
			const domain = String(argv.domain).trim().toLowerCase();
			if (!validateDomain(domain)) {
				throw new Error(`Not a valid domain: ${domain}`);
			}
			const kind: HandAddedSpamEmailDomainKind =
				argv.kind === "allow" ? "allow" : "block";
			const env = new ProviderEnvironment(config, pair);
			await env.isReady();
			await env.getDb().setHandAddedSpamEmailDomain(domain, kind);
			logger.info(() => ({
				msg: "Hand-added spam email domain",
				data: { domain, kind },
			}));
		},
		middlewares: [],
	};
};

import type { KeyringPair } from "@polkadot/keyring/types";
import { LogLevel, type Logger, getLogger } from "@prosopo/common";
import { ProviderEnvironment } from "@prosopo/env";
import { Tasks } from "@prosopo/provider";
import type { ProsopoConfigOutput } from "@prosopo/types";
import type { ArgumentsCamelCase, Argv } from "yargs";
import { validateSiteKey } from "./validators.js";

export default (
	pair: KeyringPair,
	config: ProsopoConfigOutput,
	cmdArgs?: { logger?: Logger },
) => {
	const logger =
		cmdArgs?.logger || getLogger(LogLevel.enum.info, "cli.dapp_register");

	return {
		command: "site_key_register <sitekey>",
		describe: "Register a Site Key",
		builder: (yargs: Argv) =>
			yargs.positional("sitekey", {
				type: "string" as const,
				demandOption: true,
				desc: "The AccountId of the application to register the Site Key with",
			} as const),
		handler: async (argv: ArgumentsCamelCase) => {
			try {
				const env = new ProviderEnvironment(config, pair);
				await env.isReady();
				const siteKey = argv.sitekey;
				const tasks = new Tasks(env);
				await tasks.clientTaskManager.registerSiteKey(siteKey as string);
				logger.info(`Site Key ${argv.sitekey} registered`);
			} catch (err) {
				logger.error(err);
			}
		},
		middlewares: [validateSiteKey],
	};
};

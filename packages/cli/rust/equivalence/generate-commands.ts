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

// Writes commands-vectors.json: the CLI's yargs set-up (argv.ts) over a spread of command
// lines, with each command's handler replaced by one that records what it would act on: the
// command, the arguments its own parsing yields (or the zod issues it would log), and what
// yargs answers when a middleware or a demanded option fails. Run on Node 24.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getPair } from "@prosopo/keyring";
import yargs, { type CommandModule } from "yargs";
import { z } from "zod";
import getConfig from "../../src/prosopo.config.js";
import {
	commandEnsureExternalIndexes,
	commandEnsureIndexes,
	commandMigrateAbuserScoreThreshold,
	commandProviderSetDataset,
	commandSiteKeyRegister,
	commandSiteKeyRegisterApi,
	commandStoreCaptchasExternally,
	commandUpdateSpamEmailDomains,
	commandVersion,
} from "../../src/commands/index.js";
import { SiteKeyRegisterCommandArgsSpec } from "../../src/commands/siteKeyRegister.js";

if (!process.version.startsWith("v24.")) {
	throw new Error(`this generator must run on Node 24 (the production runtime), not ${process.version}`);
}

Object.assign(process.env, { CADDY_DOMAIN: "h", PROSOPO_IPAPI_KEY: "k", PROSOPO_IPAPI_URL: "https://x" });
const config = getConfig();
const pair = getPair("//Alice");

type Recorded = { command: string; args?: unknown; issues?: unknown };
let recorded: Recorded | undefined;
const parsed = (spec: z.ZodTypeAny, argv: Record<string, unknown>) => {
	const result = spec.safeParse(argv);
	return result.success ? { args: result.data } : { issues: result.error.issues };
};
const recorders: Record<string, (argv: Record<string, unknown>) => Recorded> = {
	site_key_register: (argv) => ({ command: "site_key_register", ...parsed(SiteKeyRegisterCommandArgsSpec, argv) }),
	site_key_register_api: (argv) => ({ command: "site_key_register_api", ...parsed(SiteKeyRegisterCommandArgsSpec.extend({ url: z.string() }), argv) }),
	migrate_abuser_score_threshold: (argv) => ({ command: "migrate_abuser_score_threshold", args: { dryRun: (argv.dryRun as boolean) ?? false } }),
	provider_set_data_set: (argv) => ({ command: "provider_set_data_set", ...parsed(z.object({ file: z.string() }), argv) }),
};

const commands: CommandModule[] = [
	commandEnsureIndexes(pair, config),
	commandEnsureExternalIndexes(pair, config),
	commandMigrateAbuserScoreThreshold(pair, config),
	commandProviderSetDataset(pair, config),
	commandStoreCaptchasExternally(pair, config),
	commandUpdateSpamEmailDomains(pair, config),
	commandSiteKeyRegister(pair, config),
	commandSiteKeyRegisterApi(pair, pair, config),
	commandVersion(pair, config),
].map((command) => {
	const name = String(command.command).split(" ")[0] as string;
	return {
		...command,
		handler: (argv: Record<string, unknown>) => {
			recorded = (recorders[name] ?? (() => ({ command: name })))(argv);
		},
	} as CommandModule;
});

const SITE = "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y";
const SITE_GENERIC = "1FRMM8PEiWXYax7rpS6X4XZX1aAAxSWx1CrKTyrVYhV24fg";
const base = ["--captcha_type", "pow", "--frictionless_threshold", "0.5", "--pow_difficulty", "4", "--domains", "a.example", "b.example", "--image_threshold", "0.8"];
const lines: string[][] = [
	[],
	["--api"],
	["version"],
	["ensure_indexes"],
	["ensure_external_indexes"],
	["store_captchas"],
	["update_spam_email_domains"],
	["migrate_abuser_score_threshold"],
	["migrate_abuser_score_threshold", "--dryRun"],
	["migrate_abuser_score_threshold", "--dry-run"],
	["migrate_abuser_score_threshold", "--dryRun=false"],
	["migrate_abuser_score_threshold", "--no-dryRun"],
	["provider_set_data_set", "--file", "/tmp/data.json"],
	["provider_set_data_set", "--file=/tmp/data.json"],
	["site_key_register", SITE, "free", ...base],
	["site_key_register", SITE, "professional", ...base, "--image_max_rounds", "10", "--image_min_rounds", "3", "--frictionless_image_threshold", "0.9"],
	["site_key_register", SITE_GENERIC, "free", ...base],
	["site_key_register", SITE, "platinum", ...base],
	["site_key_register", SITE, "free", "--captcha_type", "image", "--frictionless_threshold", "1.5", "--pow_difficulty", "x", "--image_threshold", "0.8"],
	["site_key_register", SITE, "free", ...base, "--domains", "c.example"],
	["site_key_register", SITE, "free", ...base, "--image_max_rounds", "2.5"],
	["site_key_register", SITE, "free", "--captcha_type=puzzle", "--frictionless_threshold=0", "--pow_difficulty=1", "--domains=one.example", "--image_threshold=1"],
	["site_key_register", SITE, "free"],
	["site_key_register", SITE],
	["site_key_register", "not-an-address", "free", ...base],
	["site_key_register_api", SITE, "http://localhost:9229", "--tier", "free", ...base],
	["site_key_register_api", SITE, "http://localhost:9229", ...base],
	["site_key_register_api", SITE, "http://localhost:9229", "--tier", "gold", ...base],
	["site_key_register_api", SITE, "--tier", "free", ...base],
	["site_key_register_api"],
	["site_key_register_api", SITE],
	["site_key_register_api", "not-an-address", "http://localhost:9229", "--tier", "free", ...base],
	["site_key_register_api", SITE, "http://localhost:9229", "--tier", "gold"],
	["site_key_register"],
	["provider_set_data_set"],
	["site_key_register", SITE, "free", ...base, "--domains"],
	["site_key_register", SITE, "free", "--captcha_type", "pow", "--frictionless_threshold", "-0.5", "--pow_difficulty", "4", "--domains", "a", "--image_threshold", "0.8"],
	["site_key_register", "bad"],
	["site_key_register_api", "bad", "http://x", "--tier", "gold"],
	["site_key_register_api", "bad"],
	["unknown_command", "--x", "1"],
	["site_key_register", SITE, "free", ...base, "--domains", "c.example", "--domains", "d.example"],
	["migrate_abuser_score_threshold", "--dryRun", "true"],
	["migrate_abuser_score_threshold", "--dryRun", "false"],
	["migrate_abuser_score_threshold", "--dryRun", "no"],
	["site_key_register", SITE, "free", ...base, "--image_min_rounds", "0"],
	["site_key_register_api", SITE, "--url", "http://x", "--tier", "free", ...base],
	["site_key_register", SITE, "free", "extra", ...base],
	["--api", "version"],
	["provider_set_data_set", "--file"],
	["site_key_register", SITE, "free", ...base, "--pow_difficulty", "0x10"],
	["site_key_register", SITE, "free", ...base, "--frictionless_threshold", " "],
	["site_key_register", SITE, "--", "free", ...base],
	["site_key_register", SITE, "free", "--captcha_type", "pow", "--frictionless_threshold", "0.5", "--pow_difficulty", "4", "--image_threshold", "0.8", "--domains", "--", "x"],
];

const outcomes = [];
for (const line of lines) {
	recorded = undefined;
	let failure: string | undefined;
	const manager = yargs(line)
		.usage("Usage: $0 [global options] <command> [options]")
		.option("api", { demand: false, default: false, type: "boolean" } as const)
		.option("adminApi", { demand: false, default: false, type: "boolean" } as const)
		.exitProcess(false)
		.fail((message: string | null, error: Error | undefined) => {
			failure = message ?? error?.message ?? "failed";
		});
	for (const command of commands) manager.command(command);
	let api: unknown;
	try {
		const argv = await manager.parse();
		api = (argv as { api?: unknown }).api;
	} catch (error) {
		failure = failure ?? (error as Error).message;
	}
	outcomes.push({ line, api, recorded: recorded ?? null, failure: failure ?? null });
}

writeFileSync(fileURLToPath(new URL("./commands-vectors.json", import.meta.url)), `${JSON.stringify({ outcomes })}\n`);
console.log(`wrote commands-vectors.json (${outcomes.length} command lines)`);
process.exit(0);

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
import { LogLevel, getLogger } from "@prosopo/common";
import type { ProsopoConfigOutput } from "@prosopo/types";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import {
	commandProviderSetDataset,
	commandStoreCaptchasExternally,
	commandVersion,
} from "./commands/index.js";

export type AwaitedProcessedArgs = {
	[x: string]: unknown;
	api: boolean;
	_: (string | number)[];
	$0: string;
};

export function processArgs(
	args: string[],
	pair: KeyringPair,
	config: ProsopoConfigOutput,
) {
	const logger = getLogger(LogLevel.enum.info, "CLI");
	return yargs(hideBin(args))
		.usage("Usage: $0 [global options] <command> [options]")
		.option("api", { demand: false, default: false, type: "boolean" } as const)
		.option("adminApi", {
			demand: false,
			default: false,
			type: "boolean",
		} as const)
		.command(commandProviderSetDataset(pair, config, { logger }))
		.command(commandStoreCaptchasExternally(pair, config, { logger }))
		.command(commandVersion(pair, config, { logger }))
		.parse();
}

#!/usr/bin/env node
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
import { LogLevel, getLogger } from "@prosopo/common";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import {
	commandAuth,
	commandFormatEnv,
	commandGetDapp,
	commandGetDapps,
	commandLogs,
	commandRedeploy,
	commandSign,
	commandTerminal,
} from "./commands/index.js";

const logger = getLogger(LogLevel.enum.info, "CLI");

export default async function processArgs(args: string[]) {
	return yargs(hideBin(args))
		.usage("Usage: $0 [global options] <command> [options]")
		.command(commandAuth({ logger }))
		.command(commandRedeploy({ logger }))
		.command(commandFormatEnv({ logger }))
		.command(commandGetDapp({ logger }))
		.command(commandGetDapps({ logger }))
		.command(commandLogs({ logger }))
		.command(commandSign({ logger }))
		.command(commandTerminal({ logger }))
		.parse();
}

processArgs(process.argv)
	.then((result) => {
		logger.info(() => ({ data: result }));
	})
	.catch((error) => {
		logger.error(() => ({ err: error }));
	});

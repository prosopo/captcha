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
import yargs, { type CommandModule } from "yargs";
import { hideBin } from "yargs/helpers";
import type {RulesStorageFactory} from "@tests/benchmark/storageFactory/rulesStorageFactory.js";
import type {ConnectionCleaner} from "@tests/benchmark/connectionCleaner/connectionCleaner.js";
import {PopulateCommand} from "@tests/benchmark/commands/populateCommand.js";
import {MeasureFindCommand} from "@tests/benchmark/commands/measureFindCommand.js";

class RulesStorageBenchmark {
	constructor(
		private readonly rulesStorageFactory: RulesStorageFactory,
		private readonly connectionCleaner: ConnectionCleaner,
	) {}

	public async processInput() {
		const commandManager = yargs(hideBin(process.argv)).usage(
			"Usage: $0 [global options] <command> [options]",
		);

		const commands = this.getCommands();

		for (const command of commands) {
			commandManager.command(command);
		}

		const startTimestamp = Date.now();

		await commandManager.parse();

		const endTimestamp = Date.now();

		console.log(`Execution took ${endTimestamp - startTimestamp}ms`);

		await this.connectionCleaner.cleanConnection();
	}

	protected getCommands(): CommandModule[] {
		return [
			new PopulateCommand(this.rulesStorageFactory),
			new MeasureFindCommand(this.rulesStorageFactory),
		];
	}
}

export { RulesStorageBenchmark };

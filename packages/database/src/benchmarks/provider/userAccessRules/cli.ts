import yargs, { type CommandModule } from "yargs";
import { hideBin } from "yargs/helpers";
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
import { MeasureFindCommand } from "./commands/measureFindCommand.js";
import { PopulateCommand } from "./commands/populateCommand.js";

class Cli {
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
	}

	protected getCommands(): CommandModule[] {
		return [new PopulateCommand(), new MeasureFindCommand()];
	}
}

const cli = new Cli();

await cli.processInput();

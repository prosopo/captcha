import mongoose from "mongoose";
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
import { CliInputParser } from "./cliInputParser.js";
import type { CommandBase } from "./commands/commandBase.js";
import { MeasureFindCommand } from "./commands/measureFindCommand.js";
import { PopulateCommand } from "./commands/populateCommand.js";

class Cli {
	private cliInputParser: CliInputParser;

	constructor() {
		this.cliInputParser = new CliInputParser();
	}
	public async processCommand() {
		const cliInput = this.cliInputParser.parse(process.argv.slice(2));

		const command = this.getCommand(cliInput.command);

		if (!command) {
			throw new Error(`Unknown command: ${cliInput.command}`);
		}

		const startTimestamp = Date.now();

		await command.process(cliInput.args);

		const endTimestamp = Date.now();

		console.log(
			`Command ${cliInput.command} took ${endTimestamp - startTimestamp}ms`,
		);
	}

	protected getCommands(): CommandBase[] {
		return [new PopulateCommand(), new MeasureFindCommand()];
	}

	protected getCommand(commandName: string): CommandBase | null {
		const commands = this.getCommands();

		const command = commands.find(
			(command) => command.getName() === commandName,
		);

		return command ?? null;
	}
}

const cli = new Cli();

await cli.processCommand();
await mongoose.disconnect();

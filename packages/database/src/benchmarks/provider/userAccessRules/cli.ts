import { CliInputParser } from "./cliInputParser.js";
import type { CommandBase } from "./commands/commandBase.js";
import { PopulateCommand } from "./commands/populateCommand.js";
import mongoose from "mongoose";
import { MeasureFindCommand } from "./commands/measureFindCommand.js";

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

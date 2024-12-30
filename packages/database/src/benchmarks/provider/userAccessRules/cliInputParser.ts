import { CliInput } from "./cliInput.js";

class CliInputParser {
	public parse(input: string[]): CliInput {
		const inputArguments = input.map((argument) => {
			return this.getArgument(argument);
		});

		const command = this.getCommand(inputArguments);
		const namedArgumentsObject = this.getNamedArgumentsObject(inputArguments);

		return new CliInput(command, namedArgumentsObject);
	}

	protected getNamedArgumentsObject(
		inputArguments: (string | object | null)[],
	): object {
		const namedArgumentsArray = inputArguments.filter(
			(argument) => "object" === typeof argument && null !== argument,
		);

		const namedArgumentsObject = namedArgumentsArray.reduce(
			(namedArgumentsObject, argument) => {
				return Object.assign(namedArgumentsObject, argument);
			},
		);

		return namedArgumentsObject;
	}

	protected getCommand(inputArguments: (string | object | null)[]): string {
		const positionalArguments = inputArguments.filter(
			(argument) => "string" === typeof argument,
		);

		const command = positionalArguments.shift() || "";

		return command;
	}

	protected getArgument(argument: string): string | null | object {
		if (argument.startsWith("--")) {
			return this.getNamedArgument(argument);
		}

		return argument;
	}

	protected getNamedArgument(argument: string): object | null {
		const [key, value] = argument.slice(2).split("=");

		if (!key) {
			return null;
		}

		return { [key]: value || "" };
	}
}

export { CliInputParser };

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

import fs from "node:fs";
import { ProsopoDatasetError, ProsopoError } from "@prosopo/common";
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
import * as z from "zod";
import { CliCommand } from "../cli/cliCommand.js";

export const InputArgsSchema = z.object({
	input: z.string(),
});

export type InputArgs = z.infer<typeof InputArgsSchema>;

export class InputCliCommand<
	T extends typeof InputArgsSchema,
> extends CliCommand<T> {
	public override getArgSchema(): T {
		throw new ProsopoError("DEVELOPER.METHOD_NOT_IMPLEMENTED");
	}
	public override getDescription(): string {
		throw new ProsopoError("DEVELOPER.METHOD_NOT_IMPLEMENTED");
	}
	public override getOptions() {
		return {
			input: {
				string: true,
				alias: "in",
				demand: true,
				description: "The input path",
			},
		};
	}

	public override async _check(args: InputArgs) {
		this.logger.debug("input _check");
		await super._check(args);
		// input must exist
		if (!fs.existsSync(args.input)) {
			throw new ProsopoDatasetError(
				new Error(`input path does not exist: ${args.input}`),
				{
					translationKey: "FS.FILE_NOT_FOUND",
				},
			);
		}
	}
}

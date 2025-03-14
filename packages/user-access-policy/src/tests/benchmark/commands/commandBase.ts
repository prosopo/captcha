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

import { ProsopoError } from "@prosopo/common";
import type { ArgumentsCamelCase, Argv, CommandModule } from "yargs";
import type { RulesStorage } from "../../../rules/storage/rulesStorage.js";
import type { RulesStorageFactory } from "../storageFactory/rulesStorageFactory.js";

abstract class CommandBase implements CommandModule {
	abstract command: string;
	abstract describe: string;

	public constructor(private readonly storageFactory: RulesStorageFactory) {}

	public builder(yargs: Argv): Argv {
		return yargs.option("dbUrl", {
			type: "string" as const,
			describe: "like 'mongodb://localhost:27017'",
			demandOption: true,
		});
	}

	abstract handler(args: ArgumentsCamelCase): Promise<void>;

	protected async createRulesStorage(
		args: ArgumentsCamelCase,
	): Promise<RulesStorage> {
		const dbUrl = "string" === typeof args.dbUrl ? args.dbUrl : "";

		if ("" === dbUrl) {
			throw new ProsopoError("dbUrl is not set");
		}

		return await this.storageFactory.createRulesStorage(dbUrl);
	}
}

export { CommandBase };

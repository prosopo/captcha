import type { UserAccessRule } from "@prosopo/types-database";
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
import mongoose, { type Model } from "mongoose";
import { getUserAccessRulesDbSchema } from "../../../../databases/provider/userAccessRules/dbSchema.js";

abstract class CommandBase {
	public abstract getName(): string;

	public abstract process(args: object): Promise<void>;

	protected async createModelByArgs(
		args: object,
	): Promise<Model<UserAccessRule>> {
		const db = "db" in args && "string" === typeof args.db ? args.db : "";

		if (!db) {
			throw new Error("DB argument is required");
		}

		return await this.createModel(db);
	}

	protected async createModel(db: string): Promise<Model<UserAccessRule>> {
		const mongoConnection = await mongoose.connect(`mongodb://${db}`);

		return mongoConnection.model(
			"UserAccessRules",
			getUserAccessRulesDbSchema(),
		);
	}
}

export { CommandBase };

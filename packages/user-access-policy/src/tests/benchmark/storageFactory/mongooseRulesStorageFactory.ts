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

import { RulesMongooseStorage } from "@rules/mongoose/rulesMongooseStorage.js";
import { getRuleMongooseSchema } from "@rules/mongoose/schemas/getRuleMongooseSchema.js";
import type { Rule } from "@rules/rule/rule.js";
import type { RulesStorage } from "@rules/storage/rulesStorage.js";
import type { RulesStorageFactory } from "@tests/benchmark/storageFactory/rulesStorageFactory.js";
import mongoose, { type Model } from "mongoose";

class MongooseRulesStorageFactory implements RulesStorageFactory {
	async createRulesStorage(dbUrl: string): Promise<RulesStorage> {
		const model = await this.createModel(dbUrl);

		return new RulesMongooseStorage(model);
	}

	protected async createModel(db: string): Promise<Model<Rule>> {
		const mongoConnection = await mongoose.connect(`mongodb://${db}`);

		return mongoConnection.model(
			"UserAccessPolicyRules",
			getRuleMongooseSchema(),
		);
	}
}

export { MongooseRulesStorageFactory };

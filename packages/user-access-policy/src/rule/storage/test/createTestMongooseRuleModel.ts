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
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { type Model } from "mongoose";
import { afterAll, beforeEach } from "vitest";
import type { Rule } from "../../rule.js";
import { getMongooseRuleRecordSchema } from "../record/getMongooseRuleRecordSchema.js";

const createTestMongooseRuleModel = async (): Promise<Model<Rule>> => {
	const mongoServer = await MongoMemoryServer.create();
	const mongoConnection = await mongoose.connect(mongoServer.getUri());

	const model = mongoConnection.model(
		"UserAccessPolicyRules",
		getMongooseRuleRecordSchema(),
	);

	await model.syncIndexes();

	beforeEach(async () => {
		await model.deleteMany({});
	});

	afterAll(async () => {
		await mongoConnection.disconnect();
		await mongoServer.stop();
	});

	return model;
};

export { createTestMongooseRuleModel };

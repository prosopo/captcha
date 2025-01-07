import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { type Model } from "mongoose";
import { afterAll, beforeEach } from "vitest";
import mongooseRuleSchema from "../mongooseRuleSchema.js";
import type Rule from "../rule.js";

abstract class TestMongooseRulesStorage {
	public async setupModel(): Promise<Model<Rule>> {
		const mongoServer = await MongoMemoryServer.create();
		const mongoConnection = await mongoose.connect(mongoServer.getUri());

		const model = mongoConnection.model(
			"UserAccessPolicyRules",
			mongooseRuleSchema,
		);

		beforeEach(async () => {
			await model.deleteMany({});
		});

		afterAll(async () => {
			await mongoConnection.disconnect();
			await mongoServer.stop();
		});

		return model;
	}
}

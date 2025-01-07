import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { type Model } from "mongoose";
import { afterAll, beforeEach } from "vitest";
import type TestRulesStorage from "./testRulesStorage.js";
import type Rule from "../../rule.js";
import type RuleRecord from "../record/ruleRecord.js";
import mongooseRuleSchema from "../../mongooseRuleSchema.js";

class TestMongooseRulesStorage implements TestRulesStorage {
	private model: Model<Rule> | null = null;

	public async setup(): Promise<void> {
		await this.getModel();
	}

	public async insert(rule: Rule): Promise<RuleRecord> {
		const model = await this.getModel();

		const ruleDocument = await model.create(rule);

		const ruleRecord = {
			...ruleDocument,
			_id: ruleDocument._id.toString(),
		};

		return ruleRecord;
	}

	protected async getModel(): Promise<Model<Rule>> {
		if (null === this.model) {
			this.model = await this.setupModel();
		}

		return this.model;
	}

	protected async setupModel(): Promise<Model<Rule>> {
		const mongoServer = await MongoMemoryServer.create();
		const mongoConnection = await mongoose.connect(mongoServer.getUri());

		const model = mongoConnection.model(
			"UserAccessPolicyRules",
			mongooseRuleSchema,
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
	}
}

export default TestMongooseRulesStorage;

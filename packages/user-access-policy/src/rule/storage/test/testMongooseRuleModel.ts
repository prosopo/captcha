import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { type Model } from "mongoose";
import { afterAll, beforeEach } from "vitest";
import type Rule from "../../rule.js";
import MongooseRuleRecordSchema from "../record/mongooseRuleRecordSchema.js";

export default async function (): Promise<Model<Rule>> {
	const mongoServer = await MongoMemoryServer.create();
	const mongoConnection = await mongoose.connect(mongoServer.getUri());

	const model = mongoConnection.model(
		"UserAccessPolicyRules",
		MongooseRuleRecordSchema,
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

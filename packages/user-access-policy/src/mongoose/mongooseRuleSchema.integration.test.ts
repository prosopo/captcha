// Copyright 2021-2026 Prosopo (UK) Ltd.
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

import { CaptchaType } from "@prosopo/types";
import {
	MongoDBContainer,
	type StartedMongoDBContainer,
} from "@testcontainers/mongodb";
import mongoose, { type Model } from "mongoose";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
} from "vitest";
import { accessRuleMongooseSchema } from "#policy/mongoose/mongooseRuleSchema.js";
import { AccessPolicyType } from "#policy/rule.js";
import type { AccessRuleRecord } from "#policy/ruleRecord.js";

describe("accessRuleMongooseSchema Integration Tests", () => {
	let mongoContainer: StartedMongoDBContainer;
	let AccessRuleModel: Model<AccessRuleRecord>;
	let connection: typeof mongoose;

	beforeAll(async () => {
		// Skip MongoDB integration tests due to testcontainers networking issues in this environment
		// TODO: Fix MongoDB container networking or use alternative approach
		mongoContainer = await new MongoDBContainer("mongo:6.0.17").start();

		const connectionString = mongoContainer.getConnectionString();

		// Wait for MongoDB to be ready
		await new Promise(resolve => setTimeout(resolve, 2000));

		connection = await mongoose.connect(connectionString);

		AccessRuleModel = connection.model<AccessRuleRecord>(
			"AccessRule",
			new connection.Schema(accessRuleMongooseSchema),
		);
	}, 60_000);

	beforeEach(async () => {
		await AccessRuleModel.deleteMany({});
	});

	afterAll(async () => {
		if (connection) {
			await connection.disconnect();
		}
		if (mongoContainer) {
			await mongoContainer.stop();
		}
	}, 30_000);

	test("should save and retrieve access rule with all fields", async () => {
		const ruleRecord: AccessRuleRecord = {
			type: AccessPolicyType.Block,
			captchaType: CaptchaType.image,
			description: "Test rule",
			solvedImagesCount: 5,
			imageThreshold: 0.8,
			powDifficulty: 10,
			unsolvedImagesCount: 3,
			frictionlessScore: 0.9,
			clientId: "test-client",
			userId: "test-user",
			ja4Hash: "test-ja4",
			headersHash: "test-headers",
			userAgent: "test-agent",
			headHash: "test-head",
			coords: "[[[100,200]]]",
			ip: "127.0.0.1",
			ipMask: "127.0.0.0/24",
			ruleGroupId: "test-group",
		};

		const saved = await AccessRuleModel.create(ruleRecord);
		expect(saved._id).toBeDefined();

		const retrieved = await AccessRuleModel.findById(saved._id);
		expect(retrieved).toBeDefined();
		if (!retrieved) return;
		expect(retrieved.type).toBe(AccessPolicyType.Block);
		expect(retrieved.clientId).toBe("test-client");
		expect(retrieved.userId).toBe("test-user");
		expect(retrieved.ip).toBe("127.0.0.1");
	});

	test("should save rule with only required type field", async () => {
		const ruleRecord: AccessRuleRecord = {
			type: AccessPolicyType.Restrict,
		};

		const saved = await AccessRuleModel.create(ruleRecord);
		expect(saved._id).toBeDefined();
		expect(saved.type).toBe(AccessPolicyType.Restrict);
	});

	test("should enforce required type field", async () => {
		await expect(
			AccessRuleModel.create({} as AccessRuleRecord),
		).rejects.toThrow();
	});

	test("should save and query rules by clientId", async () => {
		const rule1: AccessRuleRecord = {
			type: AccessPolicyType.Block,
			clientId: "client-1",
		};
		const rule2: AccessRuleRecord = {
			type: AccessPolicyType.Block,
			clientId: "client-2",
		};
		const rule3: AccessRuleRecord = {
			type: AccessPolicyType.Block,
			clientId: "client-1",
		};

		await AccessRuleModel.create([rule1, rule2, rule3]);

		const client1Rules = await AccessRuleModel.find({ clientId: "client-1" });
		expect(client1Rules.length).toBe(2);

		const client2Rules = await AccessRuleModel.find({ clientId: "client-2" });
		expect(client2Rules.length).toBe(1);
	});

	test("should save and query rules by ruleGroupId", async () => {
		const rule1: AccessRuleRecord = {
			type: AccessPolicyType.Block,
			ruleGroupId: "group-1",
		};
		const rule2: AccessRuleRecord = {
			type: AccessPolicyType.Block,
			ruleGroupId: "group-1",
		};
		const rule3: AccessRuleRecord = {
			type: AccessPolicyType.Block,
			ruleGroupId: "group-2",
		};

		await AccessRuleModel.create([rule1, rule2, rule3]);

		const group1Rules = await AccessRuleModel.find({ ruleGroupId: "group-1" });
		expect(group1Rules.length).toBe(2);
	});

	test("should handle numeric fields correctly", async () => {
		const ruleRecord: AccessRuleRecord = {
			type: AccessPolicyType.Restrict,
			solvedImagesCount: 10,
			imageThreshold: 0.75,
			powDifficulty: 15,
			unsolvedImagesCount: 5,
			frictionlessScore: 0.85,
		};

		const saved = await AccessRuleModel.create(ruleRecord);
		const retrieved = await AccessRuleModel.findById(saved._id);
		expect(retrieved).toBeDefined();
		if (!retrieved) return;
		expect(retrieved.solvedImagesCount).toBe(10);
		expect(retrieved.imageThreshold).toBe(0.75);
		expect(retrieved.powDifficulty).toBe(15);
		expect(retrieved.unsolvedImagesCount).toBe(5);
		expect(retrieved.frictionlessScore).toBe(0.85);
	});

	test("should handle optional fields as undefined", async () => {
		const ruleRecord: AccessRuleRecord = {
			type: AccessPolicyType.Block,
		};

		const saved = await AccessRuleModel.create(ruleRecord);
		const retrieved = await AccessRuleModel.findById(saved._id);
		expect(retrieved).toBeDefined();
		if (!retrieved) return;
		expect(retrieved.captchaType).toBeUndefined();
		expect(retrieved.clientId).toBeUndefined();
		expect(retrieved.userId).toBeUndefined();
		expect(retrieved.ip).toBeUndefined();
	});

	test("should update existing rule", async () => {
		const ruleRecord: AccessRuleRecord = {
			type: AccessPolicyType.Block,
			clientId: "original-client",
		};

		const saved = await AccessRuleModel.create(ruleRecord);
		saved.clientId = "updated-client";
		await saved.save();

		const updated = await AccessRuleModel.findById(saved._id);
		expect(updated).toBeDefined();
		if (!updated) return;
		expect(updated.clientId).toBe("updated-client");
	});

	test("should delete rule", async () => {
		const ruleRecord: AccessRuleRecord = {
			type: AccessPolicyType.Block,
			clientId: "to-delete",
		};

		const saved = await AccessRuleModel.create(ruleRecord);
		await AccessRuleModel.findByIdAndDelete(saved._id);

		const deleted = await AccessRuleModel.findById(saved._id);
		expect(deleted).toBeNull();
	});
});

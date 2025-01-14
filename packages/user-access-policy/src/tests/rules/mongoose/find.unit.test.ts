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

import { Address4 } from "ip-address";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { RulesMongooseStorage } from "../../../rules/mongoose/rulesMongooseStorage.js";
import { getRuleMongooseSchema } from "../../../rules/mongoose/schemas/getRuleMongooseSchema.js";
import type { Rule } from "../../../rules/rule/rule.js";
import type { RulesStorage } from "../../../rules/storage/rulesStorage.js";

describe("RulesMongooseStorage", async () => {
	const mongoServer = await MongoMemoryServer.create();
	const mongoConnection = await mongoose.connect(mongoServer.getUri());

	const model = mongoConnection.model(
		"UserAccessPolicyRules",
		getRuleMongooseSchema(),
	);

	await model.syncIndexes();

	const rulesStorage: RulesStorage = new RulesMongooseStorage(model);

	beforeEach(async () => {
		await model.deleteMany({});
	});

	afterAll(async () => {
		await mongoConnection.disconnect();
		await mongoServer.stop();
	});

	//// find

	it("findsRecordByClientId", async () => {
		// given
		const clientId = "clientId";

		const rule: Rule = {
			isUserBlocked: false,
			clientId: clientId,
			userId: "userId",
		};
		const record = await rulesStorage.insert(rule);

		// when
		const rules = await rulesStorage.find({
			clientId: clientId,
		});

		// then
		expect(rules.length).toBe(1);
		expect(rules[0]?._id.toString()).toBe(record._id.toString());
	});

	it("ignoresRecordWithAnotherClientId", async () => {
		// given
		const rule: Rule = {
			isUserBlocked: false,
			userId: "userId",
			clientId: "clientId",
		};

		await rulesStorage.insert(rule);

		// when
		const rules = await rulesStorage.find({
			clientId: "anotherClientId",
		});

		// then
		expect(rules.length).toBe(0);
	});

	it("ignoresRecordsWithoutClientIdWhenFlagIsNotSet", async () => {
		// given
		const rule: Rule = {
			isUserBlocked: false,
			userId: "userId",
			userIp: {
				v4: {
					asNumeric: new Address4("192.168.1.1").bigInt(),
					asString: new Address4("192.168.1.1").bigInt().toString(),
				},
			},
		};
		await rulesStorage.insert(rule);

		// when
		const rules = await rulesStorage.find({
			clientId: "client",
		});

		// then
		expect(rules.length).toBe(0);
	});

	it("includesRecordsWithoutClientIdWhenFlagIsSet", async () => {
		// given
		const rule: Rule = {
			isUserBlocked: false,
			userId: "userId",
			userIp: {
				v4: {
					asNumeric: new Address4("192.168.1.1").bigInt(),
					asString: new Address4("192.168.1.1").bigInt().toString(),
				},
			},
		};
		const record = await rulesStorage.insert(rule);

		// when
		const rules = await rulesStorage.find(
			{},
			{
				includeRecordsWithoutClientId: true,
			},
		);

		// then
		expect(rules.length).toBe(1);
		expect(rules[0]?._id).toBe(record._id);
	});

	it("findsRecordByUserId", async () => {
		// given
		const userId = "userId";

		const rule: Rule = {
			isUserBlocked: false,
			userId: userId,
		};
		const record = await rulesStorage.insert(rule);

		// when
		const rules = await rulesStorage.find({
			userId: userId,
		});

		// then
		expect(rules.length).toBe(1);
		expect(rules[0]?._id.toString()).toBe(record._id.toString());
	});

	it("ignoresRecordWithAnotherUserId", async () => {
		// given
		const rule: Rule = {
			isUserBlocked: false,
			userId: "userId",
		};

		await rulesStorage.insert(rule);

		// when
		const rules = await rulesStorage.find({
			userId: "anotherId",
		});

		// then
		expect(rules.length).toBe(0);
	});

	it("findsMatchedRecordByCombinedFilters", async () => {
		// given
		const rule: Rule = {
			isUserBlocked: false,
			clientId: "clientId",
			userId: "userId",
			userIp: {
				v4: {
					asNumeric: new Address4("192.168.1.1").bigInt(),
					asString: new Address4("192.168.1.1").bigInt().toString(),
				},
			},
		};
		const record = await rulesStorage.insert(rule);

		// when
		const rules = await rulesStorage.find({
			userId: "userId",
			clientId: "clientId",
			userIpAddress: new Address4("192.168.1.1"),
		});

		// then
		expect(rules.length).toBe(1);
		expect(rules[0]?._id.toString()).toBe(record._id.toString());
	});

	it("ignoresUnmatchedRecordByCombinedFilters", async () => {
		// given
		const ipAddress = new Address4("192.168.1.1");

		const rule: Rule = {
			isUserBlocked: false,
			userId: "userId",
			clientId: "clientId",
			userIp: {
				v4: {
					asNumeric: ipAddress.bigInt(),
					asString: ipAddress.bigInt().toString(),
				},
			},
		};
		await rulesStorage.insert(rule);

		// when
		const rules = await rulesStorage.find({
			userId: "anotherUserId",
			userIpAddress: new Address4("192.168.1.2"),
			clientId: "anotherClientId",
		});

		// then
		expect(rules.length).toBe(0);
	});

	it("ignoresPartialFilterMatchesWhenFlagIsNotSet", async () => {
		// given
		const userId = "userId";
		const clientId = "clientId";

		const rule: Rule = {
			isUserBlocked: false,
			userId: userId,
			clientId: clientId,
			userIp: {
				v4: {
					asNumeric: new Address4("192.168.1.1").bigInt(),
					asString: new Address4("192.168.1.1").bigInt().toString(),
				},
			},
		};
		await rulesStorage.insert(rule);

		// when
		const rules = await rulesStorage.find({
			userId: userId,
			clientId: clientId,
			userIpAddress: new Address4("192.168.1.2"),
		});

		// then
		expect(rules.length).toBe(0);
	});

	it("includesPartialFilterMatchesWhenFlagIsSet", async () => {
		// given
		const userId = "userId";
		const clientId = "clientId";

		const rule: Rule = {
			isUserBlocked: false,
			userId: userId,
			clientId: clientId,
			userIp: {
				v4: {
					asNumeric: new Address4("192.168.1.1").bigInt(),
					asString: new Address4("192.168.1.1").bigInt().toString(),
				},
			},
		};
		const record = await rulesStorage.insert(rule);

		// when
		const rules = await rulesStorage.find(
			{
				userId: userId,
				clientId: clientId,
				userIpAddress: new Address4("192.168.1.2"),
			},
			{
				includeRecordsWithPartialFilterMatches: true,
			},
		);

		// then
		expect(rules.length).toBe(1);
		expect(rules[0]?._id).toBe(record._id);
	});
});

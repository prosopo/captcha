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
import mongoose, { type Model, type Mongoose } from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { RulesMongooseStorage } from "../../../../rules/mongoose/rulesMongooseStorage.js";
import { getRuleMongooseSchema } from "../../../../rules/mongoose/schemas/getRuleMongooseSchema.js";
import type { Rule } from "../../../../rules/rule/rule.js";
import type { RulesStorage } from "../../../../rules/storage/rulesStorage.js";
import { loggerMockedInstance } from "../../loggerMockedInstance.js";

describe("recordValidation", async () => {
	let mongoServer: MongoMemoryServer;
	let mongoConnection: Mongoose;
	let rulesStorage: RulesStorage;
	let model: Model<Rule>;

	beforeAll(async () => {
		mongoServer = await MongoMemoryServer.create();
		mongoConnection = await mongoose.connect(mongoServer.getUri());

		model = mongoConnection.model(
			"UserAccessPolicyRules",
			getRuleMongooseSchema(),
		);

		await model.syncIndexes();

		rulesStorage = new RulesMongooseStorage(loggerMockedInstance, model);
	});

	beforeEach(async () => {
		await model.deleteMany({});
	});

	afterAll(async () => {
		await mongoConnection.disconnect();
		await mongoServer.stop();
	});

	it("skippedFieldIsUndefinedInRecordObject", async () => {
		// given
		const recordData = {
			isUserBlocked: true,
			userId: "user",
		};

		// when
		const insertedRule = await rulesStorage.insert(recordData);

		// when, then
		expect(undefined === insertedRule?.userIp).toBeTruthy();
	});

	it("userIdIsRequiredWhenUserIpIsNotSet", async () => {
		// given
		const insertRecordWithoutUserIpAndId = async () =>
			await rulesStorage.insert({
				isUserBlocked: true,
			});

		// when, then
		expect(insertRecordWithoutUserIpAndId()).rejects.toThrow();
	});

	it("userIdIsOptionalWhenUserIpIsSet", async () => {
		// given
		const insertRecordWithUserId = async () =>
			await rulesStorage.insert({
				isUserBlocked: true,
				userIp: {
					v4: {
						asString: "0",
						asNumeric: BigInt(0),
					},
				},
			});

		// when
		const record = await insertRecordWithUserId();

		// then
		expect(record).not.toBeNull();
	});

	it("userIpIsRequiredWhenUserIdIsNotSet", async () => {
		// given
		const insertRecordWithoutUserIpAndId = async () =>
			await rulesStorage.insert({
				isUserBlocked: true,
			});

		// when, then
		expect(insertRecordWithoutUserIpAndId()).rejects.toThrow();
	});

	it("userIpIsOptionalWhenUserIdIsSet", async () => {
		// given
		const insertRecordWithUserId = async () =>
			await rulesStorage.insert({
				isUserBlocked: true,
				userId: "userId",
			});

		// when
		const record = await insertRecordWithUserId();

		// then
		expect(record).not.toBeNull();
	});

	it("rejectsRecordWithoutBothV4AndV6", async () => {
		// given
		const insertRecordWithoutV4AndV6 = async () =>
			await rulesStorage.insert({
				isUserBlocked: true,
				userIp: {},
			});

		// when, then
		expect(insertRecordWithoutV4AndV6()).rejects.toThrow();
	});

	it("v4IsOptionalWhenV6IsSet", async () => {
		// given
		const insertRecordWithV4 = async () =>
			await rulesStorage.insert({
				isUserBlocked: true,
				userIp: {
					v6: {
						asNumericString: "0",
						asString: "0",
					},
				},
			});

		// when
		const record = await insertRecordWithV4();

		// then
		expect(record).not.toBeNull();
	});

	it("v6IsOptionalWhenV4IsSet", async () => {
		// given
		const insertRecordWithV4 = async () =>
			await rulesStorage.insert({
				isUserBlocked: true,
				userIp: {
					v4: {
						asNumeric: BigInt(0),
						asString: "0",
					},
				},
			});

		// when
		const record = await insertRecordWithV4();

		// then
		expect(record).not.toBeNull();
	});
});

import type { IPAddress } from "@prosopo/types";
import { RulesMongooseStorage } from "@rules/mongoose/rulesMongooseStorage.js";
import { getRuleMongooseSchema } from "@rules/mongoose/schemas/getRuleMongooseSchema.js";
import { RuleIpVersion } from "@rules/rule/ip/ruleIpVersion.js";
import type { Rule } from "@rules/rule/rule.js";
import type { RulesStorage } from "@rules/storage/rulesStorage.js";
import { Address4, Address6 } from "ip-address";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { type Connection, type Model, type Mongoose } from "mongoose";
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
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

describe.each([
	// ipV4
	{
		version: RuleIpVersion.v4,
		fieldSuffix: "asNumeric",
		lessMin: new Address4("192.168.0.255"),
		min: new Address4("192.168.1.0"),
		middle: new Address4("192.168.1.100"),
		max: new Address4("192.168.1.255"),
		greaterMax: new Address4("192.168.2.0"),
	},
	// ipV6
	{
		version: RuleIpVersion.v6,
		fieldSuffix: "asNumericString",
		lessMin: new Address6("::ffff:ffff:ffff:ffff"),
		min: new Address6("2001:db8::"),
		middle: new Address6("2001:db8::100"),
		max: new Address6("2001:db8::ffff:ffff:ffff:ffff"),
		greaterMax: new Address6("2001:db9::"),
	},
	// ipV6 short
	{
		version: RuleIpVersion.v6,
		fieldSuffix: "asNumericString",
		lessMin: new Address6("::1"),
		min: new Address6("::2"),
		middle: new Address6("::3"),
		max: new Address6("::4"),
		greaterMax: new Address6("::5"),
	},
])("RulesMongooseStorageIps", async (ipRange) => {
	function getNumericIp(ipAddress: IPAddress): string | bigint {
		return RuleIpVersion.v4 === ipRange.version
			? ipAddress.bigInt()
			: ipAddress.bigInt().toString();
	}

	const suffixWithUcfirst =
		ipRange.fieldSuffix.charAt(0).toUpperCase() + ipRange.fieldSuffix.slice(1);
	const rangeMinKey = `rangeMin${suffixWithUcfirst}`;
	const rangeMaxKey = `rangeMax${suffixWithUcfirst}`;
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

		rulesStorage = new RulesMongooseStorage(model);
	});

	beforeEach(async () => {
		await model.deleteMany({});
	});

	afterAll(async () => {
		await mongoConnection.disconnect();
		await mongoServer.stop();
	});

	it("findsRecordByUserIp", async () => {
		// given
		const rule: Rule = {
			isUserBlocked: false,
			userIp: {
				[ipRange.version]: {
					[ipRange.fieldSuffix]: getNumericIp(ipRange.middle),
					asString: ipRange.middle.bigInt().toString(),
				},
			},
		};
		const record = await rulesStorage.insert(rule);

		// when
		const rules = await rulesStorage.find({
			userIpAddress: ipRange.middle,
		});

		// then
		expect(rules.length).toBe(1);
		expect(rules[0]?._id.toString()).toBe(record._id.toString());
	});

	it("findIgnoresRecordWithAnotherUserIp", async () => {
		// given
		const rule: Rule = {
			isUserBlocked: false,
			userIp: {
				[ipRange.version]: {
					[ipRange.fieldSuffix]: getNumericIp(ipRange.middle),
					asString: ipRange.middle.bigInt().toString(),
				},
			},
		};
		await rulesStorage.insert(rule);

		// when
		const rules = await rulesStorage.find({
			userIpAddress: ipRange.max,
		});

		// then
		expect(rules.length).toBe(0);
	});

	it("findIgnoresRecordByUserIpMask", async () => {
		// given
		const rule: Rule = {
			isUserBlocked: false,
			userIp: {
				[ipRange.version]: {
					[ipRange.fieldSuffix]: getNumericIp(ipRange.min),
					asString: ipRange.min.bigInt().toString(),
					mask: {
						[rangeMinKey]: getNumericIp(ipRange.min),
						[rangeMaxKey]: getNumericIp(ipRange.max),
						asNumeric: 24,
					},
				},
			},
		};
		const record = await rulesStorage.insert(rule);

		// when
		const rules = await rulesStorage.find({
			userIpAddress: ipRange.middle,
		});

		// then
		expect(rules.length).toBe(1);
		expect(rules[0]?._id.toString()).toBe(record._id.toString());
	});

	it("findsRecordByUserIpMaskInRangeMin", async () => {
		const rule: Rule = {
			isUserBlocked: false,
			userIp: {
				[ipRange.version]: {
					[ipRange.fieldSuffix]: getNumericIp(ipRange.min),
					asString: ipRange.min.bigInt().toString(),
					mask: {
						[rangeMinKey]: getNumericIp(ipRange.min),
						[rangeMaxKey]: getNumericIp(ipRange.max),
						asNumeric: 24,
					},
				},
			},
		};
		const record = await rulesStorage.insert(rule);

		// when
		const rules = await rulesStorage.find({
			userIpAddress: ipRange.min,
		});

		// then
		expect(rules.length).toBe(1);
		expect(rules[0]?._id.toString()).toBe(record._id.toString());
	});

	it("findsRecordByUserIpMaskInRangeMax", async () => {
		// given
		const rule: Rule = {
			isUserBlocked: false,
			userIp: {
				[ipRange.version]: {
					[ipRange.fieldSuffix]: getNumericIp(ipRange.min),
					asString: ipRange.min.bigInt().toString(),
					mask: {
						[rangeMinKey]: getNumericIp(ipRange.min),
						[rangeMaxKey]: getNumericIp(ipRange.max),
						asNumeric: 24,
					},
				},
			},
		};
		const record = await rulesStorage.insert(rule);

		// when
		const rules = await rulesStorage.find({
			userIpAddress: ipRange.max,
		});

		// then
		expect(rules.length).toBe(1);
		expect(rules[0]?._id.toString()).toBe(record._id.toString());
	});

	it("findIgnoresRecordWithUserIpMaskOutOfRangeMin", async () => {
		// given
		const rule: Rule = {
			isUserBlocked: false,
			userIp: {
				[ipRange.version]: {
					[ipRange.fieldSuffix]: getNumericIp(ipRange.min),
					asString: ipRange.min.bigInt().toString(),
					mask: {
						[rangeMinKey]: getNumericIp(ipRange.min),
						[rangeMaxKey]: getNumericIp(ipRange.max),
						asNumeric: 24,
					},
				},
			},
		};
		await rulesStorage.insert(rule);

		// when
		const rules = await rulesStorage.find({
			userIpAddress: ipRange.lessMin,
		});

		// then
		expect(rules.length).toBe(0);
	});

	it("findIgnoresRecordWithUserIpMaskOutOfRangeMax", async () => {
		// given
		const rule: Rule = {
			isUserBlocked: false,
			userIp: {
				[ipRange.version]: {
					[ipRange.fieldSuffix]: getNumericIp(ipRange.min),
					asString: ipRange.min.bigInt().toString(),
					mask: {
						[rangeMinKey]: getNumericIp(ipRange.min),
						[rangeMaxKey]: getNumericIp(ipRange.max),
						asNumeric: 24,
					},
				},
			},
		};
		await rulesStorage.insert(rule);

		// when
		const rules = await rulesStorage.find({
			userIpAddress: ipRange.greaterMax,
		});

		// then
		expect(rules.length).toBe(0);
	});

	//// unique indexes

	it.each([
		{
			clientId: "client",
		} as Rule,
		{},
	])("acceptsUniqueIp", async (clientIdPart) => {
		// given
		await rulesStorage.insert({
			...clientIdPart,
			isUserBlocked: true,
			userIp: {
				[ipRange.version]: {
					[ipRange.fieldSuffix]: getNumericIp(ipRange.min),
					asString: ipRange.min.bigInt().toString(),
				},
			},
		});

		// when
		const anotherRecord = await rulesStorage.insert({
			...clientIdPart,
			isUserBlocked: true,
			userIp: {
				[ipRange.version]: {
					[ipRange.fieldSuffix]: getNumericIp(ipRange.max),
					asString: ipRange.max.bigInt().toString(),
				},
			},
		});

		// then
		expect(anotherRecord).not.toBeNull();
	});

	it.each([
		{
			clientId: "client",
		} as Rule,
		{},
	])("rejectsDuplicatedIp", async (clientIdPart) => {
		// given
		await rulesStorage.insert({
			...clientIdPart,
			isUserBlocked: true,
			userIp: {
				[ipRange.version]: {
					[ipRange.fieldSuffix]: getNumericIp(ipRange.middle),
					asString: ipRange.middle.bigInt().toString(),
				},
			},
		});

		// when
		const insertDuplicate = async () =>
			await rulesStorage.insert({
				...clientIdPart,
				isUserBlocked: true,
				userIp: {
					[ipRange.version]: {
						[ipRange.fieldSuffix]: getNumericIp(ipRange.middle),
						asString: ipRange.middle.bigInt().toString(),
					},
				},
			});

		// then
		expect(insertDuplicate()).rejects.toThrow();
	});

	it.each([
		{
			clientId: "client",
		} as Rule,
		{},
	])("acceptsUniqueIpMask", async (clientIdPart) => {
		// given
		await rulesStorage.insert({
			...clientIdPart,
			isUserBlocked: true,
			userIp: {
				[ipRange.version]: {
					[ipRange.fieldSuffix]: getNumericIp(ipRange.min),
					asString: ipRange.min.bigInt().toString(),
					mask: {
						[rangeMinKey]: getNumericIp(ipRange.min),
						[rangeMaxKey]: getNumericIp(ipRange.max),
						asNumeric: 24,
					},
				},
			},
		});

		// when
		const anotherRecord = await rulesStorage.insert({
			...clientIdPart,
			isUserBlocked: true,
			userIp: {
				[ipRange.version]: {
					[ipRange.fieldSuffix]: getNumericIp(ipRange.max),
					asString: ipRange.max.bigInt().toString(),
					mask: {
						[rangeMinKey]: getNumericIp(ipRange.min),
						[rangeMaxKey]: getNumericIp(ipRange.max),
						asNumeric: 24,
					},
				},
			},
		});

		// then
		expect(anotherRecord).not.toBeNull();
	});

	it.each([
		{
			clientId: "client",
		} as Rule,
		{},
	])("rejectsDuplicatedIpMask", async (clientIdPart) => {
		// given
		await rulesStorage.insert({
			...clientIdPart,
			isUserBlocked: true,
			userIp: {
				[ipRange.version]: {
					[ipRange.fieldSuffix]: getNumericIp(ipRange.min),
					asString: ipRange.min.bigInt().toString(),
					mask: {
						[rangeMinKey]: getNumericIp(ipRange.min),
						[rangeMaxKey]: getNumericIp(ipRange.max),
						asNumeric: 24,
					},
				},
			},
		});

		// when
		const insertDuplicate = async () =>
			await rulesStorage.insert({
				...clientIdPart,
				isUserBlocked: true,
				userIp: {
					[ipRange.version]: {
						[ipRange.fieldSuffix]: getNumericIp(ipRange.min),
						asString: ipRange.min.bigInt().toString(),
						mask: {
							[rangeMinKey]: getNumericIp(ipRange.min),
							[rangeMaxKey]: getNumericIp(ipRange.max),
							asNumeric: 24,
						},
					},
				},
			});

		// then
		expect(insertDuplicate()).rejects.toThrow();
	});

	it("globalAndClientCanHaveSameIp", async () => {
		// given
		await rulesStorage.insert({
			isUserBlocked: true,
			userIp: {
				[ipRange.version]: {
					[ipRange.fieldSuffix]: getNumericIp(ipRange.middle),
					asString: ipRange.middle.bigInt().toString(),
				},
			},
		});

		// when
		const anotherRecord = await rulesStorage.insert({
			clientId: "client",
			isUserBlocked: true,
			userIp: {
				[ipRange.version]: {
					[ipRange.fieldSuffix]: getNumericIp(ipRange.middle),
					asString: ipRange.middle.bigInt().toString(),
				},
			},
		});

		// then
		expect(anotherRecord).not.toBeNull();
	});

	it("globalAndClientCanHaveSameIpMask", async () => {
		// given
		await rulesStorage.insert({
			isUserBlocked: true,
			userIp: {
				[ipRange.version]: {
					[ipRange.fieldSuffix]: getNumericIp(ipRange.middle),
					asString: ipRange.middle.bigInt().toString(),
					mask: {
						[rangeMinKey]: getNumericIp(ipRange.min),
						[rangeMaxKey]: getNumericIp(ipRange.max),
						asNumeric: 24,
					},
				},
			},
		});

		// when
		const anotherRecord = await rulesStorage.insert({
			clientId: "client",
			isUserBlocked: true,
			userIp: {
				[ipRange.version]: {
					[ipRange.fieldSuffix]: getNumericIp(ipRange.middle),
					asString: ipRange.middle.bigInt().toString(),
					mask: {
						[rangeMinKey]: getNumericIp(ipRange.min),
						[rangeMaxKey]: getNumericIp(ipRange.max),
						asNumeric: 24,
					},
				},
			},
		});

		// then
		expect(anotherRecord).not.toBeNull();
	});
});

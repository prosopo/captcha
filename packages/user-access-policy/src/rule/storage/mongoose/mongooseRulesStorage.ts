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

import type { Rule } from "@prosopo/types";
import { Address4, type Address6 } from "ip-address";
import type { Model } from "mongoose";
import IpVersion from "../../../ip/ipVersion.js";
import type SearchRuleFilterSettings from "../filters/search/searchRuleFilterSettings.js";
import type SearchRuleFilters from "../filters/search/searchRuleFilters.js";
import type RuleRecord from "../ruleRecord.js";
import type RulesStorage from "../rulesStorage.js";
import type MongooseRuleRecord from "./mongooseRuleRecord.js";

class MongooseRulesStorage implements RulesStorage {
	private model: Model<Rule> | null;

	constructor(model: Model<Rule> | null) {
		this.model = model;
	}

	public async insertMany(records: Rule[]): Promise<RuleRecord[]> {
		if (!this.model) {
			throw new Error("Model is not set");
		}

		const mongooseRecords = await this.model.insertMany(records);

		const ruleRecords =
			this.convertMongooseRecordsToRuleRecords(mongooseRecords);

		return ruleRecords;
	}

	public async find(
		filters: SearchRuleFilters,
		filterSettings?: SearchRuleFilterSettings,
	): Promise<RuleRecord[]> {
		if (!this.model) {
			throw new Error("Model is not set");
		}

		const query = this.createQuery(filters, filterSettings);

		const mongooseRecords = await this.model.find(query).lean().exec();

		const ruleRecords =
			this.convertMongooseRecordsToRuleRecords(mongooseRecords);

		return ruleRecords;
	}

	public async deleteMany(recordFilters: SearchRuleFilters[]): Promise<void> {
		if (!this.model) {
			throw new Error("Model is not set");
		}

		for (const recordFilter of recordFilters) {
			await this.model.deleteOne(recordFilter).exec();
		}
	}

	public setModel(model: Model<Rule>): void {
		this.model = model;
	}

	protected createQuery(
		filters: SearchRuleFilters,
		filterSettings?: SearchRuleFilterSettings,
	): object {
		const includeRecordsWithoutClientId =
			filterSettings?.includeRecordsWithoutClientId || false;
		const includeRecordsWithPartialFilterMatches =
			filterSettings?.includeRecordsWithPartialFilterMatches || false;

		let queryParts = [
			this.getFilterByClientId(includeRecordsWithoutClientId, filters.clientId),
		];

		const queryFilters = this.getQueryFilters(
			filters,
			includeRecordsWithPartialFilterMatches,
		);

		queryParts = queryParts.concat(queryFilters);

		return {
			$and: queryParts,
		};
	}

	protected getQueryFilters(
		filters: SearchRuleFilters,
		includeRecordsWithPartialFilterMatches: boolean,
	): object[] {
		const queryFilters = [];

		if (undefined !== filters.userId) {
			queryFilters.push({ userId: filters.userId });
		}

		if (undefined !== filters.userIpAddress) {
			queryFilters.push(this.getFilterByUserIp(filters.userIpAddress));
		}

		return includeRecordsWithPartialFilterMatches && queryFilters.length > 1
			? [{ $or: queryFilters }]
			: queryFilters;
	}

	protected getFilterByClientId(
		includeRecordsWithoutClientId: boolean,
		clientId?: string,
	): object {
		const clientIdValue =
			undefined === clientId ? { $exists: false } : clientId;

		const clientIdFilter = {
			clientId: clientIdValue,
		};

		return includeRecordsWithoutClientId
			? {
					$or: [clientIdFilter, { clientId: { $exists: false } }],
				}
			: clientIdFilter;
	}

	protected getFilterByUserIp(
		userIpAddress: Address4 | Address6 | null,
	): object {
		return null !== userIpAddress
			? this.getFilterByUserIpAddress(userIpAddress)
			: { userIp: null };
	}

	protected getFilterByUserIpAddress(
		userIpAddress: Address4 | Address6,
	): object {
		const isIpV4 = userIpAddress instanceof Address4;

		const userIpVersion = isIpV4 ? IpVersion.v4 : IpVersion.v6;

		const userIpAsNumeric = isIpV4
			? userIpAddress.bigInt()
			: userIpAddress.bigInt().toString();

		const userIpKey =
			userIpVersion === IpVersion.v4
				? "userIp.v4.asNumeric"
				: "userIp.v6.asNumericString";
		const rangeMinKey =
			userIpVersion === IpVersion.v4
				? "userIp.v4.mask.rangeMinAsNumeric"
				: "userIp.v6.mask.rangeMinAsNumericString";
		const rangeMaxKey =
			userIpVersion === IpVersion.v4
				? "userIp.v4.mask.rangeMaxAsNumeric"
				: "userIp.v6.mask.rangeMaxAsNumericString";

		return {
			$or: [
				{ [userIpKey]: userIpAsNumeric },
				{
					[rangeMinKey]: {
						$lte: userIpAsNumeric,
					},
					[rangeMaxKey]: {
						$gte: userIpAsNumeric,
					},
				},
			],
		};
	}

	protected convertMongooseRecordsToRuleRecords(
		records: MongooseRuleRecord[],
	): RuleRecord[] {
		const ruleRecords = records.map((record) =>
			this.convertMongooseRecordToRuleRecord(record),
		);

		return ruleRecords;
	}

	protected convertMongooseRecordToRuleRecord(
		record: MongooseRuleRecord,
	): RuleRecord {
		const ruleRecord = {
			...record,
			_id: record._id.toString(),
		};

		return ruleRecord;
	}
}

export default MongooseRulesStorage;

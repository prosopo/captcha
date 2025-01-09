import { ProsopoError } from "@prosopo/common";
import type { IPAddress } from "@prosopo/types";
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
import type { Model } from "mongoose";
import { IpVersion } from "../../ip/ipVersion.js";
import type { Rule } from "../rule.js";
import type { MongooseRuleRecord } from "./record/mongooseRuleRecord.js";
import type { RuleRecord } from "./record/ruleRecord.js";
import type { RulesStorage } from "./rulesStorage.js";
import type { SearchRuleFilterSettings } from "./search/searchRuleFilterSettings.js";
import type { SearchRuleFilters } from "./search/searchRuleFilters.js";

class MongooseRulesStorage implements RulesStorage {
	constructor(
		private readingModel: Model<Rule> | null,
		private writingModel: Model<Rule> | null = null,
	) {
		if (null === this.writingModel) {
			this.writingModel = this.readingModel;
		}
	}

	public async insert(record: Rule): Promise<RuleRecord> {
		if (!this.writingModel) {
			throw this.modelNotSetProsopoError();
		}

		const document = await this.writingModel.create(record);

		const ruleRecord = this.convertMongooseRecordToRuleRecord(
			document.toObject(),
		);

		return ruleRecord;
	}

	public async insertMany(records: Rule[]): Promise<RuleRecord[]> {
		if (!this.writingModel) {
			throw this.modelNotSetProsopoError();
		}

		const documents = await this.writingModel.insertMany(records);
		const objectDocuments = documents.map((document) => document.toObject());

		const ruleRecords =
			this.convertMongooseRecordsToRuleRecords(objectDocuments);

		return ruleRecords;
	}

	public async find(
		filters: SearchRuleFilters,
		filterSettings?: SearchRuleFilterSettings,
	): Promise<RuleRecord[]> {
		if (!this.readingModel) {
			throw this.modelNotSetProsopoError();
		}

		const query = this.createSearchQuery(filters, filterSettings);

		const mongooseRecords = await this.readingModel.find(query).lean().exec();

		const ruleRecords =
			this.convertMongooseRecordsToRuleRecords(mongooseRecords);

		return ruleRecords;
	}

	public async deleteMany(recordFilters: SearchRuleFilters[]): Promise<void> {
		if (!this.writingModel) {
			throw this.modelNotSetProsopoError();
		}

		for (const recordFilter of recordFilters) {
			await this.writingModel.deleteOne(recordFilter).exec();
		}
	}

	public async countRecords(): Promise<number> {
		if (!this.readingModel) {
			throw this.modelNotSetProsopoError();
		}

		const count = await this.readingModel.countDocuments().exec();

		return count;
	}

	protected modelNotSetProsopoError(): ProsopoError {
		return new ProsopoError("USER_ACCESS_POLICY.MONGOOSE_RULE_MODEL_NOT_SET");
	}

	protected createSearchQuery(
		filters: SearchRuleFilters,
		filterSettings?: SearchRuleFilterSettings,
	): object {
		const includeRecordsWithoutClientId =
			filterSettings?.includeRecordsWithoutClientId || false;
		const includeRecordsWithPartialFilterMatches =
			filterSettings?.includeRecordsWithPartialFilterMatches || false;

		const queryParts = [
			this.getFilterByClientId(includeRecordsWithoutClientId, filters.clientId),
		];

		const queryFilters = this.getSearchQueryFilters(
			filters,
			includeRecordsWithPartialFilterMatches,
		);

		return {
			$and: queryParts.concat(queryFilters),
		};
	}

	protected getSearchQueryFilters(
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

	protected getFilterByUserIp(userIpAddress: IPAddress | null): object {
		return null !== userIpAddress
			? this.getFilterByUserIpAddress(userIpAddress)
			: { userIp: null };
	}

	protected getFilterByUserIpAddress(userIpAddress: IPAddress): object {
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
		mongooseRecords: MongooseRuleRecord[],
	): RuleRecord[] {
		const ruleRecords = mongooseRecords.map((mongooseRecord) =>
			this.convertMongooseRecordToRuleRecord(mongooseRecord),
		);

		return ruleRecords;
	}

	protected convertMongooseRecordToRuleRecord(
		mongooseRecord: MongooseRuleRecord,
	): RuleRecord {
		const ruleRecord = {
			...mongooseRecord,
			_id: mongooseRecord._id.toString(),
		};

		return ruleRecord;
	}
}

export { MongooseRulesStorage };

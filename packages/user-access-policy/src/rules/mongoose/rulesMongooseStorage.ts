// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import { type Logger, ProsopoError } from "@prosopo/common";
import type { IPAddress } from "@prosopo/types";
import { Address4 } from "ip-address";
import type { Model } from "mongoose";
import { RuleIpVersion } from "../rule/ip/ruleIpVersion.js";
import { RULE_IPV6_NUMERIC_MAX_LENGTH } from "../rule/ip/v6/ruleIpV6NumericMaxLength.js";
import type { Rule } from "../rule/rule.js";
import type { SearchRuleFilterSettings } from "../storage/filters/search/searchRuleFilterSettings.js";
import type { SearchRuleFilters } from "../storage/filters/search/searchRuleFilters.js";
import type { RuleRecord } from "../storage/ruleRecord.js";
import type { RulesStorage } from "../storage/rulesStorage.js";
import type { RuleMongooseRecord } from "./ruleMongooseRecord.js";

class RulesMongooseStorage implements RulesStorage {
	constructor(
		private readonly logger: Logger,
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

		const filter = {
			...(record.clientId && { clientId: record.clientId }),
			...(record.userIp && { userIp: record.userIp }),
			...(record.userId && { userId: record.userId }),
			...(record.ja4 && { ja4: record.ja4 }),
		};

		// Validate record manually
		const validationError = new this.writingModel(record).validateSync();
		if (validationError) {
			throw validationError; // Reject invalid input before DB call
		}

		const document = await this.writingModel.findOneAndUpdate(
			filter,
			record,
			{ new: true, upsert: true, runValidators: true }, // 🔥 Enforce schema validation!
		);

		const ruleRecord = this.convertMongooseRecordToRuleRecord(
			document.toObject(),
		);

		return ruleRecord;
	}

	public async insertMany(records: Rule[]): Promise<RuleRecord[]> {
		if (!this.writingModel) {
			throw this.modelNotSetProsopoError();
		}
		if (!this.readingModel) {
			throw this.modelNotSetProsopoError();
		}

		const beforeDelete = await this.writingModel.find({});
		this.logger.debug(() => ({
			data: { length: beforeDelete.length },
			msg: "Before deletion, DB records"
		}));

		// Delete the existing ip records to avoid duplicates.
		await this.writingModel.bulkWrite(
			records.map((record) => {
				const filter = {
					...(record.clientId && { clientId: record.clientId }),
					...(record.userIp && { userIp: record.userIp }),
					...(record.userId && { userId: record.userId }),
					...(record.ja4 && { ja4: record.ja4 }),
				};
				return {
					deleteOne: {
						filter,
					},
				};
			}),
		);
		this.logger.debug(() => ({
			data: {},
			msg: "After deletion"
		}));
		const afterDelete = await this.readingModel.find({});
		this.logger.debug(() => ({
			data: { length: afterDelete.length },
			msg: "After deletion, DB records"
		}));

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

		if (filters.userId) {
			queryFilters.push({ userId: filters.userId });
		}

		if (filters.userIpAddress) {
			queryFilters.push(this.getFilterByUserIp(filters.userIpAddress));
		}

		if (filters.ja4) {
			queryFilters.push({ ja4: filters.ja4 });
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

		const userIpVersion = isIpV4 ? RuleIpVersion.v4 : RuleIpVersion.v6;

		const userIpAsNumeric = isIpV4
			? userIpAddress.bigInt()
			: // we must have the exact same string length to guarantee the right comparison.
			userIpAddress
				.bigInt()
				.toString()
				.padStart(RULE_IPV6_NUMERIC_MAX_LENGTH, "0");

		const userIpKey =
			userIpVersion === RuleIpVersion.v4
				? "userIp.v4.asNumeric"
				: "userIp.v6.asNumericString";
		const rangeMinKey =
			userIpVersion === RuleIpVersion.v4
				? "userIp.v4.mask.rangeMinAsNumeric"
				: "userIp.v6.mask.rangeMinAsNumericString";
		const rangeMaxKey =
			userIpVersion === RuleIpVersion.v4
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
		mongooseRecords: RuleMongooseRecord[],
	): RuleRecord[] {
		const ruleRecords = mongooseRecords.map((mongooseRecord) =>
			this.convertMongooseRecordToRuleRecord(mongooseRecord),
		);

		return ruleRecords;
	}

	protected convertMongooseRecordToRuleRecord(
		mongooseRecord: RuleMongooseRecord,
	): RuleRecord {
		const ruleRecord = {
			...mongooseRecord,
			_id: mongooseRecord._id.toString(),
		};

		return ruleRecord;
	}
}

export { RulesMongooseStorage };

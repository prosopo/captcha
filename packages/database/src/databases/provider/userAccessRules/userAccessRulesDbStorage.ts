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
import {
	type RuleFilterSettings,
	type SearchRuleFilters,
	type UserAccessRule,
	type UserAccessRuleRecord,
	type UserAccessRulesStorage,
	UserIpVersion,
} from "@prosopo/types-database";
import { Address4, type Address6 } from "ip-address";
import type { Model } from "mongoose";

class UserAccessRulesDbStorage implements UserAccessRulesStorage {
	private model: Model<UserAccessRule> | null;

	constructor(model: Model<UserAccessRule> | null) {
		this.model = model;
	}

	public async insertMany(records: UserAccessRule[]): Promise<UserAccessRuleRecord[]> {
		if (!this.model) {
			throw new Error("Model is not set");
		}

		return await this.model.insertMany(records);
	}

	public async find(
		filters: SearchRuleFilters,
		filterSettings?: RuleFilterSettings,
	): Promise<UserAccessRuleRecord[]> {
		if (!this.model) {
			throw new Error("Model is not set");
		}

		const query = this.createQuery(filters, filterSettings);

		return await this.model.find(query).exec();
	}

	public setModel(model: Model<UserAccessRule>): void {
		this.model = model;
	}

	protected createQuery(
		filters: SearchRuleFilters,
		filterSettings?: RuleFilterSettings,
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

		const userIpVersion = isIpV4 ? UserIpVersion.v4 : UserIpVersion.v6;

		const userIpAsNumeric = isIpV4
			? userIpAddress.bigInt()
			: userIpAddress.bigInt().toString();

		const userIpKey =
			userIpVersion === UserIpVersion.v4
				? "userIp.v4.asNumeric"
				: "userIp.v6.asNumericString";
		const rangeMinKey =
			userIpVersion === UserIpVersion.v4
				? "userIp.v4.mask.rangeMinAsNumeric"
				: "userIp.v6.mask.rangeMinAsNumericString";
		const rangeMaxKey =
			userIpVersion === UserIpVersion.v4
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
}

export { UserAccessRulesDbStorage };

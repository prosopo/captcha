import {
	type RuleFilters,
	type RuleFilterSettings,
	type UserAccessRule,
	type UserAccessRuleRecord,
	type UserAccessRulesStorage,
	UserIpVersion,
} from "@prosopo/types-database";
import type { Model } from "mongoose";
import { Address4, type Address6 } from "ip-address";

class UserAccessRulesDbStorage implements UserAccessRulesStorage {
	private model: Model<UserAccessRule> | null;

	constructor(model: Model<UserAccessRule> | null) {
		this.model = model;
	}

	public async find(
		clientId: string | null,
		filters: RuleFilters | null = null,
		filterSettings: RuleFilterSettings | null = null,
	): Promise<UserAccessRuleRecord[]> {
		if (!this.model) {
			throw new Error("Model is not set");
		}

		const query = this.createQuery(clientId, filters, filterSettings);

		return this.model.find(query).exec();
	}

	public setModel(model: Model<UserAccessRule>): void {
		this.model = model;
	}

	protected createQuery(
		clientId: string | null,
		filters: RuleFilters | null,
		filterSettings: RuleFilterSettings | null,
	): object {
		const includeRecordsWithoutClientId =
			filterSettings?.includeRecordsWithoutClientId || false;
		const includeRecordsWithPartialFilterMatches =
			filterSettings?.includeRecordsWithPartialFilterMatches || false;

		let queryParts = [
			this.getFilterByClientId(clientId, includeRecordsWithoutClientId),
		];

		if (null !== filters) {
			const queryFilters = this.getQueryFilters(
				filters,
				includeRecordsWithPartialFilterMatches,
			);

			queryParts = queryParts.concat(queryFilters);
		}

		return {
			$and: queryParts,
		};
	}

	protected getQueryFilters(
		filters: RuleFilters,
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
		clientId: string | null,
		includeRecordsWithoutClientId: boolean,
	): object {
		const clientIdValue = null === clientId ? { $exists: false } : clientId;

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

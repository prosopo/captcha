import {
	type RuleFilters,
	type UserAccessRule,
	type UserAccessRules,
	UserIpVersion,
} from "@prosopo/types-database";
import type { Model } from "mongoose";
import { Address4, type Address6 } from "ip-address";

class MongoUserAccessRules implements UserAccessRules {
	private model: Model<UserAccessRule> | null;

	constructor(model: Model<UserAccessRule> | null) {
		this.model = model;
	}

	public async findByFilters(filters: RuleFilters): Promise<UserAccessRule[]> {
		if (!this.model) {
			throw new Error("Model is not set");
		}

		const userId = filters.userId || null;
		const userIpAddress = filters.userIpAddress || null;
		const clientAccountId = filters.clientAccountId || null;

		const queryFilters = [this.getFilterByClientAccountId(clientAccountId)];

		if (null !== userIpAddress) {
			const filterByUserIp = this.getFilterByUserIp(userIpAddress);

			queryFilters.push(filterByUserIp);
		}

		const query = {
			$and: queryFilters,
		};

		return this.model.find(query).exec();
	}

	public setModel(model: Model<UserAccessRule>): void {
		this.model = model;
	}

	protected getFilterByClientAccountId(clientAccountId: string | null): object {
		return clientAccountId
			? {
					$or: [
						{ clientAccountId: clientAccountId },
						{ clientAccountId: null },
					],
				}
			: {
					clientAccountId: null,
				};
	}

	protected getFilterByUserIp(userIpAddress: Address4 | Address6): object {
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

export { MongoUserAccessRules };

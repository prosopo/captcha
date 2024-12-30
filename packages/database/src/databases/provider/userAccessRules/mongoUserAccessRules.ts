import {
	type UserAccessRule,
	type UserAccessRules,
	UserIpVersion,
} from "@prosopo/types-database";
import type { Model } from "mongoose";

class MongoUserAccessRules implements UserAccessRules {
	private model: Model<UserAccessRule> | null;

	constructor(model: Model<UserAccessRule> | null) {
		this.model = model;
	}

	public async findByUserIp(
		userIpVersion: UserIpVersion,
		userIpAsNumeric: bigint | string,
		clientAccountId: string | null = null,
	): Promise<UserAccessRule[]> {
		if (!this.model) {
			throw new Error("Model is not set");
		}

		const query = this.createFindByUserIpQuery(
			userIpVersion,
			userIpAsNumeric,
			clientAccountId,
		);

		return this.model.find(query).exec();
	}

	public setModel(model: Model<UserAccessRule>): void {
		this.model = model;
	}

	protected createFindByUserIpQuery(
		userIpVersion: UserIpVersion,
		userIpAsNumeric: bigint | string,
		clientAccountId: string | null = null,
	): object {
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

		const clientAccountCondition = clientAccountId
			? {
					$or: [
						{ clientAccountId: clientAccountId },
						{ clientAccountId: null },
					],
				}
			: {
					clientAccountId: null,
				};

		return {
			$and: [
				{
					...clientAccountCondition,
				},
				{
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
				},
			],
		};
	}
}

export { MongoUserAccessRules };

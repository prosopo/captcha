import type { UserAccessRule, UserAccessRules } from "@prosopo/types-database";
import type { Model } from "mongoose";

class MongoUserAccessRules implements UserAccessRules {
	private model: Model<UserAccessRule> | null;

	constructor(model: Model<UserAccessRule> | null) {
		this.model = model;
	}

	public async findByUserIpV4(
		userIpAsNumeric: bigint,
		clientAccountId: string | null = null,
	): Promise<UserAccessRule[]> {
		if (!this.model) {
			throw new Error("Model is not set");
		}

		const query = {
			$and: [
				{
					...this.createQueryConditionForClientAccountId(clientAccountId),
				},
				{
					$or: [
						{ "userIp.v4.asNumeric": userIpAsNumeric },
						{
							"userIp.v4.mask.rangeMinAsNumeric": {
								$lte: userIpAsNumeric,
							},
							"userIp.v4.mask.rangeMaxAsNumeric": {
								$gte: userIpAsNumeric,
							},
						},
					],
				},
			],
		};

		return this.model.find(query).exec();
	}

	public async findByUserIpV6(
		userIpAsNumericString: string,
		clientAccountId: string | null = null,
	): Promise<UserAccessRule[]> {
		if (!this.model) {
			throw new Error("Model is not set");
		}

		const query = {
			$and: [
				{
					...this.createQueryConditionForClientAccountId(clientAccountId),
				},
				{
					$or: [
						{ "userIp.v6.asNumericString": userIpAsNumericString },
						{
							"userIp.v6.mask.rangeMinAsNumericString": {
								$lte: userIpAsNumericString,
							},
							"userIp.v6.mask.rangeMaxAsNumericString": {
								$gte: userIpAsNumericString,
							},
						},
					],
				},
			],
		};

		return this.model.find(query).exec();
	}

	public setModel(model: Model<UserAccessRule>): void {
		this.model = model;
	}

	protected createQueryConditionForClientAccountId(
		clientAccountId: string | null,
	): object {
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
}

export { MongoUserAccessRules };

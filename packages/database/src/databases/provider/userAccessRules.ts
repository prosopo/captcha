import type {
	UserAccessRules,
	UserAccessRule,
	UserIpVersion,
} from "@prosopo/types-database";
import type { Model } from "mongoose";
import type { Decimal128 } from "mongodb";

class MongoUserAccessRules implements UserAccessRules {
	private model: Model<UserAccessRule> | null;

	constructor(model: Model<UserAccessRule> | null) {
		this.model = model;
	}

	public async getByUserIp(
		userIpVersion: UserIpVersion,
		userNumericIp: Decimal128,
		clientAccountId: string | null = null,
	): Promise<UserAccessRule[]> {
		if (!this.model) {
			throw new Error("Model is not set");
		}

		const query = {
			$and: [
				{
					"userIp.version": userIpVersion,
				},
				{
					...(clientAccountId
						? {
								$or: [
									{ clientAccountId: clientAccountId },
									{ clientAccountId: null },
								],
							}
						: {
								clientAccountId: null,
							}),
				},
				{
					$or: [
						{ "userIp.numericPresentation": userNumericIp },
						{
							"userIp.mask.rangeMin": { $lte: userNumericIp },
							"userIp.mask.rangeMax": { $gte: userNumericIp },
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
}

export { MongoUserAccessRules };

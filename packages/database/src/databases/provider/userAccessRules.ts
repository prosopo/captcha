import { Address4, type Address6 } from "ip-address";
import {
	type UserAccessRules,
	type UserAccessRule,
	UserIpVersion,
} from "@prosopo/types-database";
import type { Model } from "mongoose";

class MongoUserAccessRules implements UserAccessRules {
	private model: Model<UserAccessRule> | null;

	constructor(model: Model<UserAccessRule> | null) {
		this.model = model;
	}

	public async getByUserIp(
		userIp: Address4 | Address6,
		clientAccountId: string | null = null,
	): Promise<UserAccessRule[]> {
		if (!this.model) {
			throw new Error("Model is not set");
		}

		const ipNumeric = userIp.bigInt;
		const ipVersion =
			userIp instanceof Address4 ? UserIpVersion.v4 : UserIpVersion.v6;
		const query = {
			$and: [
				{
					"userIp.version": ipVersion,
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
						{ "userIp.numeric": ipNumeric },
						{
							"userIp.mask.rangeMin": { $lte: ipNumeric },
							"userIp.mask.rangeMax": { $gte: ipNumeric },
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

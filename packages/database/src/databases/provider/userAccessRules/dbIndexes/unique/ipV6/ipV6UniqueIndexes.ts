import type { Schema } from "mongoose";
import type { UserAccessRule } from "@prosopo/types-database";
import type { AccessRuleDbIndexes } from "../../accessRuleDbIndexes.js";

class IpV6UniqueIndexes implements AccessRuleDbIndexes {
	public setup(schema: Schema<UserAccessRule>): void {
		this.globalIp(schema);
		this.ipPerClient(schema);
	}

	protected globalIp(schema: Schema<UserAccessRule>): void {
		schema.index(
			{
				"userIp.v6.asNumericString": 1,
			},
			{
				unique: true,
				partialFilterExpression: {
					clientAccountId: null,
					"userIp.v6.asNumericString": { $exists: true },
					"userIp.v6.mask.asNumeric": null,
				},
			},
		);
	}

	protected ipPerClient(schema: Schema<UserAccessRule>): void {
		schema.index(
			{
				clientAccountId: 1,
				"userIp.v6.asNumericString": 1,
			},
			{
				unique: true,
				partialFilterExpression: {
					clientAccountId: { $exists: true },
					"userIp.v6.asNumericString": { $exists: true },
					"userIp.v6.mask.asNumeric": null,
				},
			},
		);
	}
}

const ipV6UniqueIndexes = new IpV6UniqueIndexes();

export { ipV6UniqueIndexes };

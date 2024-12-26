import type { Schema } from "mongoose";
import type { UserAccessRule } from "@prosopo/types-database";
import type { AccessRuleDbIndexes } from "../../accessRuleDbIndexes.js";

class IpV4UniqueIndexes implements AccessRuleDbIndexes {
	public setup(schema: Schema<UserAccessRule>): void {
		this.globalIp(schema);
		this.ipPerClient(schema);
	}

	protected globalIp(schema: Schema<UserAccessRule>): void {
		schema.index(
			{
				"userIp.v4.asNumeric": 1,
			},
			{
				unique: true,
				partialFilterExpression: {
					clientAccountId: null,
					"userIp.v4.asNumeric": { $exists: true },
					"userIp.v4.mask.asNumeric": null,
				},
			},
		);
	}

	protected ipPerClient(schema: Schema<UserAccessRule>): void {
		schema.index(
			{
				clientAccountId: 1,
				"userIp.v4.asNumeric": 1,
			},
			{
				unique: true,
				partialFilterExpression: {
					clientAccountId: { $exists: true },
					"userIp.v4.asNumeric": { $exists: true },
					"userIp.v4.mask.asNumeric": null,
				},
			},
		);
	}
}

const ipV4UniqueIndexes = new IpV4UniqueIndexes();

export { ipV4UniqueIndexes };

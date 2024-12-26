import type { Schema } from "mongoose";
import type { AccessRuleDbIndexes } from "../../accessRuleDbIndexes.js";
import type { UserAccessRule } from "@prosopo/types-database";

class IpV6MaskUniqueIndexes implements AccessRuleDbIndexes {
	public setup(schema: Schema<UserAccessRule>): void {
		this.globalIpMask(schema);
		this.ipMaskPerClient(schema);
	}

	protected globalIpMask(schema: Schema<UserAccessRule>): void {
		schema.index(
			{
				"userIp.v6.asNumericString": 1,
				"userIp.v6.mask.asNumeric": 1,
			},
			{
				unique: true,
				partialFilterExpression: {
					clientAccountId: null,
					"userIp.v6.asNumericString": { $exists: true },
					"userIp.v6.mask.asNumeric": { $exists: true },
				},
			},
		);
	}

	protected ipMaskPerClient(schema: Schema<UserAccessRule>): void {
		schema.index(
			{
				clientAccountId: 1,
				"userIp.v6.asNumericString": 1,
				"userIp.v6.mask.asNumeric": 1,
			},
			{
				unique: true,
				partialFilterExpression: {
					clientAccountId: { $exists: true },
					"userIp.v6.asNumericString": { $exists: true },
					"userIp.v6.mask.asNumeric": { $exists: true },
				},
			},
		);
	}
}

const ipV6MaskUniqueIndexes = new IpV6MaskUniqueIndexes();

export { ipV6MaskUniqueIndexes };

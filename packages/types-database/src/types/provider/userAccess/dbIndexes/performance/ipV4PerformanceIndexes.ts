import type { Schema } from "mongoose";
import type { UserAccessRule } from "../../userAccessRule.js";
import type { AccessRuleDbIndexes } from "../accessRuleDbIndexes.js";

class IpV4PerformanceIndexes implements AccessRuleDbIndexes {
	public setup(schema: Schema<UserAccessRule>): void {
		this.userIpV4AsNumeric(schema);
		this.userIpV4MaskRange(schema);
	}

	protected userIpV4AsNumeric(schema: Schema<UserAccessRule>): void {
		schema.index(
			{
				"userIp.v4.asNumeric": 1,
			},
			{
				partialFilterExpression: {
					"userIp.v4.asNumeric": { $exists: true },
				},
			},
		);
	}

	protected userIpV4MaskRange(schema: Schema<UserAccessRule>): void {
		schema.index(
			{
				"userIp.v4.mask.rangeMinAsNumeric": 1,
				"userIp.v4.mask.rangeMaxAsNumeric": 1,
			},
			{
				partialFilterExpression: {
					"userIp.v4.mask.asNumeric": { $exists: true },
				},
			},
		);
	}
}

const ipV4PerformanceIndexes = new IpV4PerformanceIndexes();

export { ipV4PerformanceIndexes };

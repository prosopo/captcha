import type { Schema } from "mongoose";
import type { AccessRuleDbIndexes } from "../accessRuleDbIndexes.js";
import type { UserAccessRule } from "@prosopo/types-database";

class IpV6PerformanceIndexes implements AccessRuleDbIndexes {
	public setup(schema: Schema<UserAccessRule>): void {
		this.userIpV6AsNumericString(schema);
		this.userIpV6MaskRange(schema);
	}

	protected userIpV6AsNumericString(schema: Schema<UserAccessRule>): void {
		schema.index(
			{
				"userIp.v6.asNumericString": 1,
			},
			{
				partialFilterExpression: {
					"userIp.v6.asNumericString": { $exists: true },
				},
			},
		);
	}

	protected userIpV6MaskRange(schema: Schema<UserAccessRule>): void {
		schema.index(
			{
				"userIp.v6.mask.rangeMinAsNumericString": 1,
				"userIp.v6.mask.rangeMaxAsNumericString": 1,
			},
			{
				partialFilterExpression: {
					"userIp.v6.mask.asNumeric": { $exists: true },
				},
			},
		);
	}
}

const ipV6PerformanceIndexes = new IpV6PerformanceIndexes();

export { ipV6PerformanceIndexes };

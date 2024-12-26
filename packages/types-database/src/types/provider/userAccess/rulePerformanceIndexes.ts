import type { Schema } from "mongoose";
import type { UserAccessRule } from "./userAccessRule.js";

class RulePerformanceIndexes {
	public setup(schema: Schema<UserAccessRule>): void {
		this.clientAccountId(schema);

		this.userIpV4AsNumeric(schema);
		this.userIpV4MaskRange(schema);

		this.userIpV6AsNumericString(schema);
		this.userIpV6MaskRange(schema);
	}

	protected clientAccountId(schema: Schema<UserAccessRule>): void {
		schema.index(
			{
				clientAccountId: 1,
			},
			{
				partialFilterExpression: {
					clientAccountId: { $exists: true },
				},
			},
		);
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

const rulePerformanceIndexes = new RulePerformanceIndexes();

export { rulePerformanceIndexes };

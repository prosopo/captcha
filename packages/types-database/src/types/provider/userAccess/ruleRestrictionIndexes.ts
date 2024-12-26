import type { Schema } from "mongoose";
import type { UserAccessRule } from "./userAccessRule.js";

class RuleRestrictionIndexes {
	public setup(schema: Schema<UserAccessRule>): void {
		this.singleGlobalIp(schema);
		this.singleIpPerClient(schema);
		this.singleGlobalIpMask(schema);
		this.singleIpMaskPerClient(schema);
	}

	protected singleGlobalIp(
		schema: Schema<UserAccessRule>,
	): void {
		schema.index(
			{
				"userIp.v4.asNumeric": 1,
			},
			{
				unique: true,
				partialFilterExpression: {
					clientAccountId: { $exists: false },
					"userIp.v4.asNumeric": { $exists: true },
					"userIp.v4.mask.asNumeric": { $exists: false },
				},
			},
		);
	}

	protected singleIpPerClient(
		schema: Schema<UserAccessRule>,
	): void {
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
					"userIp.v4.mask.asNumeric": { $exists: false },
				},
			},
		);
	}

	protected singleGlobalIpMask(
		schema: Schema<UserAccessRule>,
	): void {
		schema.index(
			{
				"userIp.v4.asNumeric": 1,
				"userIp.v4.mask.asNumeric": 1,
			},
			{
				unique: true,
				partialFilterExpression: {
					clientAccountId: { $exists: false },
					"userIp.v4.asNumeric": { $exists: true },
					"userIp.v4.mask.asNumeric": { $exists: true },
				},
			},
		);
	}

	protected singleIpMaskPerClient(
		schema: Schema<UserAccessRule>,
	): void {
		schema.index(
			{
				clientAccountId: 1,
				"userIp.v4.asNumeric": 1,
				"userIp.v4.mask.asNumeric": 1,
			},
			{
				unique: true,
				partialFilterExpression: {
					clientAccountId: { $exists: true },
					"userIp.v4.asNumeric": { $exists: true },
					"userIp.v4.mask.asNumeric": { $exists: true },
				},
			},
		);
	}
}

const ruleRestrictionIndexes = new RuleRestrictionIndexes();

export { ruleRestrictionIndexes };

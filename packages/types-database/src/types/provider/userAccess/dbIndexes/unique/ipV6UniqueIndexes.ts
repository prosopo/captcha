import type { Schema } from "mongoose";
import type { UserAccessRule } from "../../userAccessRule.js";
import type { AccessRuleDbIndexes } from "../accessRuleDbIndexes.js";

class IpV6UniqueIndexes implements AccessRuleDbIndexes {
	public setup(schema: Schema<UserAccessRule>): void {
		this.singleGlobalIp(schema);
		this.singleIpPerClient(schema);
		this.singleGlobalIpMask(schema);
		this.singleIpMaskPerClient(schema);
	}

	protected singleGlobalIp(schema: Schema<UserAccessRule>): void {
		schema.index(
			{
				"userIp.v6.asNumericString": 1,
			},
			{
				unique: true,
				partialFilterExpression: {
					clientAccountId: null,
					"userIp.v6.asNumericString": { $exists: true },
					"userIp.v6.mask.asNumericString": null,
				},
			},
		);
	}

	protected singleIpPerClient(schema: Schema<UserAccessRule>): void {
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
					"userIp.v6.mask.asNumericString": null,
				},
			},
		);
	}

	protected singleGlobalIpMask(schema: Schema<UserAccessRule>): void {
		schema.index(
			{
				"userIp.v6.asNumericString": 1,
				"userIp.v6.mask.asNumericString": 1,
			},
			{
				unique: true,
				partialFilterExpression: {
					clientAccountId: null,
					"userIp.v6.asNumericString": { $exists: true },
					"userIp.v6.mask.asNumericString": { $exists: true },
				},
			},
		);
	}

	protected singleIpMaskPerClient(schema: Schema<UserAccessRule>): void {
		schema.index(
			{
				clientAccountId: 1,
				"userIp.v6.asNumericString": 1,
				"userIp.v6.mask.asNumericString": 1,
			},
			{
				unique: true,
				partialFilterExpression: {
					clientAccountId: { $exists: true },
					"userIp.v6.asNumericString": { $exists: true },
					"userIp.v6.mask.asNumericString": { $exists: true },
				},
			},
		);
	}
}

const ipV6UniqueIndexes = new IpV6UniqueIndexes();

export { ipV6UniqueIndexes };

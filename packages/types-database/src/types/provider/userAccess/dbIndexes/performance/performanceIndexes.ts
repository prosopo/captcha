import type { Schema } from "mongoose";
import type { UserAccessRule } from "../../userAccessRule.js";
import { ipV6PerformanceIndexes } from "./ipV6PerformanceIndexes.js";
import { ipV4PerformanceIndexes } from "./ipV4PerformanceIndexes.js";
import type { AccessRuleDbIndexes } from "../accessRuleDbIndexes.js";

class PerformanceIndexes implements AccessRuleDbIndexes {
	public setup(schema: Schema<UserAccessRule>): void {
		this.clientAccountId(schema);

		ipV4PerformanceIndexes.setup(schema);
		ipV6PerformanceIndexes.setup(schema);
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
}

const performanceIndexes = new PerformanceIndexes();

export { performanceIndexes };

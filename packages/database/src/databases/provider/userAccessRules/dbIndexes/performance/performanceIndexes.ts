import type { Schema } from "mongoose";
import { ipV6PerformanceIndexes } from "./ipV6PerformanceIndexes.js";
import { ipV4PerformanceIndexes } from "./ipV4PerformanceIndexes.js";
import type { AccessRuleDbIndexes } from "../accessRuleDbIndexes.js";
import type { UserAccessRule } from "@prosopo/types-database";

class PerformanceIndexes implements AccessRuleDbIndexes {
	public setup(schema: Schema<UserAccessRule>): void {
		this.clientId(schema);
		this.userId(schema);

		ipV4PerformanceIndexes.setup(schema);
		ipV6PerformanceIndexes.setup(schema);
	}

	protected clientId(schema: Schema<UserAccessRule>): void {
		schema.index(
			{
				clientId: 1,
			},
			{
				partialFilterExpression: {
					clientId: { $exists: true },
				},
			},
		);
	}

	protected userId(schema: Schema<UserAccessRule>): void {
		schema.index(
			{
				userId: 1,
			},
			{
				partialFilterExpression: {
					userId: { $exists: true },
				},
			},
		);
	}
}

const performanceIndexes = new PerformanceIndexes();

export { performanceIndexes };

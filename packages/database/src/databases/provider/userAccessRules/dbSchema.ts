import type { Schema } from "mongoose";
import {
	type UserAccessRule,
	userAccessRuleSchema,
} from "@prosopo/types-database";
import { uniqueIndexes } from "./dbIndexes/unique/uniqueIndexes.js";
import { performanceIndexes } from "./dbIndexes/performance/performanceIndexes.js";

function getUserAccessRulesDbSchema(): Schema<UserAccessRule> {
	uniqueIndexes.setup(userAccessRuleSchema);
	performanceIndexes.setup(userAccessRuleSchema);

	return userAccessRuleSchema;
}

export { getUserAccessRulesDbSchema };

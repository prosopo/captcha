import type { Schema } from "mongoose";
import type { UserAccessRule } from "../userAccessRule.js";

interface AccessRuleDbIndexes {
	setup(schema: Schema<UserAccessRule>): void;
}

export type { AccessRuleDbIndexes };

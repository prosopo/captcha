import type { Schema } from "mongoose";
import type { UserAccessRule } from "@prosopo/types-database";

interface AccessRuleDbIndexes {
	setup(schema: Schema<UserAccessRule>): void;
}

export type { AccessRuleDbIndexes };

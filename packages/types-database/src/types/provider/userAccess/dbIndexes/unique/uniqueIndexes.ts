import type { Schema } from "mongoose";
import type { UserAccessRule } from "../../userAccessRule.js";
import { ipV4UniqueIndexes } from "./ipV4UniqueIndexes.js";
import { ipV6UniqueIndexes } from "./ipV6UniqueIndexes.js";
import type { AccessRuleDbIndexes } from "../accessRuleDbIndexes.js";

class UniqueIndexes implements AccessRuleDbIndexes {
	public setup(schema: Schema<UserAccessRule>): void {
		ipV4UniqueIndexes.setup(schema);
		ipV6UniqueIndexes.setup(schema);
	}
}

const uniqueIndexes = new UniqueIndexes();

export { uniqueIndexes };

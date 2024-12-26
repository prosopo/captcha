import type { Schema } from "mongoose";
import { ipV4UniqueIndexes } from "./ipV4/ipV4UniqueIndexes.js";
import { ipV6UniqueIndexes } from "./ipV6/ipV6UniqueIndexes.js";
import type { AccessRuleDbIndexes } from "../accessRuleDbIndexes.js";
import { ipV4MaskUniqueIndexes } from "./ipV4/ipV4MaskUniqueIndexes.js";
import { ipV6MaskUniqueIndexes } from "./ipV6/ipV6MaskUniqueIndexes.js";
import type { UserAccessRule } from "@prosopo/types-database";

class UniqueIndexes implements AccessRuleDbIndexes {
	public setup(schema: Schema<UserAccessRule>): void {
		ipV4UniqueIndexes.setup(schema);
		ipV4MaskUniqueIndexes.setup(schema);

		ipV6UniqueIndexes.setup(schema);
		ipV6MaskUniqueIndexes.setup(schema);
	}
}

const uniqueIndexes = new UniqueIndexes();

export { uniqueIndexes };

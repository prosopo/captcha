import type { UserAccessRule, UserAccessRules } from "@prosopo/types-database";
import type { Model } from "mongoose";
import { MongoUserAccessRules } from "../../../databases/provider/mongoUserAccessRules.js";
import { TestsBase } from "../../testsBase.js";

abstract class MongoUserAccessRuleTests extends TestsBase {
	protected userAccessRules: UserAccessRules;

	public constructor(protected model: Model<UserAccessRule>) {
		super();

		this.userAccessRules = new MongoUserAccessRules(this.model);
	}
}

export { MongoUserAccessRuleTests };

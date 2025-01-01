import type { UserAccessRule, UserAccessRules } from "@prosopo/types-database";
import type { Model } from "mongoose";
import { UserAccessRulesDbStorage } from "../../../databases/provider/userAccessRules/userAccessRulesDbStorage.js";
import { TestsBase } from "../../testsBase.js";

abstract class UserAccessRuleTestsBase extends TestsBase {
	protected userAccessRules: UserAccessRules;

	public constructor(protected model: Model<UserAccessRule>) {
		super();

		this.userAccessRules = new UserAccessRulesDbStorage(this.model);
	}
}

export { UserAccessRuleTestsBase };

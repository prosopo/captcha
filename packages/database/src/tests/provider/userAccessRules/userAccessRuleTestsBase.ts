import type { UserAccessRule, UserAccessRulesStorage } from "@prosopo/types-database";
import type { Model } from "mongoose";
import { UserAccessRulesDbStorage } from "../../../databases/provider/userAccessRules/userAccessRulesDbStorage.js";
import { TestsBase } from "../../testsBase.js";

abstract class UserAccessRuleTestsBase extends TestsBase {
	protected userAccessRulesStorage: UserAccessRulesStorage;

	public constructor(protected model: Model<UserAccessRule>) {
		super();

		this.userAccessRulesStorage = new UserAccessRulesDbStorage(this.model);
	}
}

export { UserAccessRuleTestsBase };

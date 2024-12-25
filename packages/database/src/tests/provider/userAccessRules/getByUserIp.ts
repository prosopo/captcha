import { MongoUserAccessRuleTests } from "./mongoUserAccessRuleTests.js";

abstract class GetByUserIp extends MongoUserAccessRuleTests {
	protected override getTestPrefixes(): string[] {
		return ["GetByUserIp"];
	}
}

export { GetByUserIp };

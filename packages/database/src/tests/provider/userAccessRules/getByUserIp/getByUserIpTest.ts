import { MongoUserAccessRulesTest } from "../mongoUserAccessRulesTest.js";

abstract class GetByUserIpTest extends MongoUserAccessRulesTest {
	protected override getTestPrefixes(): string[] {
		return ["GetByUserIp"];
	}
}

export { GetByUserIpTest };

import TestFindByIpV6 from "../v6/testFindByIpV6.js";

class TestFindRuleByIpV6Short extends TestFindByIpV6 {
	protected override readonly userIp: string = "::1";
	protected override readonly anotherUserIp: string = "::2";
}

export default TestFindRuleByIpV6Short;

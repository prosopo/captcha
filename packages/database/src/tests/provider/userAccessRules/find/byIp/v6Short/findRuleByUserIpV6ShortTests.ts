import { FindRuleByUserIpV6Tests } from "../v6/findRuleByUserIpV6Tests.js";

class FindRuleByUserIpV6ShortTests extends FindRuleByUserIpV6Tests {
	protected override readonly userIp: string = "::1";
	protected override readonly anotherUserIp: string = "::2";

	override getName(): string {
		return "FindRuleByUserIpV6Short";
	}
}

export { FindRuleByUserIpV6ShortTests };

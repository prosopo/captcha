import { FindRuleByUserIpMaskV6Tests } from "../v6/findRuleByUserIpMaskV6Tests.js";

class FindRuleByUserIpMaskV6ShortTests extends FindRuleByUserIpMaskV6Tests {
	protected override baseIpAsString = "::1";
	protected override rangeMinIpAsString = "::1";
	protected override rangeMaxIpAsString = "::3";

	protected override readonly userIp: string = "::2";
	protected override readonly anotherUserIp: string = "::4";

	public override getName(): string {
		return "FindRuleByUserIpMaskV6Short";
	}
}

export { FindRuleByUserIpMaskV6ShortTests };

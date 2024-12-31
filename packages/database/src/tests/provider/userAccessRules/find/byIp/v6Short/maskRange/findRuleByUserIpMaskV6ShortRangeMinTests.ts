import { FindRuleByUserIpMaskV6Tests } from "../../v6/findRuleByUserIpMaskV6Tests.js";

class FindRuleByUserIpMaskV6ShortRangeMinTests extends FindRuleByUserIpMaskV6Tests {
	protected override baseIpAsString = "::2";
	protected override rangeMinIpAsString = "::2";
	protected override rangeMaxIpAsString = "::4";

	protected override readonly userIp: string = "::2";
	protected override readonly anotherUserIp: string = "::1";

	public override getName(): string {
		return "FindRuleByUserIpMaskV6ShortRangeMin";
	}
}

export { FindRuleByUserIpMaskV6ShortRangeMinTests };

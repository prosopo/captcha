import { FindRuleByUserIpMaskV6Tests } from "../findRuleByUserIpMaskV6Tests.js";

class FindRuleByUserIpMaskV6RangeMaxTests extends FindRuleByUserIpMaskV6Tests {
	protected override baseIpAsString = "2001:db8:3333:4444:5555:6666:7777:8888";
	protected override rangeMinIpAsString =
		"2001:db8:3333:4444:5555:6666:7777:8888";
	protected override rangeMaxIpAsString =
		"2001:db8:3333:4444:5555:6666:7777:ffff";

	protected override readonly userIp: string =
		"2001:db8:3333:4444:5555:6666:7777:ffff";
	protected override readonly anotherUserIp: string =
		"2001:db8:3333:4444:5555:6666:8888:1111";

	public override getName(): string {
		return "FindRuleByUserIpMaskV6RangeMax";
	}
}

export { FindRuleByUserIpMaskV6RangeMaxTests };

import { FindRuleByUserIpMaskV4Tests } from "../findRuleByUserIpMaskV4Tests.js";

class FindRuleByUserIpMaskV4RangeMaxTests extends FindRuleByUserIpMaskV4Tests {
	protected override baseIpAsString = "192.168.0.0";
	protected override rangeMinIpAsString = "192.168.0.0";
	protected override rangeMaxIpAsString = "192.168.0.255";

	protected override readonly userIp: string = "192.168.0.255";
	protected override readonly anotherUserIp: string = "127.0.1.0";

	override getName(): string {
		return "FindRuleByUserIpMaskV4RangeMax";
	}
}

export { FindRuleByUserIpMaskV4RangeMaxTests };

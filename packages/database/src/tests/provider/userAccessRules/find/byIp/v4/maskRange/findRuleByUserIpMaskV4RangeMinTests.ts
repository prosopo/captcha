import { FindRuleByUserIpMaskV4Tests } from "../findRuleByUserIpMaskV4Tests.js";

class FindRuleByUserIpMaskV4RangeMinTests extends FindRuleByUserIpMaskV4Tests {
	protected override baseIpAsString = "192.168.1.0";
	protected override rangeMinIpAsString = "192.168.1.0";
	protected override rangeMaxIpAsString = "192.168.1.255";

	protected override readonly userIp: string = "192.168.1.0";
	protected override readonly anotherUserIp: string = "127.0.0.255";

	override getName(): string {
		return "FindRuleByUserIpMaskV4RangeMin";
	}
}

export { FindRuleByUserIpMaskV4RangeMinTests };

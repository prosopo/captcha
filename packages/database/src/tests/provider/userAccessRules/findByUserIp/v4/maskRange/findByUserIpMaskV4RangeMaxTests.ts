import { FindByUserIpMaskV4Tests } from "../findByUserIpMaskV4Tests.js";

class FindByUserIpMaskV4RangeMaxTests extends FindByUserIpMaskV4Tests {
	protected override baseIpAsString = "192.168.0.0";
	protected override rangeMinIpAsString = "192.168.0.0";
	protected override rangeMaxIpAsString = "192.168.0.255";

	protected override readonly userIp: string = "192.168.0.255";
	protected override readonly anotherUserIp: string = "127.0.1.0";

	override getName(): string {
		return "FindByUserIpMaskV4RangeMax";
	}
}

export { FindByUserIpMaskV4RangeMaxTests };

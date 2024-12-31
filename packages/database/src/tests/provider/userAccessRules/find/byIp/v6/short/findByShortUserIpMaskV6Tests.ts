import { FindByUserIpMaskV6Tests } from "../findByUserIpMaskV6Tests.js";

class FindByShortUserIpMaskV6Tests extends FindByUserIpMaskV6Tests {
	protected override baseIpAsString = "::1";
	protected override rangeMinIpAsString = "::1";
	protected override rangeMaxIpAsString = "::3";

	protected override readonly userIp: string = "::2";
	protected override readonly anotherUserIp: string = "::4";

	public override getName(): string {
		return "FindByShortUserIpMaskV6";
	}
}

export { FindByShortUserIpMaskV6Tests };

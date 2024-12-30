import { FindByUserIpMaskV6Tests } from "../../findByUserIpMaskV6Tests.js";

class FindByShortUserIpMaskV6RangeMaxTests extends FindByUserIpMaskV6Tests {
	protected override baseIpAsString = "::1";
	protected override rangeMinIpAsString = "::1";
	protected override rangeMaxIpAsString = "::3";

	protected override readonly userIp: string = "::3";
	protected override readonly anotherUserIp: string = "::4";

	public override getName(): string {
		return "FindByShortUserIpMaskV6RangeMax";
	}
}

export { FindByShortUserIpMaskV6RangeMaxTests };

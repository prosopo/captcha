import { FindByUserIpMaskV6Tests } from "../../findByUserIpMaskV6Tests.js";

class FindByShortUserIpMaskV6RangeMinTests extends FindByUserIpMaskV6Tests {
	protected override baseIpAsString = "::2";
	protected override rangeMinIpAsString = "::2";
	protected override rangeMaxIpAsString = "::4";

	protected override readonly userIp: string = "::2";
	protected override readonly anotherUserIp: string = "::1";

	public override getName(): string {
		return "FindByShortUserIpMaskV6RangeMin";
	}
}

export { FindByShortUserIpMaskV6RangeMinTests };

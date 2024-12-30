import { FindByUserIpV6Tests } from "./findByUserIpV6Tests.js";
import type { UserIp } from "@prosopo/types-database";

class FindByUserIpMaskV6Tests extends FindByUserIpV6Tests {
	protected baseIpAsString = "2001:db8:3333:4444:5555:6666:7777:8888";
	protected rangeMinIpAsString = "2001:db8:3333:4444:5555:6666:7777:8888";
	protected rangeMaxIpAsString = "2001:db8:3333:4444:5555:6666:7777:ffff";

	protected override readonly userIp: string =
		"2001:db8:3333:4444:5555:6666:7777:aaaa";
	protected override readonly anotherUserIp: string =
		"2001:db8:3333:4444:5555:6666:8888:1111";

	protected override getUserIpObject(): UserIp {
		return {
			v6: {
				asNumericString: this.convertUserIpToNumericString(this.baseIpAsString),
				asString: this.baseIpAsString,
				mask: {
					rangeMinAsNumericString: this.convertUserIpToNumericString(
						this.rangeMinIpAsString,
					),
					rangeMaxAsNumericString: this.convertUserIpToNumericString(
						this.rangeMaxIpAsString,
					),
					asNumeric: 24,
				},
			},
		};
	}

	protected override getUserIpObjectInAnotherVersion(): UserIp {
		return {
			v4: {
				asNumeric: BigInt(
					this.convertUserIpToNumericString(this.baseIpAsString),
				),
				asString: this.baseIpAsString,
				mask: {
					rangeMinAsNumeric: BigInt(
						this.convertUserIpToNumericString(this.rangeMinIpAsString),
					),
					rangeMaxAsNumeric: BigInt(
						this.convertUserIpToNumericString(this.rangeMaxIpAsString),
					),
					asNumeric: 24,
				},
			},
		};
	}

	public override getName(): string {
		return "FindByUserIpMaskV6";
	}
}

export { FindByUserIpMaskV6Tests };

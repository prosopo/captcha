import { FindRuleByUserIpV6Tests } from "./findRuleByUserIpV6Tests.js";
import type { UserIp } from "@prosopo/types-database";
import { Address6 } from "ip-address";

class FindRuleByUserIpMaskV6Tests extends FindRuleByUserIpV6Tests {
	protected baseIpAsString = "2001:db8:3333:4444:5555:6666:7777:8888";
	protected rangeMinIpAsString = "2001:db8:3333:4444:5555:6666:7777:8888";
	protected rangeMaxIpAsString = "2001:db8:3333:4444:5555:6666:7777:ffff";

	protected override readonly userIp: string =
		"2001:db8:3333:4444:5555:6666:7777:aaaa";
	protected override readonly anotherUserIp: string =
		"2001:db8:3333:4444:5555:6666:8888:1111";

	public override getName(): string {
		return "FindRuleByUserIpMaskV6";
	}

	protected override getUserIpObject(): UserIp {
		return {
			v6: {
				asNumericString: new Address6(this.baseIpAsString).bigInt().toString(),
				asString: this.baseIpAsString,
				mask: {
					rangeMinAsNumericString: new Address6(this.rangeMinIpAsString)
						.bigInt()
						.toString(),
					rangeMaxAsNumericString: new Address6(this.rangeMaxIpAsString)
						.bigInt()
						.toString(),
					asNumeric: 24,
				},
			},
		};
	}

	protected override getUserIpObjectInOtherVersion(): UserIp {
		return {
			v4: {
				asNumeric: new Address6(this.baseIpAsString).bigInt(),
				asString: this.baseIpAsString,
				mask: {
					rangeMinAsNumeric: new Address6(this.rangeMinIpAsString).bigInt(),
					rangeMaxAsNumeric: new Address6(this.rangeMaxIpAsString).bigInt(),
					asNumeric: 24,
				},
			},
		};
	}
}

export { FindRuleByUserIpMaskV6Tests };

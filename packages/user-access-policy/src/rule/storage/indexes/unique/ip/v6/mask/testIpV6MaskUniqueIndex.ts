import { Address6 } from "ip-address";
import TestUniqueIndexBase from "../../../testUniqueIndexBase.js";
import type Ip from "../../../../../../../ip/ip.js";

class TestIpV6MaskUniqueIndex extends TestUniqueIndexBase {
	private readonly ipAsNumericString: string = new Address6(
		"2001:db8:3333:4444:5555:6666:7777:8888",
	)
		.bigInt()
		.toString();
	private readonly firstMaskAsNumeric: number = 10;
	private readonly secondMaskAsNumeric: number = 20;

	protected override getFirstUserIpObject(): Ip {
		return {
			v6: {
				asNumericString: this.ipAsNumericString,
				asString: this.ipAsNumericString,
				mask: {
					rangeMinAsNumericString: "0",
					rangeMaxAsNumericString: "0",
					asNumeric: this.firstMaskAsNumeric,
				},
			},
		};
	}

	protected override getSecondUserIpObject(): Ip {
		return {
			v6: {
				asNumericString: this.ipAsNumericString,
				asString: this.ipAsNumericString,
				mask: {
					rangeMinAsNumericString: "0",
					rangeMaxAsNumericString: "0",
					asNumeric: this.secondMaskAsNumeric,
				},
			},
		};
	}
}

export { TestIpV6MaskUniqueIndex };

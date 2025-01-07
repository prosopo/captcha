import { Address6 } from "ip-address";
import TestUniqueIndexBase from "../../testUniqueIndexBase.js";
import type Ip from "../../../../../../ip/ip.js";


class TestIpV6UniqueIndex extends TestUniqueIndexBase {
	private readonly firstIpAsNumericString: string = new Address6(
		"2001:db8:3333:4444:5555:6666:7777:8888",
	)
		.bigInt()
		.toString();
	private readonly secondIpAsNumericString: string = new Address6(
		"1002:db8:3333:4444:5555:6666:7777:8888",
	)
		.bigInt()
		.toString();

	protected override getFirstUserIpObject(): Ip {
		return {
			v6: {
				asNumericString: this.firstIpAsNumericString,
				asString: this.firstIpAsNumericString,
			},
		};
	}

	protected override getSecondUserIpObject(): Ip {
		return {
			v6: {
				asNumericString: this.secondIpAsNumericString,
				asString: this.secondIpAsNumericString,
			},
		};
	}
}

export default TestIpV6UniqueIndex;

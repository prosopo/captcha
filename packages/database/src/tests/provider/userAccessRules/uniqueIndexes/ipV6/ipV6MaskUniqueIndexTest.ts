import { Address6 } from "ip-address";
import type { UserIp } from "@prosopo/types-database";
import {IpUniqueIndexTests} from "../ipUniqueIndexTests.js";

class IpV6MaskUniqueIndexTest extends IpUniqueIndexTests {
	private readonly ipAsNumericString: string = new Address6(
		"2001:db8:3333:4444:5555:6666:7777:8888",
	)
		.bigInt()
		.toString();
	private readonly firstMaskAsNumeric: number = 10;
	private readonly secondMaskAsNumeric: number = 20;

	protected override getFirstUserIpObject(): UserIp {
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

	protected override getSecondUserIpObject(): UserIp {
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

	public override getName(): string {
		return "IpV6MaskUniqueIndex";
	}
}

export { IpV6MaskUniqueIndexTest };

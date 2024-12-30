import { Address4 } from "ip-address";
import type { UserIp } from "@prosopo/types-database";
import {IpUniqueIndexTests} from "../ipUniqueIndexTests.js";

class IpV4MaskUniqueIndexTest extends IpUniqueIndexTests {
	private readonly ipAsNumeric: bigint = new Address4("192.168.1.1").bigInt();
	private readonly firstMaskAsNumeric: number = 10;
	private readonly secondMaskAsNumeric: number = 29;

	protected override getFirstUserIpObject(): UserIp {
		return {
			v4: {
				asNumeric: this.ipAsNumeric,
				asString: this.ipAsNumeric.toString(),
				mask: {
					rangeMinAsNumeric: BigInt(0),
					rangeMaxAsNumeric: BigInt(0),
					asNumeric: this.firstMaskAsNumeric,
				},
			},
		};
	}

	protected override getSecondUserIpObject(): UserIp {
		return {
			v4: {
				asNumeric: this.ipAsNumeric,
				asString: this.ipAsNumeric.toString(),
				mask: {
					rangeMinAsNumeric: BigInt(0),
					rangeMaxAsNumeric: BigInt(0),
					asNumeric: this.secondMaskAsNumeric,
				},
			},
		};
	}

	public override getName(): string {
		return "IpV4MaskUniqueIndex";
	}
}

export { IpV4MaskUniqueIndexTest };

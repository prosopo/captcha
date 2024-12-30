import { Address4 } from "ip-address";
import type {  UserIp } from "@prosopo/types-database";
import { IpUniqueIndexTests } from "../ipUniqueIndexTests.js";

class IpV4UniqueIndexTests extends IpUniqueIndexTests {
	private readonly firstIpAsNumeric: bigint = new Address4(
		"192.168.1.1",
	).bigInt();
	private readonly secondIpAsNumeric: bigint = new Address4(
		"192.168.1.2",
	).bigInt();

	protected override getFirstUserIpObject(): UserIp {
		return {
			v4: {
				asNumeric: this.firstIpAsNumeric,
				asString: this.firstIpAsNumeric.toString(),
			},
		};
	}

	protected override getSecondUserIpObject(): UserIp {
		return {
			v4: {
				asNumeric: this.secondIpAsNumeric,
				asString: this.secondIpAsNumeric.toString(),
			},
		};
	}

	public override getName(): string {
		return "IpV4UniqueIndex";
	}
}

export { IpV4UniqueIndexTests };

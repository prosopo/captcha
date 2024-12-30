import type { Model } from "mongoose";
import { Address4, Address6 } from "ip-address";
import { expect } from "vitest";
import { TestsBase } from "../../../../testsBase.js";
import type { UserAccessRule, UserIp } from "@prosopo/types-database";
import { IpUniqueIndexTests } from "../ipUniqueIndexTests.js";

class IpV6UniqueIndexTests extends IpUniqueIndexTests {
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

	protected override getFirstUserIpObject(): UserIp {
		return {
			v6: {
				asNumericString: this.firstIpAsNumericString,
				asString: this.firstIpAsNumericString,
			},
		};
	}

	protected override getSecondUserIpObject(): UserIp {
		return {
			v6: {
				asNumericString: this.secondIpAsNumericString,
				asString: this.secondIpAsNumericString,
			},
		};
	}

	public override getName(): string {
		return "IpV4UniqueIndex";
	}
}

export { IpV6UniqueIndexTests };

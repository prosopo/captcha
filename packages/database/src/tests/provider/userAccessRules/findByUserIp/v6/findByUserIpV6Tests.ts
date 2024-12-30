import {  Address6 } from "ip-address";
import { FindByUserIpTests } from "../findByUserIpTests.js";
import { type UserIp, UserIpVersion } from "@prosopo/types-database";

class FindByUserIpV6Tests extends FindByUserIpTests {
	protected readonly firstUserIp: string =
		"2001:db8:3333:4444:5555:6666:7777:8888";
	protected readonly secondUserIp: string =
		"1002:db8:3333:4444:5555:6666:7777:8888";

	protected getUserIpVersion(): UserIpVersion {
		return UserIpVersion.v6;
	}

	protected getFirstUserIpObject(): UserIp {
		return {
			v6: {
				asNumericString: this.convertUserIpToNumericString(this.firstUserIp),
				asString: this.firstUserIp,
			},
		};
	}

	protected getFirstUserIp(): bigint | string {
		return this.convertUserIpToNumericString(this.firstUserIp);
	}

	protected getSecondUserIp(): bigint | string {
		return this.convertUserIpToNumericString(this.secondUserIp);
	}

	protected getFirstUserIpObjectInAnotherVersion(): UserIp {
		return {
			v4: {
				asNumeric: BigInt(this.convertUserIpToNumericString(this.firstUserIp)),
				asString: this.firstUserIp,
			},
		};
	}

	public getName(): string {
		return "FindByUserIpV6";
	}

	protected convertUserIpToNumericString(userIp: string): string {
		const address = new Address6(userIp);

		if (!address.isCorrect()) {
			throw new Error(`Invalid IP: ${userIp}`);
		}

		return address.bigInt().toString();
	}
}

export { FindByUserIpV6Tests };

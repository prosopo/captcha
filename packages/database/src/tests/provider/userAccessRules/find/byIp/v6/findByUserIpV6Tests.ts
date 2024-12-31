import { Address6 } from "ip-address";
import { FindByIpTests } from "../findByIpTests.js";
import type { UserIp } from "@prosopo/types-database";

class FindByUserIpV6Tests extends FindByIpTests {
	protected readonly userIp: string = "2001:db8:3333:4444:5555:6666:7777:8888";
	protected readonly anotherUserIp: string =
		"1002:db8:3333:4444:5555:6666:7777:8888";

	protected getUserIpObject(): UserIp {
		return {
			v6: {
				asNumericString: new Address6(this.userIp).bigInt().toString(),
				asString: this.userIp,
			},
		};
	}

	protected getUserIpAddress(): Address6 {
		return new Address6(this.userIp);
	}

	protected getAnotherUserIpAddress(): Address6 {
		return new Address6(this.anotherUserIp);
	}

	protected getUserIpObjectInAnotherVersion(): UserIp {
		return {
			v4: {
				asNumeric: new Address6(this.userIp).bigInt(),
				asString: this.userIp,
			},
		};
	}

	public getName(): string {
		return "FindByUserIpV6";
	}
}

export { FindByUserIpV6Tests };

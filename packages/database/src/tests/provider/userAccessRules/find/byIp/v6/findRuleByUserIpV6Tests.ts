import { Address6 } from "ip-address";
import { FindRuleByUserIpTests } from "../findRuleByUserIpTests.js";
import type { UserIp } from "@prosopo/types-database";

class FindRuleByUserIpV6Tests extends FindRuleByUserIpTests {
	protected readonly userIp: string = "2001:db8:3333:4444:5555:6666:7777:8888";
	protected readonly anotherUserIp: string =
		"1002:db8:3333:4444:5555:6666:7777:8888";

	public getName(): string {
		return "FindRuleByUserIpV6";
	}

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

	protected getOtherUserIpAddress(): Address6 {
		return new Address6(this.anotherUserIp);
	}

	protected getUserIpObjectInOtherVersion(): UserIp {
		return {
			v4: {
				asNumeric: new Address6(this.userIp).bigInt(),
				asString: this.userIp,
			},
		};
	}
}

export { FindRuleByUserIpV6Tests };

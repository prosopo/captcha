import { Address4 } from "ip-address";
import { FindRuleByUserIpTests } from "../findRuleByUserIpTests.js";
import type { UserIp } from "@prosopo/types-database";

class FindRuleByUserIpV4Tests extends FindRuleByUserIpTests {
	protected readonly userIp: string = "192.168.1.1";
	protected readonly anotherUserIp: string = "127.0.0.1";

	public getName(): string {
		return "FindRuleByUserIpV4";
	}

	protected getUserIpObject(): UserIp {
		return {
			v4: {
				asNumeric: new Address4(this.userIp).bigInt(),
				asString: this.userIp,
			},
		};
	}

	protected getUserIpAddress(): Address4 {
		return new Address4(this.userIp);
	}

	protected getOtherUserIpAddress(): Address4 {
		return new Address4(this.anotherUserIp);
	}

	protected getUserIpObjectInOtherVersion(): UserIp {
		return {
			v6: {
				asNumericString: new Address4(this.userIp).bigInt().toString(),
				asString: this.userIp,
			},
		};
	}
}

export { FindRuleByUserIpV4Tests };

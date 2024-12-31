import { Address4 } from "ip-address";
import { FindByIpTests } from "../findByIpTests.js";
import { type UserIp, UserIpVersion } from "@prosopo/types-database";

class FindByUserIpV4Tests extends FindByIpTests {
	protected readonly userIp: string = "192.168.1.1";
	protected readonly anotherUserIp: string = "127.0.0.1";

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

	protected getAnotherUserIpAddress(): Address4 {
		return new Address4(this.anotherUserIp);
	}

	protected getUserIpObjectInAnotherVersion(): UserIp {
		return {
			v6: {
				asNumericString: new Address4(this.userIp).bigInt().toString(),
				asString: this.userIp,
			},
		};
	}

	public getName(): string {
		return "FindByUserIpV4";
	}
}

export { FindByUserIpV4Tests };

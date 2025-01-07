import { Address4 } from "ip-address";
import { TestFindByIpBase } from "../testFindByIpBase.js";
import type Ip from "../../../../../../ip/ip.js";

class TestFindByIpV4 extends TestFindByIpBase {
	protected readonly userIp: string = "192.168.1.1";
	protected readonly anotherUserIp: string = "127.0.0.1";

	protected getUserIpObject(): Ip {
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

	protected getUserIpObjectInOtherVersion(): Ip {
		return {
			v6: {
				asNumericString: new Address4(this.userIp).bigInt().toString(),
				asString: this.userIp,
			},
		};
	}
}

export default TestFindByIpV4;

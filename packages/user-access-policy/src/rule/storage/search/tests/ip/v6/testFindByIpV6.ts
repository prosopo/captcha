import { Address6 } from "ip-address";
import { TestFindByIpBase } from "../testFindByIpBase.js";
import type Ip from "../../../../../../ip/ip.js";

class TestFindByIpV6 extends TestFindByIpBase {
	protected readonly userIp: string = "2001:db8:3333:4444:5555:6666:7777:8888";
	protected readonly anotherUserIp: string =
		"1002:db8:3333:4444:5555:6666:7777:8888";

	protected getUserIpObject(): Ip {
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

	protected getUserIpObjectInOtherVersion(): Ip {
		return {
			v4: {
				asNumeric: new Address6(this.userIp).bigInt(),
				asString: this.userIp,
			},
		};
	}
}

export default TestFindByIpV6;

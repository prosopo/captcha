import type { UserIp } from "@prosopo/types-database";
import { FindByUserIpV4Tests } from "./findByUserIpV4Tests.js";
import { Address4, Address6 } from "ip-address";

class FindByUserIpMaskV4Tests extends FindByUserIpV4Tests {
	protected baseIpAsString = "192.168.0.0";
	protected rangeMinIpAsString = "192.168.0.0";
	protected rangeMaxIpAsString = "192.168.0.255";

	protected override readonly userIp: string = "192.168.0.15";
	protected override readonly anotherUserIp: string = "127.0.1.0";

	protected override getUserIpObject(): UserIp {
		return {
			v4: {
				asNumeric: new Address4(this.baseIpAsString).bigInt(),
				asString: this.baseIpAsString,
				mask: {
					rangeMinAsNumeric: new Address4(this.rangeMinIpAsString).bigInt(),
					rangeMaxAsNumeric: new Address4(this.rangeMaxIpAsString).bigInt(),
					asNumeric: 24,
				},
			},
		};
	}

	protected override getUserIpObjectInAnotherVersion(): UserIp {
		return {
			v6: {
				asNumericString: new Address4(this.baseIpAsString).bigInt().toString(),
				asString: this.baseIpAsString,
				mask: {
					rangeMinAsNumericString: new Address4(this.rangeMinIpAsString)
						.bigInt()
						.toString(),
					rangeMaxAsNumericString: new Address4(this.rangeMaxIpAsString)
						.bigInt()
						.toString(),
					asNumeric: 24,
				},
			},
		};
	}

	public override getName(): string {
		return "FindByUserIpMaskV4";
	}
}

export { FindByUserIpMaskV4Tests };

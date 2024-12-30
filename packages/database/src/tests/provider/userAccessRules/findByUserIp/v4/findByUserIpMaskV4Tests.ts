import type { UserIp } from "@prosopo/types-database";
import { FindByUserIpV4Tests } from "./findByUserIpV4Tests.js";

class FindByUserIpMaskV4Tests extends FindByUserIpV4Tests {
	protected baseIpAsString = "192.168.0.0";
	protected rangeMinIpAsString = "192.168.0.0";
	protected rangeMaxIpAsString = "192.168.0.255";

	protected override readonly userIp: string = "192.168.0.15";
	protected override readonly anotherUserIp: string = "127.0.1.0";

	protected override getUserIpObject(): UserIp {
		return {
			v4: {
				asNumeric: this.convertUserIpToNumeric(this.baseIpAsString),
				asString: this.baseIpAsString,
				mask: {
					rangeMinAsNumeric: this.convertUserIpToNumeric(
						this.rangeMinIpAsString,
					),
					rangeMaxAsNumeric: this.convertUserIpToNumeric(
						this.rangeMaxIpAsString,
					),
					asNumeric: 24,
				},
			},
		};
	}

	protected override getUserIpObjectInAnotherVersion(): UserIp {
		return {
			v6: {
				asNumericString: this.convertUserIpToNumeric(
					this.baseIpAsString,
				).toString(),
				asString: this.baseIpAsString,
				mask: {
					rangeMinAsNumericString: this.convertUserIpToNumeric(
						this.rangeMinIpAsString,
					).toString(),
					rangeMaxAsNumericString: this.convertUserIpToNumeric(
						this.rangeMaxIpAsString,
					).toString(),
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

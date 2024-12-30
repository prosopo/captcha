import type { UserIp } from "@prosopo/types-database";
import { FindByUserIpV4Tests } from "./findByUserIpV4Tests.js";

class FindByUserIpMaskV4Tests extends FindByUserIpV4Tests {
	private baseIpAsString = "192.168.0.0";
	private rangeMinIpAsString = "192.168.0.0";
	private rangeMaxIpAsString = "192.168.0.255";

	protected override readonly firstUserIp: string = "192.168.0.15";
	protected override readonly secondUserIp: string = "127.0.1.15";

	protected override getFirstUserIpObject(): UserIp {
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

	protected override getFirstUserIpObjectInAnotherVersion(): UserIp {
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

	// fixme finds on borderMin, and on borderMax
}

export { FindByUserIpMaskV4Tests };

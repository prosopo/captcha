import { Address4 } from "ip-address";
import { FindByUserIpTests } from "../findByUserIpTests.js";
import { type UserIp, UserIpVersion } from "@prosopo/types-database";

class FindByUserIpV4Tests extends FindByUserIpTests {
	protected readonly firstUserIp: string = "192.168.1.1";
	protected readonly secondUserIp: string = "127.0.0.1";

	protected getUserIpVersion(): UserIpVersion {
		return UserIpVersion.v4;
	}

	protected getFirstUserIpObject(): UserIp {
		return {
			v4: {
				asNumeric: this.convertUserIpToNumeric(this.firstUserIp),
				asString: this.firstUserIp,
			},
		};
	}

	protected getFirstUserIp(): bigint | string {
		return this.convertUserIpToNumeric(this.firstUserIp);
	}

	protected getSecondUserIp(): bigint | string {
		return this.convertUserIpToNumeric(this.secondUserIp);
	}

	protected getFirstUserIpObjectInAnotherVersion(): UserIp {
		return {
			v6: {
				asNumericString: this.convertUserIpToNumeric(
					this.firstUserIp,
				).toString(),
				asString: this.firstUserIp,
			},
		};
	}

	public getName(): string {
		return "FindByUserIpV4";
	}

	protected convertUserIpToNumeric(userIp: string): bigint {
		const address = new Address4(userIp);

		if (!address.isCorrect()) {
			throw new Error(`Invalid IP: ${userIp}`);
		}

		return address.bigInt();
	}
}

export { FindByUserIpV4Tests };

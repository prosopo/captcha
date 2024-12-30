import { Address4 } from "ip-address";
import { FindByUserIpTests } from "../findByUserIpTests.js";
import { type UserIp, UserIpVersion } from "@prosopo/types-database";

class FindByUserIpV4Tests extends FindByUserIpTests {
	protected readonly userIp: string = "192.168.1.1";
	protected readonly anotherUserIp: string = "127.0.0.1";

	protected getUserIpVersion(): UserIpVersion {
		return UserIpVersion.v4;
	}

	protected getUserIpObject(): UserIp {
		return {
			v4: {
				asNumeric: this.convertUserIpToNumeric(this.userIp),
				asString: this.userIp,
			},
		};
	}

	protected getUserIp(): bigint | string {
		return this.convertUserIpToNumeric(this.userIp);
	}

	protected getAnotherUserIp(): bigint | string {
		return this.convertUserIpToNumeric(this.anotherUserIp);
	}

	protected getUserIpObjectInAnotherVersion(): UserIp {
		return {
			v6: {
				asNumericString: this.convertUserIpToNumeric(
					this.userIp,
				).toString(),
				asString: this.userIp,
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

import { WithIp } from "./withIp.js";
import { UserIpVersion } from "@prosopo/types-database";

class WithIpV4 extends WithIp {
	protected override getTestPrefixes(): string[] {
		return super.getTestPrefixes().concat(["v4"]);
	}

	protected getUserIpVersion(): UserIpVersion {
		return UserIpVersion.v4;
	}

	protected getFirstUserIp(): string {
		return "127.0.0.1";
	}

	protected getSecondUserIp(): string {
		return "127.0.0.2";
	}
}

export { WithIpV4 };

import type { UserAccessRule } from "./userAccessRule.js";
import type { UserIpVersion } from "./userIp/userIp.js";

interface UserAccessRules {
	findByUserIp(
		userIpVersion: UserIpVersion,
		userIpAsNumeric: bigint | string,
		clientAccountId?: string | null,
	): Promise<UserAccessRule[]>;
}

export type { UserAccessRules };

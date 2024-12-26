import type { UserAccessRule } from "./userAccessRule.js";
import type { Int32 } from "mongodb";

interface UserAccessRules {
	findByUserIpV4(
		userIpAsNumeric: Int32,
		clientAccountId?: string | null,
	): Promise<UserAccessRule[]>;

	findByUserIpV6(
		userIpAsNumericString: string,
		clientAccountId?: string | null,
	): Promise<UserAccessRule[]>;
}

export type { UserAccessRules };

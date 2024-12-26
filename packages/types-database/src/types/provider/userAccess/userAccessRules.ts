import type { UserAccessRule } from "./userAccessRule.js";

interface UserAccessRules {
	findByUserIpV4(
		userIpAsNumeric: bigint,
		clientAccountId?: string | null,
	): Promise<UserAccessRule[]>;

	findByUserIpV6(
		userIpAsNumericString: string,
		clientAccountId?: string | null,
	): Promise<UserAccessRule[]>;
}

export type { UserAccessRules };

import type { Address4, Address6 } from "ip-address";
import type { UserAccessRule } from "./userAccessRule.js";

interface UserAccessRules {
	getByUserIp(
		userIp: Address4 | Address6,
		clientAccountId: string | null,
	): Promise<UserAccessRule[]>;
}

export type { UserAccessRules };

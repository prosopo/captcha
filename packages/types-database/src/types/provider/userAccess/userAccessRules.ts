import type { UserAccessRule } from "./userAccessRule.js";
import type { Decimal128 } from "mongodb";
import type {UserIpVersion} from "./userIp.js";

interface UserAccessRules {
	getByUserIp(
		userIpVersion: UserIpVersion,
		userNumericIp: Decimal128,
		clientAccountId?: string | null,
	): Promise<UserAccessRule[]>;
}

export type { UserAccessRules };

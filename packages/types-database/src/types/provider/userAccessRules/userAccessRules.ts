import type { UserAccessRule } from "./userAccessRule.js";
import type { Address4, Address6 } from "ip-address";

interface RuleFilters {
	userIpAddress?: Address4 | Address6 | null;
	userId?: string | null;
	clientAccountId?: string | null;
}

interface UserAccessRules {
	findByFilters(filters: RuleFilters): Promise<UserAccessRule[]>;
}

export type { UserAccessRules, RuleFilters };

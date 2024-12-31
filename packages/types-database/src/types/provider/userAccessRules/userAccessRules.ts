import type { UserAccessRule } from "./userAccessRule.js";
import type { Address4, Address6 } from "ip-address";

interface RuleFilters {
	userIpAddress?: Address4 | Address6 | null;
	userId?: string | null;
}

interface RuleFilterSettings {
	includeRecordsWithoutClientId?: boolean | null;
	includeRecordsWithPartialFilterMatches?: boolean | null;
}

interface UserAccessRules {
	find(
		clientAccountId: string | null,
		filters?: RuleFilters | null,
		filterSettings?: RuleFilterSettings | null,
	): Promise<UserAccessRule[]>;
}

export type { UserAccessRules, RuleFilters, RuleFilterSettings };

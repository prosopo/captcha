import type { UserAccessRule } from "./userAccessRule.js";
import type { Address4, Address6 } from "ip-address";

interface RuleFilters {
	userIpAddress?: Address4 | Address6;
	userId?: string;
}

interface RuleFilterSettings {
	includeRecordsWithoutClientId?: boolean;
	includeRecordsWithPartialFilterMatches?: boolean;
}

interface UserAccessRulesStorage {
	find(
		clientId: string | null,
		filters?: RuleFilters | null,
		filterSettings?: RuleFilterSettings | null,
	): Promise<UserAccessRule[]>;
}

export type { UserAccessRulesStorage, RuleFilters, RuleFilterSettings };

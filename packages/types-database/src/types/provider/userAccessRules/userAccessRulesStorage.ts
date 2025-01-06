// Copyright 2021-2024 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import type { Address4, Address6 } from "ip-address";
import type { UserAccessRule, UserAccessRuleRecord } from "./userAccessRule.js";
import type { UserIp } from "./userIp/userIp.js";

interface SearchRuleFilters {
	userIpAddress?: Address4 | Address6;
	userId?: string;
	clientId?: string;
}

interface RuleFilterSettings {
	includeRecordsWithoutClientId?: boolean;
	includeRecordsWithPartialFilterMatches?: boolean;
}

interface UserAccessRulesStorage {
	insertMany(records: UserAccessRule[]): Promise<UserAccessRuleRecord[]>;

	find(
		filters: SearchRuleFilters,
		filterSettings?: RuleFilterSettings,
	): Promise<UserAccessRuleRecord[]>;

	// todo
	/*remove(
		clientId: string | null,
		userIp?: UserIp,
	): Promise<UserAccessRuleRecord[]>;*/
}

export type { UserAccessRulesStorage, SearchRuleFilters, RuleFilterSettings };

// Copyright 2021-2026 Prosopo (UK) Ltd.
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

import type {
	AccessPolicy,
	PolicyScope,
	UserAttributes,
} from "#policy/rule.js";

export type UserAttributesRecord = Omit<UserAttributes, "userAgentHash"> & {
	userAgent?: string;
};

export const userAttributesRecordFields = [
	"userId",
	"ja4Hash",
	"headersHash",
	"userAgent",
	"headHash",
	"coords",
] as const satisfies (keyof UserAttributesRecord)[];

export type UserIpRecord = {
	// human-friendly ip versions.
	ip?: string;
	// 127.0.0.1/24
	ipMask?: string;
};

export const userIpRecordFields = [
	"ip",
	"ipMask",
] as const satisfies (keyof UserIpRecord)[];

export type UserScopeRecord = UserAttributesRecord & UserIpRecord;

export const userScopeRecordFields = [
	...userAttributesRecordFields,
	...userIpRecordFields,
] as const satisfies (keyof UserScopeRecord)[];

export type UserScopeRecordField = (typeof userScopeRecordFields)[number];

export type AccessRuleRecord = AccessPolicy &
	PolicyScope &
	UserScopeRecord & {
		ruleGroupId?: string;
	};

export const getUserScopeRecordFromAccessRuleRecord = (
	ruleRecord: AccessRuleRecord,
): UserScopeRecord =>
	Object.fromEntries(
		userScopeRecordFields
			.map((field) => [field, ruleRecord[field]])
			.filter(([, value]) => value !== undefined),
	);

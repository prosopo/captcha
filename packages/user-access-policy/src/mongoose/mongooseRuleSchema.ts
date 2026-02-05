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

import type { AllKeys, Keys } from "@prosopo/common";
import type { SchemaDefinition } from "mongoose";
import type { AccessPolicy, PolicyScope } from "#policy/rule.js";
import type {
	AccessRuleRecord,
	UserAttributesRecord,
	UserIpRecord,
	UserScopeRecord,
} from "#policy/ruleRecord.js";

const userAttributesSchema: SchemaDefinition<UserAttributesRecord> = {
	userId: { type: String, required: false },
	ja4Hash: { type: String, required: false },
	userAgent: { type: String, required: false },
	headersHash: { type: String, required: false },
	headHash: { type: String, required: false },
	coords: { type: String, required: false },
	countryCode: { type: String, required: false },
} satisfies AllKeys<UserAttributesRecord>;

const userIpSchema: SchemaDefinition<UserIpRecord> = {
	ip: { type: String, required: false },
	ipMask: { type: String, required: false },
} satisfies AllKeys<UserIpRecord>;

const userScopeSchema: SchemaDefinition<UserScopeRecord> = {
	...userAttributesSchema,
	...userIpSchema,
} satisfies Keys<UserScopeRecord>;

const policyScopeSchema: SchemaDefinition<PolicyScope> = {
	clientId: { type: String, required: false },
} satisfies AllKeys<PolicyScope>;

const accessPolicySchema: SchemaDefinition<AccessPolicy> = {
	type: { type: String, required: true },
	captchaType: { type: String, required: false },
	description: { type: String, required: false },
	solvedImagesCount: { type: Number, required: false },
	imageThreshold: { type: Number, required: false },
	powDifficulty: { type: Number, required: false },
	unsolvedImagesCount: { type: Number, required: false },
	frictionlessScore: { type: Number, required: false },
} satisfies AllKeys<AccessPolicy>;

export const accessRuleMongooseSchema: SchemaDefinition<AccessRuleRecord> = {
	...accessPolicySchema,
	...policyScopeSchema,
	...userScopeSchema,
	ruleGroupId: { type: String, required: false },
} satisfies Keys<AccessRuleRecord>;

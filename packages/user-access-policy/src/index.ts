// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import type { ApiRoutesProvider } from "@prosopo/api-route";
import type { Logger } from "@prosopo/common";
import type { BlacklistInspector } from "./blacklistInspector.js";
import { apiRulePaths } from "./rules/api/apiRulePaths.js";
import { ApiRuleRoutesProvider } from "./rules/api/apiRuleRoutesProvider.js";
import { getExpressApiRuleRateLimits } from "./rules/api/getExpressApiRuleRateLimits.js";
import type {
	ApiInsertManyRulesArgsOutputSchema,
	ApiInsertManyRulesArgsSchema,
} from "./rules/api/insertMany/apiInsertManyRulesArgsSchema.js";
import { getRuleMongooseSchema } from "./rules/mongoose/schemas/getRuleMongooseSchema.js";
import type { Rule } from "./rules/rule/rule.js";
import type { RulesStorage } from "./rules/storage/rulesStorage.js";
import { createAccessPolicyResolver } from "./accessPolicyResolver.js";

const createApiRuleRoutesProvider = (
	rulesStorage: RulesStorage,
): ApiRoutesProvider => {
	return new ApiRuleRoutesProvider(rulesStorage);
};

export {
	type Rule,
	type RulesStorage,
	type BlacklistInspector,
	type ApiInsertManyRulesArgsSchema,
	type ApiInsertManyRulesArgsOutputSchema,
	createAccessPolicyResolver,
	createApiRuleRoutesProvider,
	getRuleMongooseSchema,
	getExpressApiRuleRateLimits,
	apiRulePaths,
};

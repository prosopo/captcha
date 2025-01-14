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

import { getExpressApiRuleRateLimits } from "@rules/api/getExpressApiRuleRateLimits.js";
import { BlacklistRulesInspector } from "@rules/blacklistRulesInspector.js";
import { ImageCaptchaConfigRulesResolver } from "@rules/imageCaptchaConfigRulesResolver.js";
import { createMongooseRulesStorage } from "@rules/mongoose/createMongooseRulesStorage.js";
import { getRuleMongooseSchema } from "@rules/mongoose/schemas/getRuleMongooseSchema.js";
import type { Rule } from "@rules/rule/rule.js";
import type { RulesStorage } from "@rules/storage/rulesStorage.js";
import type { BlacklistInspector } from "./blacklistInspector.js";
import type { ApiRoutesProvider } from "@prosopo/api-route";
import { ApiRuleRoutesProvider } from "@rules/api/apiRuleRoutesProvider.js";

const createBlacklistInspector = (
	rulesStorage: RulesStorage,
): BlacklistInspector => {
	return new BlacklistRulesInspector(rulesStorage);
};

const createImageCaptchaConfigResolver = (
	rulesStorage: RulesStorage,
): ImageCaptchaConfigRulesResolver => {
	return new ImageCaptchaConfigRulesResolver(rulesStorage);
};

const createApiRuleRoutesProvider = (
	rulesStorage: RulesStorage,
): ApiRoutesProvider => {
	return new ApiRuleRoutesProvider(rulesStorage);
};

export {
	type Rule,
	type RulesStorage,
	type BlacklistInspector,
	createMongooseRulesStorage,
	createImageCaptchaConfigResolver,
	createBlacklistInspector,
	createApiRuleRoutesProvider,
	getRuleMongooseSchema,
	getExpressApiRuleRateLimits,
};

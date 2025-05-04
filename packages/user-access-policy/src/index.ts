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
import type { Model } from "mongoose";
import type { BlacklistInspector } from "./blacklistInspector.js";
import { apiRulePaths } from "./rules/api/apiRulePaths.js";
import { ApiRuleRoutesProvider } from "./rules/api/apiRuleRoutesProvider.js";
import { apiDeleteManyRulesArgsSchema } from "./rules/api/deleteMany/apiDeleteManyRulesArgsSchema.js";
import { getExpressApiRuleRateLimits } from "./rules/api/getExpressApiRuleRateLimits.js";
import {
	type ApiInsertManyRulesArgs,
	type ApiInsertManyRulesArgsOutputSchema,
	apiInsertManyRulesArgsSchema,
} from "./rules/api/insertMany/apiInsertManyRulesArgs.js";
import { BlacklistRulesInspector } from "./rules/blacklistRulesInspector.js";
import { ImageCaptchaConfigRulesResolver } from "./rules/imageCaptchaConfigRulesResolver.js";
import type { RuleMongooseRecord } from "./rules/mongoose/ruleMongooseRecord.js";
import { RulesMongooseStorage } from "./rules/mongoose/rulesMongooseStorage.js";
import { getRuleMongooseSchema } from "./rules/mongoose/schemas/getRuleMongooseSchema.js";
import { imageCaptchaConfigSchema } from "./rules/rule/config/image/imageCaptchaConfigSchema.js";
import { powCaptchaConfigSchema } from "./rules/rule/config/pow/powCaptchaConfigSchema.js";
import { ruleConfigSchema } from "./rules/rule/config/ruleConfigSchema.js";
import { ruleIpSchema } from "./rules/rule/ip/ruleIpSchema.js";
import type { Rule } from "./rules/rule/rule.js";
import type { RulesStorage } from "./rules/storage/rulesStorage.js";

const createBlacklistInspector = (
	rulesStorage: RulesStorage,
	logger: Logger,
): BlacklistInspector => {
	return new BlacklistRulesInspector(rulesStorage, logger);
};

const createImageCaptchaConfigResolver = (
	rulesStorage: RulesStorage,
	logger: Logger,
): ImageCaptchaConfigRulesResolver => {
	return new ImageCaptchaConfigRulesResolver(rulesStorage, logger);
};

const createApiRuleRoutesProvider = (
	rulesStorage: RulesStorage,
): ApiRoutesProvider => {
	return new ApiRuleRoutesProvider(rulesStorage);
};

const createMongooseRulesStorage = (
	logger: Logger,
	readingModel: Model<Rule> | null,
	writingModel: Model<Rule> | null = null,
): RulesStorage => {
	return new RulesMongooseStorage(logger, readingModel, writingModel);
};

export {
	type Rule,
	type RuleMongooseRecord,
	type RulesStorage,
	type BlacklistInspector,
	type ApiInsertManyRulesArgs,
	type ApiInsertManyRulesArgsOutputSchema,
	createMongooseRulesStorage,
	createImageCaptchaConfigResolver,
	createBlacklistInspector,
	createApiRuleRoutesProvider,
	getRuleMongooseSchema,
	getExpressApiRuleRateLimits,
	apiInsertManyRulesArgsSchema,
	apiDeleteManyRulesArgsSchema,
	imageCaptchaConfigSchema,
	powCaptchaConfigSchema,
	ruleConfigSchema,
	ruleIpSchema,
	apiRulePaths,
};

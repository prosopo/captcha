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
import { createImageCaptchaConfigResolver } from "@captchaConfig/image/resolver/createImageCaptchaConfigResolver.js";
import { createRequestInspector } from "@blacklist/inspector/createRequestInspector.js";
import type { RequestInspector } from "@blacklist/inspector/requestInspector.js";
import { createExpressRuleRouter } from "@rules/api/createExpressRuleRouter.js";
import { getExpressApiRuleRateLimits } from "@rules/api/getExpressApiRuleRateLimits.js";
import type { Rule } from "@rules/rule/rule.js";
import { createMongooseRulesStorage } from "@rules/storage/createMongooseRulesStorage.js";
import { getMongooseRuleRecordSchema } from "@rules/storage/record/getMongooseRuleRecordSchema.js";
import type { RulesStorage } from "@rules/storage/rulesStorage.js";

export {
	type Rule,
	type RulesStorage,
	type RequestInspector,
	createMongooseRulesStorage,
	createImageCaptchaConfigResolver,
	createRequestInspector,
	createExpressRuleRouter,
	getMongooseRuleRecordSchema,
	getExpressApiRuleRateLimits,
};

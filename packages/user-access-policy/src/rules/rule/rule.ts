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

import { z } from "zod";
import type { RuleConfig } from "./config/ruleConfig.js";
import { ruleConfigSchema } from "./config/ruleConfigSchema.js";
import type { RuleIp } from "./ip/ruleIp.js";
import { ruleIpSchema } from "./ip/ruleIpSchema.js";

const RuleSchema = z.object({
	isUserBlocked: z.boolean(),
	clientId: z.string().optional(),
	description: z.string().optional(),
	userIp: ruleIpSchema.optional(),
	ja4: z.string().optional(),
	userId: z.string().optional(),
	config: ruleConfigSchema.optional(),
	score: z.number().optional(),
});

type Rule = z.infer<typeof RuleSchema>;

export { type Rule, RuleSchema };

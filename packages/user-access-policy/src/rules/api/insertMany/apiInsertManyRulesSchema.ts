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

import { ruleConfigSchema } from "@rules/rule/config/ruleConfigSchema.js";
import { ruleIpSchema } from "@rules/rule/ip/ruleIpSchema.js";
import { array, boolean, object, string } from "zod";

const apiInsertManyRulesSchema = array(
	object({
		isUserBlocked: boolean(),
		clientId: string().optional(),
		description: string().optional(),
		userIp: ruleIpSchema.optional(),
		userId: string().optional(),
		config: ruleConfigSchema.optional(),
	}),
);

export { apiInsertManyRulesSchema };

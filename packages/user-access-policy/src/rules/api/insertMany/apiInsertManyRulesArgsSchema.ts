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

import { boolean, number, object, type output, string } from "zod";
import { ruleConfigSchema } from "../../rule/config/ruleConfigSchema.js";

const apiInsertManyRulesArgsSchema = object({
	isUserBlocked: boolean(),
	clientId: string().optional(),
	description: string().optional(),
	userIps: object({
		v4: string().array().optional(),
		v6: string().array().optional(),
	}), // block multiple user ip ranges
	userIpMasks: object({
		v4: object({
			min: string(),
			max: string(),
		})
			.array()
			.optional(),
		v6: object({
			min: string(),
			max: string(),
		})
			.array()
			.optional(),
	}), // block multiple user ip ranges
	userIds: string().array().optional(), // block multiple user ids
	ja4s: string().array().optional(), // block multiple ja4s
	// setting individual rule values overrides any array values for the same type
	userIp: object({
		v4: string().optional(),
		v6: string().optional(),
	}).optional(),
	userId: string().optional(),
	ja4: string().optional(),
	config: ruleConfigSchema.optional(),
	score: number().optional(),
});

type ApiInsertManyRulesArgsSchema = typeof apiInsertManyRulesArgsSchema;

type ApiInsertManyRulesArgsOutputSchema = output<
	typeof apiInsertManyRulesArgsSchema
>;

export {
	apiInsertManyRulesArgsSchema,
	type ApiInsertManyRulesArgsSchema,
	type ApiInsertManyRulesArgsOutputSchema,
};

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

import { defineApiRoute } from "@prosopo/api-route";
import type { AllKeys } from "@prosopo/common";
import { type ZodType, z } from "zod";
import { accessRuleApiPaths } from "./ruleApiPaths.js";

export type MissingIds = string[];

export type MissingIdsResponse = {
	ids: string[];
};

export const missingIdsResponse = z.object({
	ids: z.string().array(),
} satisfies AllKeys<MissingIdsResponse>) satisfies ZodType<MissingIdsResponse>;

export const getMissingIdsRoute = defineApiRoute({
	path: accessRuleApiPaths.GET_MISSING_IDS,
	method: "post",
	requestSchema: z.string().array() satisfies ZodType<MissingIds>,
	responseSchema: missingIdsResponse,
});

export type DeletedRulesCount = {
	deleted_count: number;
};

export type RehashedRules = Record<string, never>;

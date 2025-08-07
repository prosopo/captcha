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
import {
	policyScopeSchema,
	userScopeInputSchema,
} from "#policy/accessPolicy.js";

export enum ScopeMatch {
	Exact = "exact",
	Greedy = "greedy",
}

export const policyFilterSchema = z.object({
	policyScope: policyScopeSchema.optional(),
	/**
	 * Exact: "clientId" => client rules, "undefined" => global rules. Used by the API
	 * Greedy: "clientId" => client + global rules, "undefined" => any rules. Used by the Express middleware
	 */
	policyScopeMatch: z.nativeEnum(ScopeMatch).default(ScopeMatch.Exact),
	userScope: userScopeInputSchema.optional(),
	/**
	 * Exact: finds rules where all the given fields matches and doesn't check IP against masks. Used by the API
	 * Greedy: finds rules where any of the given fields match and checks IP against masks. Used by the Express middleware
	 */
	userScopeMatch: z.nativeEnum(ScopeMatch).default(ScopeMatch.Exact),
    groupId: z.string().optional(),
});

// we infer using 'z.input()', as '.output()' already have .default() field values, making them required
export type PolicyFilter = z.input<typeof policyFilterSchema>;

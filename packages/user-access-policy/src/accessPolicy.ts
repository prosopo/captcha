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

export enum PolicyType {
	Block = "block",
	Restrict = "restrict",
}

export const accessPolicySchema = z.object({
	type: z.nativeEnum(PolicyType),
	description: z.string().optional(),
	// Redis stores values as strings, so coerce is needed to parse properly
	solvedImagesCount: z.coerce.number().optional(),
	unsolvedImagesCount: z.coerce.number().optional(),
	frictionlessScore: z.coerce.number().optional(),
});

export const policyScopeSchema = z.object({
	clientId: z.string().optional(),
});

export const userScopeSchema = z.object({
	userId: z.string().optional(),
	numericIp: z.coerce.bigint().optional(),
	numericIpMaskMin: z.coerce.bigint().optional(),
	numericIpMaskMax: z.coerce.bigint().optional(),
	ja4Hash: z.string().optional(),
	headersHash: z.string().optional(),
	userAgentHash: z.string().optional(),
});

export type AccessPolicy = z.infer<typeof accessPolicySchema>;
export type PolicyScope = z.infer<typeof policyScopeSchema>;
export type UserScope = z.infer<typeof userScopeSchema>;

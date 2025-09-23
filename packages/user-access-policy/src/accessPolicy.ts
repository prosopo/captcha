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

import { type CaptchaType, CaptchaTypeSchema } from "@prosopo/types";
import type { SchemaDefinition } from "mongoose";
import { type ZodType, z } from "zod";

export enum AccessPolicyType {
	Block = "block",
	Restrict = "restrict",
}

export type AccessPolicy = {
	type: AccessPolicyType;
	captchaType?: CaptchaType;
	description?: string;
	solvedImagesCount?: number;
	imageThreshold?: number;
	powDifficulty?: number;
	unsolvedImagesCount?: number;
	frictionlessScore?: number;
};

export const accessPolicySchema = z.object({
	type: z.nativeEnum(AccessPolicyType),
	captchaType: CaptchaTypeSchema.optional(),
	description: z.coerce.string().optional(),
	// Redis stores values as strings, so coerce is needed to parse properly
	solvedImagesCount: z.coerce.number().optional(),
	// the percentage of image panels that must be solved per image CAPTCHA
	imageThreshold: z.coerce.number().optional(),
	// the Proof-of-Work difficulty level
	powDifficulty: z.coerce.number().optional(),
	// the number of unsolved image CAPTCHA challenges to serve
	unsolvedImagesCount: z.coerce.number().optional(),
	// used to increase the user's score
	frictionlessScore: z.coerce.number().optional(),
}) satisfies ZodType<AccessPolicy>;

export const accessPolicyMongooseSchema: SchemaDefinition<AccessPolicy> = {
	type: { type: String, required: true },
	captchaType: { type: String, required: false },
	description: { type: String, required: false },
	solvedImagesCount: { type: Number, required: false },
	imageThreshold: { type: Number, required: false },
	powDifficulty: { type: Number, required: false },
	unsolvedImagesCount: { type: Number, required: false },
	frictionlessScore: { type: Number, required: false },
};

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

import crypto from "node:crypto";
import { type RediSearchSchema, SCHEMA_FIELD_TYPE } from "@redis/search";
import type { SchemaDefinition } from "mongoose";
import { type ZodType, z } from "zod";
import type { UserIp } from "#policy/userScope/userIp.js";

export type UserAttributes = {
	userId?: string;
	ja4Hash?: string;
	headersHash?: string;
	userAgentHash?: string;
};

export type UserAttributesRecord = Omit<UserAttributes, "userAgentHash"> & {
	userAgent?: string;
};

export const userAttributesRecordFields = [
	"userId",
	"ja4Hash",
	"headersHash",
	"userAgent",
] as const satisfies (keyof UserAttributesRecord)[];

const userAttributesInputSchema = z.object({
	// coerce is used for safety, as e.g., incoming userId can be digital
	userId: z.coerce.string().optional(),
	ja4Hash: z.coerce.string().optional(),
	headersHash: z.coerce.string().optional(),
	userAgent: z.coerce.string().optional(),
	userAgentHash: z.coerce.string().optional(),
}) satisfies ZodType<UserAttributes & UserAttributesRecord>;

export const userAttributesSchema = userAttributesInputSchema.transform(
	(inputUserAttributes): UserAttributes => {
		// this line creates a new "userAttributes", without userAgent
		const { userAgent, ...userScope } = inputUserAttributes;

		if ("string" === typeof userAgent) {
			userScope.userAgentHash = hashUserAgent(userAgent);
		}

		return userScope;
	},
);

export const userAttributesMongooseSchema: SchemaDefinition<UserAttributesRecord> =
	{
		userId: { type: String, required: false },
		ja4Hash: { type: String, required: false },
		userAgent: { type: String, required: false },
		headersHash: { type: String, required: false },
	};

export const userAttributesRedisSchema: RediSearchSchema = {
	userId: { type: SCHEMA_FIELD_TYPE.TAG, INDEXMISSING: true },
	ja4Hash: { type: SCHEMA_FIELD_TYPE.TAG, INDEXMISSING: true },
	headersHash: { type: SCHEMA_FIELD_TYPE.TAG, INDEXMISSING: true },
	userAgentHash: { type: SCHEMA_FIELD_TYPE.TAG, INDEXMISSING: true },
} satisfies Record<keyof UserAttributes, object>;

const hashUserAgent = (userAgent: string): string =>
	crypto.createHash("sha256").update(userAgent).digest("hex");

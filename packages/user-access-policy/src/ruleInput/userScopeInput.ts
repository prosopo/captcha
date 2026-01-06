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

import crypto from "node:crypto";
import type { AllKeys } from "@prosopo/common";
import { getIPAddress } from "@prosopo/util";
import { Address4 } from "ip-address";
import { type ZodType, z } from "zod";
import type { UserAttributes, UserIp, UserScope } from "#policy/rule.js";
import type { UserAttributesRecord, UserIpRecord } from "#policy/ruleRecord.js";

export type UserAttributesInput = UserAttributes & UserAttributesRecord;

const userAttributesSchema = z.object({
	// coerce is used for safety, as e.g., incoming userId can be digital
	userId: z.coerce.string().optional(),
	ja4Hash: z.coerce.string().optional(),
	headersHash: z.coerce.string().optional(),
	userAgentHash: z.coerce.string().optional(),
	headHash: z.coerce.string().optional(),
	coords: z.coerce.string().optional(),
} satisfies AllKeys<UserAttributes>) satisfies ZodType<UserAttributes>;

const userAttributesInput = z
	.object({
		...userAttributesSchema.shape,
		userAgent: z.coerce.string().optional(),
	} satisfies AllKeys<UserAttributesInput>)
	.transform((userAttributesInput: UserAttributesInput): UserAttributes => {
		// Preserve userAgentHash if it's already provided (prioritize it)
		// Extract it before destructuring to ensure we have the original value
		const userAgentHash = userAttributesInput.userAgentHash;

		// this line creates a new "userAttributes", without userAgent
		const { userAgent, ...userScope } = userAttributesInput;

		// Prioritize userAgentHash over hashing userAgent
		// If userAgentHash is provided, use it; otherwise hash userAgent if provided
		if (userAgentHash !== undefined) {
			// Explicitly set the provided userAgentHash
			userScope.userAgentHash = userAgentHash;
		} else if ("string" === typeof userAgent) {
			// Only hash userAgent if userAgentHash was not provided
			userScope.userAgentHash = hashUserAgent(userAgent);
		}

		return userScope;
	});

const hashUserAgent = (userAgent: string): string =>
	crypto.createHash("sha256").update(userAgent).digest("hex");

export type UserIpInput = UserIp & UserIpRecord;

const userIpSchema = z.object({
	numericIp: z.coerce.bigint().optional(),
	numericIpMaskMin: z.coerce.bigint().optional(),
	numericIpMaskMax: z.coerce.bigint().optional(),
} satisfies AllKeys<UserIp>) satisfies ZodType<UserIp>;

const userIpInput = z
	.object({
		...userIpSchema.shape,
		ip: z.string().optional(),
		ipMask: z.string().optional(),
	} satisfies AllKeys<UserIpInput>)
	.transform((userIpInput: UserIpInput): UserIp => {
		// Check if numeric IP mask values are already provided (prioritize them)
		const existingNumericIpMaskMin = userIpInput.numericIpMaskMin;
		const existingNumericIpMaskMax = userIpInput.numericIpMaskMax;
		const hasNumericIpMask =
			existingNumericIpMaskMin !== undefined &&
			existingNumericIpMaskMax !== undefined;

		// this line creates a new "userScope", without ip and ipMask
		const { ip, ipMask, ...numericUserIp } = userIpInput;

		// Only convert ip to numericIp if numericIp is not already provided
		if ("string" === typeof ip && numericUserIp.numericIp === undefined) {
			numericUserIp.numericIp = getIPAddress(ip).bigInt();
		}

		// Prioritize existing numeric IP mask values over converting ipMask
		if (hasNumericIpMask) {
			// Keep the existing numeric values - don't overwrite with converted ipMask
			// Explicitly set them to ensure they're not overwritten
			numericUserIp.numericIpMaskMin = existingNumericIpMaskMin;
			numericUserIp.numericIpMaskMax = existingNumericIpMaskMax;
		} else if ("string" === typeof ipMask && !hasNumericIpMask) {
			// Only convert ipMask if numeric values weren't provided
			// Create an Address4 object from the CIDR string.
			// Address4 automatically understands CIDR notation and represents the entire network range.
			const ipObject = new Address4(ipMask);

			// The minimum IP in the CIDR range is the start address of the network.
			numericUserIp.numericIpMaskMin = ipObject.startAddress().bigInt();

			// The maximum IP in the CIDR range is the end address of the network.
			numericUserIp.numericIpMaskMax = ipObject.endAddress().bigInt();
		}

		return numericUserIp;
	});

export type UserScopeInput = UserAttributesInput & UserIpInput;

export const userScopeSchema = z.object({
	...userIpSchema.shape,
	...userAttributesSchema.shape,
} satisfies AllKeys<UserScope>) satisfies ZodType<UserScope>;

export const userScopeInput = z
	.object({})
	// unlike ...shape(), .and() includes transformations
	.and(userIpInput)
	.and(userAttributesInput)
	.transform(
		// transform is used for type safety only - plain "satisfies ZodType<x>" doesn't work after ".and()"
		(userScopeInput): UserScopeInput => userScopeInput,
	);

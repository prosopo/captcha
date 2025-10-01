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
}) satisfies ZodType<UserAttributes>;

const userAttributesInput = z
	.object({
		...userAttributesSchema.shape,
		userAgent: z.coerce.string().optional(),
	})
	.transform((userAttributesInput: UserAttributesInput): UserAttributes => {
		// this line creates a new "userAttributes", without userAgent
		const { userAgent, ...userScope } = userAttributesInput;

		if ("string" === typeof userAgent) {
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
}) satisfies ZodType<UserIp>;

const userIpInput = z
	.object({
		...userIpSchema.shape,
		ip: z.string().optional(),
		ipMask: z.string().optional(),
	})
	.transform((userIpInput: UserIpInput): UserIp => {
		// this line creates a new "userScope", without ip and ipMask
		const { ip, ipMask, ...numericUserIp } = userIpInput;

		if ("string" === typeof ip) {
			numericUserIp.numericIp = getIPAddress(ip).bigInt();
		}

		// Assuming ipMask is already validated to be a string in CIDR format
		if ("string" === typeof ipMask) {
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
	...userAttributesSchema.shape,
	...userIpSchema.shape,
}) satisfies ZodType<UserScope>;

export const userScopeInput = z
	.object({})
	// unlike ...shape(), .and() includes transformations
	.and(userAttributesInput)
	.and(userIpInput)
	.transform(
		// transform is used for type safety only - plain "satisfies ZodType<x>" doesn't work after ".and()"
		(userScopeInput): UserScopeInput => userScopeInput,
	);

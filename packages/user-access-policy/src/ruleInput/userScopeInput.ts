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
import { Address4, Address6 } from "ip-address";
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
	countryCode: z.coerce.string().optional(),
	asn: z.coerce.number().int().nonnegative().optional(),
	// Plain lowercase OS tag (see `classifyOs`). Loose `string` like
	// countryCode: a stale/unknown value just never matches a request rather
	// than failing the whole rule parse.
	os: z.coerce.string().optional(),
	// Arbitrary-header matching (see `headerMatch.ts`). `headerMatch` is the
	// indexed sentinel; name/value/operator are rule data checked in code, not
	// via the Redis query. Loose `string` like the other tags.
	headerMatch: z.coerce.string().optional(),
	headerName: z.coerce.string().optional(),
	headerValue: z.coerce.string().optional(),
	headerOperator: z.coerce.string().optional(),
} satisfies AllKeys<UserAttributes>) satisfies ZodType<UserAttributes>;

const userAttributesInput = z
	.object({
		...userAttributesSchema.shape,
		userAgent: z.coerce.string().optional(),
	} satisfies AllKeys<UserAttributesInput>)
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
} satisfies AllKeys<UserIp>) satisfies ZodType<UserIp>;

const userIpInput = z
	.object({
		...userIpSchema.shape,
		ip: z.string().optional(),
		ipMask: z.string().optional(),
	} satisfies AllKeys<UserIpInput>)
	.transform((userIpInput: UserIpInput): UserIp => {
		// this line creates a new "userScope", without ip and ipMask
		const { ip, ipMask, ...numericUserIp } = userIpInput;

		if ("string" === typeof ip) {
			numericUserIp.numericIp = getIPAddress(ip).bigInt();
		}

		// Assuming ipMask is already validated to be a string in CIDR format
		if ("string" === typeof ipMask) {
			// Try IPv4 CIDR first (e.g., 192.168.1.0/24); fall back to IPv6
			// CIDR (e.g., 2001:db8::/32). Both Address4 and Address6 understand
			// CIDR notation and expose start/end addresses for the network.
			const ipObject = Address4.isValid(ipMask)
				? new Address4(ipMask)
				: new Address6(ipMask);

			numericUserIp.numericIpMaskMin = ipObject.startAddress().bigInt();
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

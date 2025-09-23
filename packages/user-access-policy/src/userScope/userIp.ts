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

import { getIPAddress } from "@prosopo/util";
import { type RediSearchSchema, SCHEMA_FIELD_TYPE } from "@redis/search";
import { Address4 } from "ip-address";
import type { SchemaDefinition } from "mongoose";
import { type ZodType, z } from "zod";

export type UserIp = {
	numericIp?: bigint;
	numericIpMaskMin?: bigint;
	numericIpMaskMax?: bigint;
};

export type UserIpRecord = {
	// human-friendly ip versions.
	ip?: string;
	// 127.0.0.1/24
	ipMask?: string;
};

const userIpInputSchema = z.object({
	ip: z.string().optional(),
	ipMask: z.string().optional(),
	numericIp: z.coerce.bigint().optional(),
	numericIpMaskMin: z.coerce.bigint().optional(),
	numericIpMaskMax: z.coerce.bigint().optional(),
}) satisfies ZodType<UserIp & UserIpRecord>;

export const userIpSchema = userIpInputSchema.transform(
	(inputNumericUserIp): UserIp => {
		// this line creates a new "userScope", without ip and ipMask
		const { ip, ipMask, ...numericUserIp } = inputNumericUserIp;

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
	},
);

export const userIpMongooseSchema: SchemaDefinition<UserIpRecord> = {
	ip: { type: String, required: false },
	ipMask: { type: String, required: false },
};

export const userIpRedisSchema: RediSearchSchema = {
	numericIpMaskMin: { type: SCHEMA_FIELD_TYPE.NUMERIC, INDEXMISSING: true },
	numericIpMaskMax: { type: SCHEMA_FIELD_TYPE.NUMERIC, INDEXMISSING: true },
	numericIp: { type: SCHEMA_FIELD_TYPE.NUMERIC, INDEXMISSING: true },
} satisfies Record<keyof UserIp, object>;

type RedisQueryBuilder = (value: unknown, scope: UserIp) => string;

export const userIpRedisQueries: Record<keyof UserIp, RedisQueryBuilder> = {
	numericIp: (value, scope) => {
		if (undefined !== value) {
			return `( @numericIp:[${value} ${value}] | ( @numericIpMaskMin:[-inf ${value}] @numericIpMaskMax:[${value} +inf] ) )`;
		}
		// Only emit ismissing(@numericIp) if ranges are also not present
		if (
			scope.numericIpMaskMin === undefined &&
			scope.numericIpMaskMax === undefined
		) {
			return "ismissing(@numericIp) ismissing(@numericIpMaskMin) ismissing(@numericIpMaskMax)";
		}
		// Else, let ranges handle it
		return "";
	},
	numericIpMaskMin: (value, scope) => {
		if (scope.numericIp !== undefined) {
			return ""; // handled by numericIp
		}
		return value !== undefined
			? `@numericIpMaskMin:[-inf ${value}]`
			: "ismissing(@numericIpMaskMin)";
	},
	numericIpMaskMax: (value, scope) => {
		if (scope.numericIp !== undefined) {
			return ""; // handled by numericIp
		}
		return value !== undefined
			? `@numericIpMaskMax:[${value} +inf]`
			: "ismissing(@numericIpMaskMax)";
	},
};

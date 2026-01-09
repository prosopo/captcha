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

import { describe, expect, expectTypeOf, it } from "vitest";
import { CaptchaStatus, ScheduledTaskNames, ScheduledTaskStatus } from "@prosopo/types";
import type {
	CompositeIpAddress,
	MongooseCompositeIpAddress,
} from "../types/provider.js";
import {
	CompositeIpAddressSchema,
	IpAddressType,
	parseMongooseCompositeIpAddress,
	ScheduledTaskSchema,
	UserCommitmentSchema,
} from "../types/provider.js";

describe("type tests", () => {
	describe("parseMongooseCompositeIpAddress", () => {
		it("should accept MongooseCompositeIpAddress parameter", () => {
			const input: MongooseCompositeIpAddress = {
				lower: { $numberDecimal: "123" },
				type: IpAddressType.v4,
			};
			expectTypeOf(input).toMatchTypeOf<MongooseCompositeIpAddress>();
			parseMongooseCompositeIpAddress(input);
		});

		it("should return CompositeIpAddress", () => {
			const input: MongooseCompositeIpAddress = {
				lower: { $numberDecimal: "123" },
				type: IpAddressType.v4,
			};
			const result = parseMongooseCompositeIpAddress(input);
			expectTypeOf(result).toMatchTypeOf<CompositeIpAddress>();
		});

		it("should return correct type structure", () => {
			const input: MongooseCompositeIpAddress = {
				lower: { $numberDecimal: "123" },
				upper: { $numberDecimal: "456" },
				type: IpAddressType.v6,
			};
			const result = parseMongooseCompositeIpAddress(input);
			expectTypeOf(result.lower).toEqualTypeOf<number | bigint>();
			expectTypeOf(result.upper).toEqualTypeOf<number | bigint | undefined>();
			expectTypeOf(result.type).toEqualTypeOf<IpAddressType>();
		});
	});

	describe("CompositeIpAddressSchema", () => {
		it("should validate valid IPv4 address", () => {
			// Testing that the schema accepts valid IPv4 composite addresses
			const validIpv4 = {
				lower: BigInt("3232235777"), // 192.168.1.1
				type: IpAddressType.v4,
			};

			const result = CompositeIpAddressSchema.safeParse(validIpv4);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.lower).toBe(BigInt("3232235777"));
				expect(result.data.type).toBe(IpAddressType.v4);
				expect(result.data.upper).toBeUndefined();
			}
		});

		it("should validate valid IPv6 address", () => {
			// Testing that the schema accepts valid IPv6 composite addresses
			const validIpv6 = {
				lower: BigInt("281470681743360"), // ::1 lower part
				upper: BigInt("0"), // ::1 upper part
				type: IpAddressType.v6,
			};

			const result = CompositeIpAddressSchema.safeParse(validIpv6);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.lower).toBe(BigInt("281470681743360"));
				expect(result.data.upper).toBe(BigInt("0"));
				expect(result.data.type).toBe(IpAddressType.v6);
			}
		});

		it("should validate IPv6 address without upper field", () => {
			// Testing that the schema accepts IPv6 addresses with only lower field
			const validIpv6LowerOnly = {
				lower: BigInt("281470681743360"),
				type: IpAddressType.v6,
			};

			const result = CompositeIpAddressSchema.safeParse(validIpv6LowerOnly);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.lower).toBe(BigInt("281470681743360"));
				expect(result.data.upper).toBeUndefined();
				expect(result.data.type).toBe(IpAddressType.v6);
			}
		});

		it("should reject invalid IP type", () => {
			// Testing that the schema rejects invalid IP address types
			const invalidType = {
				lower: BigInt("3232235777"),
				type: "invalid" as any,
			};

			const result = CompositeIpAddressSchema.safeParse(invalidType);
			expect(result.success).toBe(false);
		});

		it("should reject non-bigint lower value", () => {
			// Testing that the schema rejects non-bigint lower values
			const invalidLower = {
				lower: "3232235777", // string instead of bigint
				type: IpAddressType.v4,
			};

			const result = CompositeIpAddressSchema.safeParse(invalidLower);
			expect(result.success).toBe(false);
		});
	});

	describe("ScheduledTaskSchema", () => {
		it("should validate valid scheduled task", () => {
			// Testing that the schema accepts valid scheduled task objects
			const validTask = {
				processName: ScheduledTaskNames.BatchCommitment,
				datetime: new Date(),
				status: ScheduledTaskStatus.Pending,
			};

			const result = ScheduledTaskSchema.safeParse(validTask);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.processName).toBe(ScheduledTaskNames.BatchCommitment);
				expect(result.data.status).toBe(ScheduledTaskStatus.Pending);
				expect(result.data.datetime).toBeInstanceOf(Date);
			}
		});

		it("should validate scheduled task with result", () => {
			// Testing that the schema accepts scheduled tasks with result data
			const taskWithResult = {
				processName: ScheduledTaskNames.BatchCommitment,
				datetime: new Date(),
				updated: new Date(),
				status: ScheduledTaskStatus.Completed,
				result: {
					data: { processed: 100 },
				},
			};

			const result = ScheduledTaskSchema.safeParse(taskWithResult);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.result?.data).toEqual({ processed: 100 });
				expect(result.data.result?.error).toBeUndefined();
			}
		});

		it("should reject invalid process name", () => {
			// Testing that the schema rejects invalid process names
			const invalidProcessName = {
				processName: "InvalidProcess" as any,
				datetime: new Date(),
				status: ScheduledTaskStatus.Pending,
			};

			const result = ScheduledTaskSchema.safeParse(invalidProcessName);
			expect(result.success).toBe(false);
		});

		it("should reject invalid status", () => {
			// Testing that the schema rejects invalid status values
			const invalidStatus = {
				processName: ScheduledTaskNames.BatchCommitment,
				datetime: new Date(),
				status: "InvalidStatus" as any,
			};

			const result = ScheduledTaskSchema.safeParse(invalidStatus);
			expect(result.success).toBe(false);
		});
	});

	describe("UserCommitmentSchema", () => {
		it("should validate valid user commitment", () => {
			// Testing that the schema accepts valid user commitment objects
			const validCommitment = {
				userAccount: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
				dappAccount: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
				datasetId: "dataset123",
				providerAccount: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
				id: "commitment123",
				result: {
					status: CaptchaStatus.approved,
				},
				userSignature: "signature123",
				ipAddress: {
					lower: BigInt("3232235777"),
					type: IpAddressType.v4,
				},
				headers: {
					"user-agent": "test-agent",
					"accept": "application/json",
				},
				ja4: "ja4hash123",
				userSubmitted: true,
				serverChecked: false,
				requestedAtTimestamp: new Date(),
			};

			const result = UserCommitmentSchema.safeParse(validCommitment);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.userAccount).toBe("5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty");
				expect(result.data.dappAccount).toBe("5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty");
				expect(result.data.datasetId).toBe("dataset123");
				expect(result.data.result.status).toBe(CaptchaStatus.approved);
			}
		});

		it("should validate user commitment with optional fields", () => {
			// Testing that the schema accepts user commitments with optional fields
			const commitmentWithOptionals = {
				userAccount: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
				dappAccount: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
				datasetId: "dataset123",
				providerAccount: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
				id: "commitment123",
				result: {
					status: CaptchaStatus.approved,
				},
				userSignature: "signature123",
				ipAddress: {
					lower: BigInt("3232235777"),
					type: IpAddressType.v4,
				},
				providedIp: {
					lower: BigInt("3232235778"),
					type: IpAddressType.v4,
				},
				headers: {
					"user-agent": "test-agent",
				},
				ja4: "ja4hash123",
				userSubmitted: true,
				serverChecked: true,
				storedAtTimestamp: new Date(),
				lastUpdatedTimestamp: new Date(),
				sessionId: "session123",
				coords: [[[1, 2], [3, 4]]],
				requestedAtTimestamp: new Date(),
			};

			const result = UserCommitmentSchema.safeParse(commitmentWithOptionals);
			if (!result.success) {
				console.log("Validation error:", result.error.format());
			}
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.providedIp).toBeDefined();
				expect(result.data.sessionId).toBe("session123");
				expect(result.data.coords).toEqual([[[1, 2], [3, 4]]]);
			}
		});

		it("should reject user commitment with missing required fields", () => {
			// Testing that the schema rejects user commitments missing required fields
			const invalidCommitment = {
				userAccount: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
				dappAccount: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
				// missing datasetId, id, result, userSignature, etc.
			};

			const result = UserCommitmentSchema.safeParse(invalidCommitment);
			expect(result.success).toBe(false);
		});

		it("should reject user commitment with invalid IP address", () => {
			// Testing that the schema rejects user commitments with invalid IP addresses
			const commitmentWithInvalidIp = {
				userAccount: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
				dappAccount: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
				datasetId: "dataset123",
				id: "commitment123",
				result: {
					status: "approved",
				},
				userSignature: "signature123",
				ipAddress: {
					lower: "invalid", // should be bigint
					type: IpAddressType.v4,
				},
				headers: {},
				ja4: "ja4hash123",
				userSubmitted: true,
				serverChecked: false,
				requestedAtTimestamp: new Date(),
			};

			const result = UserCommitmentSchema.safeParse(commitmentWithInvalidIp);
			expect(result.success).toBe(false);
		});
	});
});

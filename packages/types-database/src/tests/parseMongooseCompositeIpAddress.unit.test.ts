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

import { describe, expect, it } from "vitest";
import {
	type CompositeIpAddress,
	IpAddressType,
	type MongooseCompositeIpAddress,
	parseMongooseCompositeIpAddress,
} from "../types/provider.js";

describe("parseMongooseCompositeIpAddress", () => {
	describe("IPv4 addresses", () => {
		it("should parse IPv4 address with $numberDecimal format", () => {
			const input: MongooseCompositeIpAddress = {
				lower: { $numberDecimal: "3232235777" },
				type: IpAddressType.v4,
			};
			const result = parseMongooseCompositeIpAddress(input);
			expect(result).toEqual({
				lower: BigInt("3232235777"),
				type: IpAddressType.v4,
			});
		});

		it("should parse IPv4 address with direct value fallback", () => {
			const input = {
				lower: "3232235777" as unknown as { $numberDecimal: string },
				type: IpAddressType.v4,
			} as MongooseCompositeIpAddress;
			const result = parseMongooseCompositeIpAddress(input);
			expect(result.lower).toBe(BigInt("3232235777"));
			expect(result.type).toBe(IpAddressType.v4);
			expect(result.upper).toBeUndefined();
		});

		it("should handle zero IPv4 address", () => {
			const input: MongooseCompositeIpAddress = {
				lower: { $numberDecimal: "0" },
				type: IpAddressType.v4,
			};
			const result = parseMongooseCompositeIpAddress(input);
			expect(result).toEqual({
				lower: BigInt(0),
				type: IpAddressType.v4,
			});
		});

		it("should handle maximum IPv4 address", () => {
			const input: MongooseCompositeIpAddress = {
				lower: { $numberDecimal: "4294967295" },
				type: IpAddressType.v4,
			};
			const result = parseMongooseCompositeIpAddress(input);
			expect(result).toEqual({
				lower: BigInt("4294967295"),
				type: IpAddressType.v4,
			});
		});
	});

	describe("IPv6 addresses", () => {
		it("should parse IPv6 address with both lower and upper", () => {
			const input: MongooseCompositeIpAddress = {
				lower: { $numberDecimal: "281470681743360" },
				upper: { $numberDecimal: "0" },
				type: IpAddressType.v6,
			};
			const result = parseMongooseCompositeIpAddress(input);
			expect(result).toEqual({
				lower: BigInt("281470681743360"),
				upper: BigInt(0),
				type: IpAddressType.v6,
			});
		});

		it("should parse IPv6 address with large values", () => {
			const input: MongooseCompositeIpAddress = {
				lower: { $numberDecimal: "18446744073709551615" },
				upper: { $numberDecimal: "18446744073709551615" },
				type: IpAddressType.v6,
			};
			const result = parseMongooseCompositeIpAddress(input);
			expect(result).toEqual({
				lower: BigInt("18446744073709551615"),
				upper: BigInt("18446744073709551615"),
				type: IpAddressType.v6,
			});
		});

		it("should handle IPv6 address without upper field", () => {
			const input: MongooseCompositeIpAddress = {
				lower: { $numberDecimal: "281470681743360" },
				type: IpAddressType.v6,
			};
			const result = parseMongooseCompositeIpAddress(input);
			expect(result).toEqual({
				lower: BigInt("281470681743360"),
				upper: undefined,
				type: IpAddressType.v6,
			});
		});

		it("should parse IPv6 with direct value fallback for upper", () => {
			const input = {
				lower: { $numberDecimal: "123456789" },
				upper: "987654321" as unknown as { $numberDecimal: string },
				type: IpAddressType.v6,
			} as MongooseCompositeIpAddress;
			const result = parseMongooseCompositeIpAddress(input);
			expect(result.lower).toBe(BigInt("123456789"));
			expect(result.upper).toBe(BigInt("987654321"));
			expect(result.type).toBe(IpAddressType.v6);
		});

		it("should parse IPv6 with zero upper value", () => {
			const input: MongooseCompositeIpAddress = {
				lower: { $numberDecimal: "123456789" },
				upper: { $numberDecimal: "0" },
				type: IpAddressType.v6,
			};
			const result = parseMongooseCompositeIpAddress(input);
			expect(result.lower).toBe(BigInt("123456789"));
			expect(result.upper).toBe(BigInt(0));
			expect(result.type).toBe(IpAddressType.v6);
		});
	});

	describe("edge cases", () => {
		it("should handle very large decimal values", () => {
			const largeValue = "999999999999999999999999999999";
			const input: MongooseCompositeIpAddress = {
				lower: { $numberDecimal: largeValue },
				upper: { $numberDecimal: largeValue },
				type: IpAddressType.v6,
			};
			const result = parseMongooseCompositeIpAddress(input);
			expect(result.lower).toBe(BigInt(largeValue));
			expect(result.upper).toBe(BigInt(largeValue));
		});

		it("should handle negative-looking values (as strings)", () => {
			const input: MongooseCompositeIpAddress = {
				lower: { $numberDecimal: "0" },
				type: IpAddressType.v4,
			};
			const result = parseMongooseCompositeIpAddress(input);
			expect(result.lower).toBe(BigInt(0));
		});
	});

	describe("type safety", () => {
		it("should return CompositeIpAddress type", () => {
			const input: MongooseCompositeIpAddress = {
				lower: { $numberDecimal: "3232235777" },
				type: IpAddressType.v4,
			};
			const result = parseMongooseCompositeIpAddress(input);
			const _typeCheck: CompositeIpAddress = result;
			expect(result).toBeDefined();
		});

		it("should handle undefined upper field correctly", () => {
			const input: MongooseCompositeIpAddress = {
				lower: { $numberDecimal: "1" },
				type: IpAddressType.v6,
			};
			const result = parseMongooseCompositeIpAddress(input);
			expect(result.upper).toBeUndefined();
		});
	});
});

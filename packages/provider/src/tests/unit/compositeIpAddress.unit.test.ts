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

import { IpAddressType } from "@prosopo/types";
import { describe, expect, it } from "vitest";
import {
	getCompositeIpAddress,
	getIpAddressFromComposite,
} from "../../compositeIpAddress.js";

describe("compositeIpAddress", () => {
	describe("getCompositeIpAddress", () => {
		it("should convert IPv4 string to composite format", () => {
			const result = getCompositeIpAddress("192.168.1.1");

			expect(result).toEqual({
				lower: 3232235777n, // 192.168.1.1 in decimal
				type: IpAddressType.v4,
			});
			expect(result.upper).toBeUndefined();
		});

		it("should convert IPv4 Address4 object to composite format", () => {
			const { Address4 } = require("ip-address");
			const ipAddress = new Address4("10.0.0.1");
			const result = getCompositeIpAddress(ipAddress);

			expect(result).toEqual({
				lower: 167772161n, // 10.0.0.1 in decimal
				type: IpAddressType.v4,
			});
		});

		it("should convert IPv6 string to composite format", () => {
			const result = getCompositeIpAddress("2001:db8::1");

			expect(result).toEqual({
				lower: 1n,
				upper: 2306139568115548160n, // 2001:db8:: in upper 64 bits
				type: IpAddressType.v6,
			});
		});

		it("should convert IPv6 Address6 object to composite format", () => {
			const { Address6 } = require("ip-address");
			const ipAddress = new Address6("::1");
			const result = getCompositeIpAddress(ipAddress);

			expect(result).toEqual({
				lower: 1n,
				upper: 0n,
				type: IpAddressType.v6,
			});
		});

		it("should handle localhost IPv4", () => {
			const result = getCompositeIpAddress("127.0.0.1");

			expect(result).toEqual({
				lower: 2130706433n, // 127.0.0.1 in decimal
				type: IpAddressType.v4,
			});
		});

		it("should handle invalid IP string gracefully", () => {
			const result = getCompositeIpAddress("invalid-ip");

			expect(result).toEqual({
				lower: 0n,
				type: IpAddressType.v4,
			});
		});

		it("should handle empty string", () => {
			const result = getCompositeIpAddress("");

			expect(result).toEqual({
				lower: 0n,
				type: IpAddressType.v4,
			});
		});
	});

	describe("getIpAddressFromComposite", () => {
		it("should convert IPv4 composite back to Address4", () => {
			const composite = {
				lower: 3232235777n, // 192.168.1.1
				type: IpAddressType.v4,
			};

			const result = getIpAddressFromComposite(composite);
			expect(result.address).toBe("192.168.1.1");
		});

		it("should convert IPv6 composite back to Address6", () => {
			const composite = {
				lower: 1n,
				upper: 2306139568115548160n, // 2001:db8::
				type: IpAddressType.v6,
			};

			const result = getIpAddressFromComposite(composite);
			expect(result.address).toBe("2001:0db8:0000:0000:0000:0000:0000:0001");
		});

		it("should handle IPv6 with zero upper bits", () => {
			const composite = {
				lower: 1n,
				upper: 0n,
				type: IpAddressType.v6,
			};

			const result = getIpAddressFromComposite(composite);
			expect(result.address).toBe("0000:0000:0000:0000:0000:0000:0000:0001");
		});

		it("should handle composite with undefined upper for IPv4", () => {
			const composite = {
				lower: 2130706433n, // 127.0.0.1
				type: IpAddressType.v4,
			};

			const result = getIpAddressFromComposite(composite);
			expect(result.address).toBe("127.0.0.1");
		});

		it("should handle composite with undefined upper/lower gracefully", () => {
			const composite = {
				type: IpAddressType.v4,
				// biome-ignore lint/suspicious/noExplicitAny: tests
			} as any;

			const result = getIpAddressFromComposite(composite);
			expect(result.address).toBe("0.0.0.0");
		});
	});

	describe("round trip conversion", () => {
		it("should maintain IPv4 address through round trip", () => {
			const original = "192.168.1.100";
			const composite = getCompositeIpAddress(original);
			const result = getIpAddressFromComposite(composite);

			expect(result.address).toBe(original);
		});

		it("should maintain IPv6 address through round trip", () => {
			const original = "2001:db8:85a3::8a2e:370:7334";
			const composite = getCompositeIpAddress(original);
			const result = getIpAddressFromComposite(composite);

			expect(result.address).toBe("2001:0db8:85a3:0000:0000:8a2e:0370:7334");
		});

		it("should maintain localhost through round trip", () => {
			const original = "127.0.0.1";
			const composite = getCompositeIpAddress(original);
			const result = getIpAddressFromComposite(composite);

			expect(result.address).toBe(original);
		});

		it("should maintain IPv6 localhost through round trip", () => {
			const original = "::1";
			const composite = getCompositeIpAddress(original);
			const result = getIpAddressFromComposite(composite);

			expect(result.address).toBe("0000:0000:0000:0000:0000:0000:0000:0001");
		});
	});

	describe("edge cases", () => {
		it("should handle maximum IPv4 value", () => {
			const result = getCompositeIpAddress("255.255.255.255");

			expect(result).toEqual({
				lower: 4294967295n,
				type: IpAddressType.v4,
			});
		});

		it("should handle IPv6 all zeros", () => {
			const result = getCompositeIpAddress("::");

			expect(result).toEqual({
				lower: 0n,
				upper: 0n,
				type: IpAddressType.v6,
			});
		});

		it("should handle IPv6 all ones", () => {
			const result = getCompositeIpAddress(
				"ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff",
			);

			expect(result).toEqual({
				lower: 18446744073709551615n, // 2^64 - 1
				upper: 18446744073709551615n, // 2^64 - 1
				type: IpAddressType.v6,
			});
		});
	});
});

import { Address4, Address6 } from "ip-address";
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
import { describe, expect, test, vi } from "vitest";
import { getIPAddress, getIPAddressFromBigInt } from "./ip.js";

describe("ip", () => {
	test("types", () => {
		// check the types are picked up correctly by ts
		// getIPAddress can return either Address4 or Address6
		const ip1 = getIPAddress("192.168.1.1");
		const _v1: Address4 | Address6 = ip1;

		const ip2 = getIPAddress("2001:0db8::1");
		const _v2: Address4 | Address6 = ip2;

		// getIPAddressFromBigInt returns Address4
		const ip3 = getIPAddressFromBigInt(BigInt(3232235777));
		const _v3: Address4 = ip3;
	});

	describe("getIPAddress", () => {
		test("returns Address4 for valid IPv4 address", () => {
			const ip = getIPAddress("192.168.1.1");
			expect(ip).toBeInstanceOf(Address4);
			expect(ip.address).toBe("192.168.1.1");
		});

		test("returns Address6 for valid IPv6 address", () => {
			const ip = getIPAddress("2001:0db8:85a3:0000:0000:8a2e:0370:7334");
			expect(ip).toBeInstanceOf(Address6);
			// Address6 stores the canonical form (with all zeros expanded)
			expect(ip.address).toBe("2001:0db8:85a3:0000:0000:8a2e:0370:7334");
		});

		test("returns Address6 for shortened IPv6 address", () => {
			const ip = getIPAddress("::1");
			expect(ip).toBeInstanceOf(Address6);
			expect(ip.address).toBe("::1");
		});

		test("returns Address6 for IPv4-mapped IPv6 address", () => {
			const ip = getIPAddress("::ffff:192.168.1.1");
			expect(ip).toBeInstanceOf(Address6);
		});

		test("throws error for invalid IP address", () => {
			const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
			expect(() => getIPAddress("invalid")).to.throw("API.INVALID_IP");
			consoleSpy.mockRestore();
		});

		test("throws error for empty string", () => {
			const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
			expect(() => getIPAddress("")).to.throw("API.INVALID_IP");
			consoleSpy.mockRestore();
		});

		test("throws error for malformed IPv4", () => {
			const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
			expect(() => getIPAddress("999.999.999.999")).to.throw("API.INVALID_IP");
			consoleSpy.mockRestore();
		});

		test("handles various valid IPv4 formats", () => {
			const ips = [
				"0.0.0.0",
				"127.0.0.1",
				"255.255.255.255",
				"10.0.0.1",
				"172.16.0.1",
			];
			for (const ipStr of ips) {
				const ip = getIPAddress(ipStr);
				expect(ip).toBeInstanceOf(Address4);
			}
		});

		test("handles various valid IPv6 formats", () => {
			const ips = [
				"2001:0db8:85a3:0000:0000:8a2e:0370:7334",
				"2001:db8:85a3::8a2e:370:7334",
				"fe80::1",
				"::1",
			];
			for (const ipStr of ips) {
				const ip = getIPAddress(ipStr);
				expect(ip).toBeInstanceOf(Address6);
			}
		});
	});

	describe("getIPAddressFromBigInt", () => {
		test("converts BigInt to Address4", () => {
			// 192.168.1.1 = 3232235777 in decimal
			const bigInt = BigInt(3232235777);
			const ip = getIPAddressFromBigInt(bigInt);
			expect(ip).toBeInstanceOf(Address4);
		});

		test("converts zero BigInt to Address4", () => {
			const bigInt = BigInt(0);
			const ip = getIPAddressFromBigInt(bigInt);
			expect(ip).toBeInstanceOf(Address4);
			expect(ip.address).toBe("0.0.0.0");
		});

		test("converts max IPv4 BigInt to Address4", () => {
			// 255.255.255.255 = 4294967295
			const bigInt = BigInt(4294967295);
			const ip = getIPAddressFromBigInt(bigInt);
			expect(ip).toBeInstanceOf(Address4);
			expect(ip.address).toBe("255.255.255.255");
		});

		test("converts various BigInt values", () => {
			const testCases = [
				{ bigInt: BigInt(16777343), expected: "1.0.0.127" },
				{ bigInt: BigInt(2130706433), expected: "127.0.0.1" },
			];
			for (const { bigInt, expected } of testCases) {
				const ip = getIPAddressFromBigInt(bigInt);
				expect(ip).toBeInstanceOf(Address4);
				expect(ip.address).toBe(expected);
			}
		});
	});
});

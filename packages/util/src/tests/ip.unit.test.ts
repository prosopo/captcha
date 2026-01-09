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
import { describe, expect, it } from "vitest";
import { getIPAddress, getIPAddressFromBigInt } from "../ip.js";

describe("ip", () => {
	describe("getIPAddress", () => {
		it("parses IPv4 address", () => {
			const ip = getIPAddress("192.168.1.1");
			expect(ip.address).toBe("192.168.1.1");
		});

		it("parses IPv6 address", () => {
			const ip = getIPAddress("2001:0db8:85a3:0000:0000:8a2e:0370:7334");
			expect(ip.address).toBe("2001:db8:85a3::8a2e:370:7334");
		});

		it("parses shortened IPv6 address", () => {
			const ip = getIPAddress("::1");
			expect(ip.address).toBe("::1");
		});

		it("throws on invalid IP address", () => {
			expect(() => getIPAddress("invalid")).toThrow("API.INVALID_IP");
		});

		it("throws on empty string", () => {
			expect(() => getIPAddress("")).toThrow("API.INVALID_IP");
		});
	});

	describe("getIPAddressFromBigInt", () => {
		it("converts BigInt to IPv4 address", () => {
			const ip = getIPAddressFromBigInt(3232235777n);
			expect(ip.address).toBe("192.168.1.1");
		});

		it("converts zero BigInt to IPv4 address", () => {
			const ip = getIPAddressFromBigInt(0n);
			expect(ip.address).toBe("0.0.0.0");
		});

		it("converts max IPv4 BigInt", () => {
			const ip = getIPAddressFromBigInt(4294967295n);
			expect(ip.address).toBe("255.255.255.255");
		});
	});
});

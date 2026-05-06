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
import {
	isDomainSafeForOutboundRequest,
	validateDomainForOutboundRequest,
} from "../domainValidation.js";

describe("validateDomainForOutboundRequest", () => {
	describe("valid domains", () => {
		it("should accept valid public domains", () => {
			const validDomains = [
				"example.com",
				"sub.example.com",
				"deep.sub.example.com",
				"example.co.uk",
				"my-domain.com",
				"my-domain-123.org",
				"a1b2c3.net",
			];

			for (const domain of validDomains) {
				const result = validateDomainForOutboundRequest(domain);
				expect(result.isValid, `Expected ${domain} to be valid`).toBe(true);
			}
		});
	});

	describe("empty/invalid input", () => {
		it("should reject empty strings", () => {
			expect(validateDomainForOutboundRequest("").isValid).toBe(false);
			expect(validateDomainForOutboundRequest("   ").isValid).toBe(false);
		});

		it("should reject null-like values", () => {
			// @ts-expect-error - testing invalid input
			expect(validateDomainForOutboundRequest(null).isValid).toBe(false);
			// @ts-expect-error - testing invalid input
			expect(validateDomainForOutboundRequest(undefined).isValid).toBe(false);
		});
	});

	describe("IP address literals", () => {
		it("should reject IPv4 addresses", () => {
			const ipv4Addresses = [
				"192.168.1.1",
				"10.0.0.1",
				"172.16.0.1",
				"8.8.8.8",
				"1.1.1.1",
			];

			for (const ip of ipv4Addresses) {
				const result = validateDomainForOutboundRequest(ip);
				expect(result.isValid, `Expected ${ip} to be rejected`).toBe(false);
				expect(result.reason).toContain("IP");
			}
		});

		describe("IPv6 reserved ranges (isReservedIPv6)", () => {
			it("should reject loopback ::1/128", () => {
				for (const addr of ["::1", "0:0:0:0:0:0:0:1"]) {
					const result = validateDomainForOutboundRequest(addr);
					expect(result.isValid, `${addr} must be rejected`).toBe(false);
					expect(result.reason).toContain("reserved");
				}
			});

			it("should reject unspecified ::/128", () => {
				for (const addr of ["::", "0:0:0:0:0:0:0:0"]) {
					const result = validateDomainForOutboundRequest(addr);
					expect(result.isValid, `${addr} must be rejected`).toBe(false);
					expect(result.reason).toContain("reserved");
				}
			});

			it("should reject link-local fe80::/10", () => {
				// fe80 first octet = 0xfe → link-local
				for (const addr of ["fe80::1", "fe80::dead:beef", "fe80::1%eth0"]) {
					const result = validateDomainForOutboundRequest(addr);
					expect(result.isValid, `${addr} must be rejected`).toBe(false);
					expect(result.reason).toContain("reserved");
				}
			});

			it("should reject unique-local fc00::/7 (fc and fd prefixes)", () => {
				// fc00::/7 covers fc00:: – fdff::
				// fc: first octet 0xfc → (0xfc & 0xfe) === 0xfc ✓
				// fd: first octet 0xfd → (0xfd & 0xfe) === 0xfc ✓
				for (const addr of [
					"fc00::1", // fc prefix
					"fc00:dead:beef::1",
					"fd00::1", // fd prefix
					"fd12:3456:789a::1",
				]) {
					const result = validateDomainForOutboundRequest(addr);
					expect(result.isValid, `${addr} must be rejected`).toBe(false);
					expect(result.reason).toContain("reserved");
				}
			});

			it("should reject multicast ff00::/8", () => {
				// First octet 0xff → multicast
				for (const addr of [
					"ff00::1",
					"ff02::1", // all nodes
					"ff02::2", // all routers
					"ff05::101", // NTP
				]) {
					const result = validateDomainForOutboundRequest(addr);
					expect(result.isValid, `${addr} must be rejected`).toBe(false);
					expect(result.reason).toContain("reserved");
				}
			});

			it("should reject documentation range 2001:db8::/32", () => {
				for (const addr of ["2001:db8::1", "2001:db8:85a3::8a2e:370:7334"]) {
					const result = validateDomainForOutboundRequest(addr);
					expect(result.isValid, `${addr} must be rejected`).toBe(false);
					expect(result.reason).toContain("reserved");
				}
			});

			it("should reject IPv4-mapped addresses ::ffff:0:0/96 when mapped IPv4 is private", () => {
				// ::ffff:192.168.1.1 maps to 192.168.1.1 (private)
				for (const addr of [
					"::ffff:192.168.1.1",
					"::ffff:127.0.0.1",
					"::ffff:10.0.0.1",
				]) {
					const result = validateDomainForOutboundRequest(addr);
					expect(result.isValid, `${addr} must be rejected`).toBe(false);
					expect(result.reason).toContain("reserved");
				}
			});

			it("should reject bracketed IPv6 literals", () => {
				for (const addr of ["[::1]", "[fe80::1]", "[fc00::1]", "[ff02::1]"]) {
					const result = validateDomainForOutboundRequest(addr);
					expect(result.isValid, `${addr} must be rejected`).toBe(false);
					expect(result.reason).toContain("IP");
				}
			});

			it("should reject any IPv6 literal even when globally routable", () => {
				// Public unicast — IP literals of any kind are not allowed
				for (const addr of [
					"2606:4700:4700::1111", // Cloudflare DNS
					"2001:4860:4860::8888", // Google DNS
					"2400:cb00:2048::1", // Cloudflare
				]) {
					const result = validateDomainForOutboundRequest(addr);
					expect(result.isValid, `${addr} must be rejected`).toBe(false);
					expect(result.reason).toContain("IP");
				}
			});
		});

		it("should reject reserved IPv4 ranges", () => {
			const reservedIPs = [
				"127.0.0.1", // Loopback
				"10.0.0.1", // Private
				"172.16.0.1", // Private
				"192.168.0.1", // Private
				"169.254.169.254", // AWS metadata
				"0.0.0.0", // Current network
				"255.255.255.255", // Broadcast
				"100.64.0.1", // Carrier-grade NAT
			];

			for (const ip of reservedIPs) {
				const result = validateDomainForOutboundRequest(ip);
				expect(result.isValid, `Expected ${ip} to be rejected`).toBe(false);
				expect(result.reason).toContain("reserved");
			}
		});
	});

	describe("localhost and reserved hostnames", () => {
		it("should reject localhost variants", () => {
			const localhostVariants = [
				"localhost",
				"LOCALHOST",
				"localhost.localdomain",
				"local",
			];

			for (const hostname of localhostVariants) {
				const result = validateDomainForOutboundRequest(hostname);
				expect(result.isValid, `Expected ${hostname} to be rejected`).toBe(
					false,
				);
			}
		});

		it("should reject other reserved hostnames", () => {
			const reservedHostnames = [
				"broadcasthost",
				"ip6-localhost",
				"ip6-loopback",
			];

			for (const hostname of reservedHostnames) {
				const result = validateDomainForOutboundRequest(hostname);
				expect(result.isValid, `Expected ${hostname} to be rejected`).toBe(
					false,
				);
			}
		});
	});

	describe("reserved TLDs", () => {
		it("should reject domains with reserved TLDs", () => {
			// These all reach the TLD check (not caught earlier by hostname/pattern checks)
			const reservedTLDDomains = [
				"myserver.localhost",
				"myhost.local",
				"database.intranet",
				"router.lan",
				"nas.home",
				"hidden.onion",
			];

			for (const domain of reservedTLDDomains) {
				const result = validateDomainForOutboundRequest(domain);
				expect(result.isValid, `Expected ${domain} to be rejected`).toBe(false);
				expect(result.reason).toContain("TLD");
			}
		});

		it("should reject .internal domains (caught by internal-hostname pattern)", () => {
			// *.internal matches AWS_INTERNAL_PATTERNS before reaching the TLD check
			const result = validateDomainForOutboundRequest("server.internal");
			expect(result.isValid).toBe(false);
			// Reason may be either the pattern match or the TLD check — just verify rejection
			expect(result.reason).toBeDefined();
		});
	});

	describe("AWS/cloud internal hostnames", () => {
		it("should reject AWS metadata service", () => {
			const result = validateDomainForOutboundRequest("169.254.169.254");
			expect(result.isValid).toBe(false);
		});

		it("should reject cloud internal hostnames", () => {
			const internalHostnames = [
				"metadata.google.internal",
				"instance-data.ec2.internal",
				"ip-10-0-0-1.ec2.internal",
				"myhost.compute.internal",
				"something.internal",
			];

			for (const hostname of internalHostnames) {
				const result = validateDomainForOutboundRequest(hostname);
				expect(result.isValid, `Expected ${hostname} to be rejected`).toBe(
					false,
				);
			}
		});
	});

	describe("single-label domains", () => {
		it("should reject single-label domains without TLD", () => {
			const singleLabelDomains = [
				"myserver",
				"database",
				"router",
				"intranet-server",
			];

			for (const domain of singleLabelDomains) {
				const result = validateDomainForOutboundRequest(domain);
				expect(result.isValid, `Expected ${domain} to be rejected`).toBe(false);
				expect(result.reason).toContain("TLD");
			}
		});
	});

	describe("invalid domain formats", () => {
		it("should reject domains with empty labels", () => {
			const invalidDomains = [".example.com", "example..com", "example.com."];

			for (const domain of invalidDomains) {
				const result = validateDomainForOutboundRequest(domain);
				expect(result.isValid, `Expected ${domain} to be rejected`).toBe(false);
			}
		});
	});

	describe("case insensitivity", () => {
		it("should handle uppercase domains correctly", () => {
			expect(validateDomainForOutboundRequest("EXAMPLE.COM").isValid).toBe(
				true,
			);
			expect(validateDomainForOutboundRequest("LOCALHOST").isValid).toBe(false);
			expect(validateDomainForOutboundRequest("MyServer.LOCAL").isValid).toBe(
				false,
			);
		});
	});
});

describe("isDomainSafeForOutboundRequest", () => {
	it("should return true for valid domains", () => {
		expect(isDomainSafeForOutboundRequest("example.com")).toBe(true);
		expect(isDomainSafeForOutboundRequest("google.com")).toBe(true);
	});

	it("should return false for invalid domains", () => {
		expect(isDomainSafeForOutboundRequest("localhost")).toBe(false);
		expect(isDomainSafeForOutboundRequest("127.0.0.1")).toBe(false);
		expect(isDomainSafeForOutboundRequest("192.168.1.1")).toBe(false);
		expect(isDomainSafeForOutboundRequest("server.internal")).toBe(false);
	});
});

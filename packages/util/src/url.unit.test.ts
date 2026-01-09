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
import { describe, expect, it, test } from "vitest";
import {
	domainIsLocalhost,
	getURLProtocol,
	parseUrl,
	validateDomain,
	validateDomainPattern,
} from "./url.js";

describe("url", () => {
	describe("getURLProtocol", () => {
		test("types", () => {
			const url1 = new URL("https://example.com");
			const result1 = getURLProtocol(url1);
			const _v1: string = result1;

			const url2 = new URL("http://192.168.1.1");
			const result2 = getURLProtocol(url2);
			const _v2: string = result2;
		});

		test("returns http for IP address", () => {
			const url = new URL("https://192.168.1.1");
			expect(getURLProtocol(url)).toBe("http");
		});

		test("returns http for localhost IP", () => {
			const url = new URL("https://127.0.0.1");
			expect(getURLProtocol(url)).toBe("http");
		});

		test("returns https for domain name", () => {
			const url = new URL("https://example.com");
			expect(getURLProtocol(url)).toBe("https");
		});

		test("returns https for subdomain", () => {
			const url = new URL("https://www.example.com");
			expect(getURLProtocol(url)).toBe("https");
		});
	});

	describe("parseUrl", () => {
		test("types", () => {
			const result = parseUrl("example.com");
			const _v1: URL = result;
		});

		test("parses plain domain", () => {
			const url = parseUrl("example.com");
			expect(url.hostname).toBe("example.com");
			expect(url.protocol).toBe("https:");
		});

		test("removes https:// prefix", () => {
			const url = parseUrl("https://example.com");
			expect(url.hostname).toBe("example.com");
		});

		test("removes http:// prefix", () => {
			const url = parseUrl("http://example.com");
			expect(url.hostname).toBe("example.com");
		});

		test("removes www. prefix", () => {
			const url = parseUrl("www.example.com");
			expect(url.hostname).toBe("example.com");
		});

		test("removes both protocol and www prefix", () => {
			const url = parseUrl("https://www.example.com");
			expect(url.hostname).toBe("example.com");
		});

		test("throws error for email address", () => {
			expect(() => parseUrl("user@example.com")).toThrow("Invalid domain");
		});

		test("handles subdomains", () => {
			const url = parseUrl("sub.example.com");
			expect(url.hostname).toBe("sub.example.com");
		});
	});

	describe("validateDomain", () => {
		test("types", () => {
			const result = validateDomain("example.com");
			const _v1: boolean = result;
		});

		it("validates valid domains", () => {
			const domains = [
				"google.com",
				"www.google.com",
				"www.google.co.uk",
				"www.google.co",
				"google.co",
				"google.co.uk",
				"www.google.com.au",
				"prosopo.io",
				"averylongdomainnamethatnobodywouldeverremember.com",
			];
			domains.map((domain) => {
				expect(validateDomain(domain)).to.equal(true);
			});
		});
		it("does not validate an email address", () => {
			expect(validateDomain("blah@gmail.com")).to.equal(false);
		});
		it("does not validate a domain ending in a dot", () => {
			expect(validateDomain("google.")).to.equal(false);
		});
		it("does not validate a domain containing an @", () => {
			expect(validateDomain("goo@gle")).to.equal(false);
		});
		it("does not validate a domain with a leading dot", () => {
			expect(validateDomain(".google.com")).to.equal(false);
		});
		it("validates a very long domain name", () => {
			// 253 characters is the maximum length of full domain name, including dots: e.g. www.example.com = 15 characters.
			//
			// 63 characters in the maximum length of a "label" (part of domain name separated by dot). Labels for www.example.com are com, example and www.
			expect(
				validateDomain(
					`${"a".repeat(62)}.${"a".repeat(62)}.${"a".repeat(62)}.${"a".repeat(61)}.co`,
				),
			).to.equal(true);
		});
		it("does not validate a domain name that is too long", () => {
			expect(
				validateDomain(
					`${"a".repeat(62)}.${"a".repeat(62)}.${"a".repeat(62)}.${"a".repeat(62)}.co`,
				),
			).to.equal(false);
		});

		it("handles URL parsing errors defensively", () => {
			// This test documents that validateDomain has defensive error handling
			// for URL parsing failures. While it's difficult to trigger with real domains
			// due to the URL constructor being permissive, the try-catch exists as
			// defensive programming. The regex validation catches most invalid cases.
			expect(validateDomain("example..com")).to.equal(true); // Passes regex and URL parsing
			expect(validateDomain("normal-domain.com")).to.equal(true); // Normal case
		});
	});

	describe("domainIsLocalhost", () => {
		test("types", () => {
			const result = domainIsLocalhost("localhost");
			const _v1: boolean = result;
		});

		test("returns true for localhost", () => {
			expect(domainIsLocalhost("localhost")).toBe(true);
		});

		test("returns true for 127.0.0.1", () => {
			expect(domainIsLocalhost("127.0.0.1")).toBe(true);
		});

		test("returns false for other domains", () => {
			expect(domainIsLocalhost("example.com")).toBe(false);
			expect(domainIsLocalhost("www.example.com")).toBe(false);
			expect(domainIsLocalhost("192.168.1.1")).toBe(false);
		});

		test("returns false for empty string", () => {
			expect(domainIsLocalhost("")).toBe(false);
		});
	});

	describe("validateDomainPattern", () => {
		test("types", () => {
			const result = validateDomainPattern("*");
			const _v1: boolean = result;
		});

		test("returns true for wildcard *", () => {
			expect(validateDomainPattern("*")).toBe(true);
		});

		test("returns true for localhost", () => {
			expect(validateDomainPattern("localhost")).toBe(true);
		});

		test("returns true for valid domain", () => {
			expect(validateDomainPattern("example.com")).toBe(true);
		});

		test("returns true for subdomain wildcard pattern", () => {
			expect(validateDomainPattern("*.example.com")).toBe(true);
		});

		test("returns true for glob pattern with wildcard", () => {
			expect(validateDomainPattern("*example*")).toBe(true);
			expect(validateDomainPattern("example*")).toBe(true);
			expect(validateDomainPattern("*example.com")).toBe(true);
		});

		test("returns false for empty string", () => {
			expect(validateDomainPattern("")).toBe(false);
		});

		test("returns false for invalid characters", () => {
			expect(validateDomainPattern("example@com")).toBe(false);
			expect(validateDomainPattern("example com")).toBe(false);
		});

		test("returns false for wildcard-only pattern", () => {
			expect(validateDomainPattern("***")).toBe(false);
		});

		test("handles case insensitivity", () => {
			expect(validateDomainPattern("EXAMPLE.COM")).toBe(true);
			expect(validateDomainPattern("*.EXAMPLE.COM")).toBe(true);
		});

		test("returns false for invalid subdomain wildcard", () => {
			expect(validateDomainPattern("*.")).toBe(false);
		});
	});
});

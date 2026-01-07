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
	domainIsLocalhost,
	getURLProtocol,
	parseUrl,
	validateDomain,
	validateDomainPattern,
} from "../url.js";

describe("url", () => {
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

	describe("parseUrl", () => {
		it("parses domain without protocol", () => {
			const url = parseUrl("example.com");
			expect(url.hostname).toBe("example.com");
			expect(url.protocol).toBe("https:");
		});

		it("removes http:// prefix", () => {
			const url = parseUrl("http://example.com");
			expect(url.hostname).toBe("example.com");
		});

		it("removes https:// prefix", () => {
			const url = parseUrl("https://example.com");
			expect(url.hostname).toBe("example.com");
		});

		it("removes www. prefix", () => {
			const url = parseUrl("www.example.com");
			expect(url.hostname).toBe("example.com");
		});

		it("removes both www. and protocol", () => {
			const url = parseUrl("https://www.example.com");
			expect(url.hostname).toBe("example.com");
		});

		it("throws on email address", () => {
			expect(() => parseUrl("user@example.com")).toThrow("Invalid domain");
		});
	});

	describe("getURLProtocol", () => {
		it("returns http for IP address", () => {
			const url = new URL("http://192.168.1.1");
			expect(getURLProtocol(url)).toBe("http");
		});

		it("returns https for domain name", () => {
			const url = new URL("https://example.com");
			expect(getURLProtocol(url)).toBe("https");
		});

		it("returns http for localhost IP", () => {
			const url = new URL("http://127.0.0.1");
			expect(getURLProtocol(url)).toBe("http");
		});
	});

	describe("domainIsLocalhost", () => {
		it("returns true for localhost", () => {
			expect(domainIsLocalhost("localhost")).toBe(true);
		});

		it("returns true for 127.0.0.1", () => {
			expect(domainIsLocalhost("127.0.0.1")).toBe(true);
		});

		it("returns false for other domains", () => {
			expect(domainIsLocalhost("example.com")).toBe(false);
		});
	});

	describe("validateDomainPattern", () => {
		it("validates wildcard *", () => {
			expect(validateDomainPattern("*")).toBe(true);
		});

		it("validates localhost", () => {
			expect(validateDomainPattern("localhost")).toBe(true);
		});

		it("validates subdomain wildcard", () => {
			expect(validateDomainPattern("*.example.com")).toBe(true);
		});

		it("validates glob pattern", () => {
			expect(validateDomainPattern("*example*")).toBe(true);
		});

		it("validates normal domain", () => {
			expect(validateDomainPattern("example.com")).toBe(true);
		});

		it("returns false for empty string", () => {
			expect(validateDomainPattern("")).toBe(false);
		});

		it("returns false for invalid pattern", () => {
			expect(validateDomainPattern("invalid@pattern")).toBe(false);
		});

		it("handles case insensitivity", () => {
			expect(validateDomainPattern("EXAMPLE.COM")).toBe(true);
		});
	});
});

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
	buildDomainSuffixCandidates,
	decodeGoogleTranslateHost,
	isProtectDeployment,
	sanitisePageUrl,
	validateDomain,
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
	it("does not validate a domain containing consecutive dots", () => {
		expect(validateDomain("google..com")).to.equal(false);
	});
	it("does not validate a domain with a trailing dot", () => {
		expect(validateDomain("google.com.")).to.equal(false);
	});
});

describe("buildDomainSuffixCandidates", () => {
	it("should return all suffix candidates for a multi-level domain, excluding the TLD", () => {
		const result = buildDomainSuffixCandidates("mail.fakemail.app");
		expect(result).toEqual(["mail.fakemail.app", "fakemail.app"]);
	});

	it("should return a single element for a two-level domain", () => {
		const result = buildDomainSuffixCandidates("fakemail.app");
		expect(result).toEqual(["fakemail.app"]);
	});

	it("should return an empty array for a domain without dots (TLD only)", () => {
		const result = buildDomainSuffixCandidates("localhost");
		expect(result).toEqual([]);
	});

	it("should return an empty array for an empty string", () => {
		const result = buildDomainSuffixCandidates("");
		expect(result).toEqual([]);
	});

	it("should handle deep subdomains correctly, excluding the TLD", () => {
		const result = buildDomainSuffixCandidates("a.b.c.d.example.com");
		expect(result).toEqual([
			"a.b.c.d.example.com",
			"b.c.d.example.com",
			"c.d.example.com",
			"d.example.com",
			"example.com",
		]);
	});

	it("should return an empty array for a domain with consecutive dots (empty label)", () => {
		const result = buildDomainSuffixCandidates("test..domain");
		expect(result).toEqual([]);
	});

	it("should strip a trailing dot (FQDN notation) and return valid candidates", () => {
		const result = buildDomainSuffixCandidates("example.com.");
		expect(result).toEqual(["example.com"]);
	});

	it("should return an empty array for a domain starting with a dot (empty label)", () => {
		const result = buildDomainSuffixCandidates(".example.com");
		expect(result).toEqual([]);
	});

	it("should normalize to lowercase", () => {
		const result = buildDomainSuffixCandidates("Mail.FakeMail.App");
		expect(result).toEqual(["mail.fakemail.app", "fakemail.app"]);
	});

	it("should trim surrounding whitespace before processing", () => {
		const result = buildDomainSuffixCandidates("  example.com  ");
		expect(result).toEqual(["example.com"]);
	});

	it("should return candidates in order from most specific to least specific", () => {
		const result = buildDomainSuffixCandidates("sub.domain.tld");
		expect(result[0]).toBe("sub.domain.tld");
		expect(result[result.length - 1]).toBe("domain.tld");
	});
});

describe("decodeGoogleTranslateHost", () => {
	it("decodes a simple two-label domain", () => {
		expect(decodeGoogleTranslateHost("prosopo-io.translate.goog")).toBe(
			"prosopo.io",
		);
	});

	it("decodes a domain with subdomains", () => {
		expect(decodeGoogleTranslateHost("www-example-com.translate.goog")).toBe(
			"www.example.com",
		);
	});

	it("decodes a domain containing a dash (double-dash encoding)", () => {
		expect(decodeGoogleTranslateHost("my--site-com.translate.goog")).toBe(
			"my-site.com",
		);
	});

	it("decodes a domain with mixed dashes and subdomains", () => {
		expect(decodeGoogleTranslateHost("foo-my--site-co-uk.translate.goog")).toBe(
			"foo.my-site.co.uk",
		);
	});

	it("is case-insensitive on the suffix", () => {
		expect(decodeGoogleTranslateHost("Prosopo-IO.Translate.Goog")).toBe(
			"prosopo.io",
		);
	});

	it("ignores a trailing dot on the FQDN", () => {
		expect(decodeGoogleTranslateHost("prosopo-io.translate.goog.")).toBe(
			"prosopo.io",
		);
	});

	it("returns null for non-translate.goog hosts", () => {
		expect(decodeGoogleTranslateHost("prosopo.io")).toBeNull();
		expect(decodeGoogleTranslateHost("translate.google.com")).toBeNull();
		expect(decodeGoogleTranslateHost("translate.goog")).toBeNull();
	});

	it("returns null for an empty encoded subdomain", () => {
		expect(decodeGoogleTranslateHost(".translate.goog")).toBeNull();
	});
});

describe("sanitisePageUrl", () => {
	it("keeps scheme, host, port and path", () => {
		expect(sanitisePageUrl("https://example.com/checkout/step-2")).toBe(
			"https://example.com/checkout/step-2",
		);
		expect(sanitisePageUrl("http://example.com:8080/a/b")).toBe(
			"http://example.com:8080/a/b",
		);
	});

	it("strips the query string and fragment", () => {
		expect(
			sanitisePageUrl("https://example.com/reset?token=secret#section"),
		).toBe("https://example.com/reset");
	});

	it("strips embedded credentials", () => {
		expect(sanitisePageUrl("https://user:pass@example.com/account")).toBe(
			"https://example.com/account",
		);
	});

	it("rejects non-http(s) schemes", () => {
		expect(sanitisePageUrl("javascript:alert(1)")).toBeUndefined();
		expect(sanitisePageUrl("data:text/html,<h1>x</h1>")).toBeUndefined();
		expect(sanitisePageUrl("ftp://example.com/file")).toBeUndefined();
	});

	it("returns undefined for missing or malformed input", () => {
		expect(sanitisePageUrl(undefined)).toBeUndefined();
		expect(sanitisePageUrl(null)).toBeUndefined();
		expect(sanitisePageUrl("")).toBeUndefined();
		expect(sanitisePageUrl("not a url")).toBeUndefined();
		expect(sanitisePageUrl("/relative/path")).toBeUndefined();
	});
});

describe("isProtectDeployment", () => {
	it("returns true when the iframe is on protect.<tenant> and the top frame is on the tenant", () => {
		expect(
			isProtectDeployment(
				"https://client.com/",
				"https://protect.client.com/widget",
			),
		).toBe(true);
	});

	it("returns true when the top frame is a subdomain of the tenant", () => {
		expect(
			isProtectDeployment(
				"https://www.client.com/",
				"https://protect.client.com/widget",
			),
		).toBe(true);
		expect(
			isProtectDeployment(
				"https://foo.client.com/",
				"https://protect.client.com/widget",
			),
		).toBe(true);
	});

	it("is case-insensitive on host", () => {
		expect(
			isProtectDeployment(
				"https://CLIENT.com/",
				"https://Protect.Client.COM/widget",
			),
		).toBe(true);
	});

	it("rejects hosts that share a suffix without a dot boundary", () => {
		expect(
			isProtectDeployment(
				"https://attackerclient.com/",
				"https://protect.client.com/widget",
			),
		).toBe(false);
	});

	it("rejects mismatched tenants", () => {
		expect(
			isProtectDeployment(
				"https://client.com/",
				"https://protect.other.com/widget",
			),
		).toBe(false);
	});

	it("rejects iframes not served from protect.<something>", () => {
		expect(
			isProtectDeployment(
				"https://client.com/",
				"https://widget.client.com/",
			),
		).toBe(false);
		expect(
			isProtectDeployment("https://client.com/", "https://client.com/widget"),
		).toBe(false);
	});

	it("rejects a bare protect. prefix with no tail", () => {
		// URL parser will normally reject these; guard both defensively.
		expect(
			isProtectDeployment("https://client.com/", "https://protect./widget"),
		).toBe(false);
	});

	it("returns false when either URL is missing or unparseable", () => {
		expect(
			isProtectDeployment(undefined, "https://protect.client.com/"),
		).toBe(false);
		expect(isProtectDeployment("https://client.com/", undefined)).toBe(false);
		expect(isProtectDeployment(null, null)).toBe(false);
		expect(
			isProtectDeployment("not a url", "https://protect.client.com/"),
		).toBe(false);
	});
});

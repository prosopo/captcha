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
import { buildDomainSuffixCandidates, validateDomain } from "../url.js";

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

	it("should handle domain with consecutive dots correctly", () => {
		const result = buildDomainSuffixCandidates("test..domain");
		expect(result).toEqual(["test..domain", ".domain"]);
	});

	it("should handle domain ending with a dot", () => {
		const result = buildDomainSuffixCandidates("example.com.");
		expect(result).toEqual(["example.com.", "com."]);
	});

	it("should handle domain starting with a dot", () => {
		const result = buildDomainSuffixCandidates(".example.com");
		expect(result).toEqual([".example.com", "example.com"]);
	});

	it("should return candidates in order from most specific to least specific", () => {
		const result = buildDomainSuffixCandidates("sub.domain.tld");
		expect(result[0]).toBe("sub.domain.tld");
		expect(result[result.length - 1]).toBe("domain.tld");
	});
});

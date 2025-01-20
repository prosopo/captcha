// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import { validateDomain } from "../url.js";

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

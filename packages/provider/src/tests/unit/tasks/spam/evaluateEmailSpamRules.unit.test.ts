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

import type { IEmailSpamRules } from "@prosopo/types";
import { describe, expect, it } from "vitest";
import {
	evaluateEmailSpamRules,
	normaliseGmailAddress,
} from "../../../../tasks/spam/evaluateEmailSpamRules.js";

const baseRules = (overrides: Partial<IEmailSpamRules> = {}): IEmailSpamRules => ({
	enabled: true,
	maxLocalPartDots: undefined,
	normaliseGmail: false,
	useDefaultPatterns: false,
	customRegexBlocklist: [],
	...overrides,
});

describe("evaluateEmailSpamRules", () => {
	it("returns not-spam when rules are undefined", () => {
		expect(evaluateEmailSpamRules("user@example.com", undefined)).toEqual({
			isSpam: false,
		});
	});

	it("returns not-spam when rules disabled", () => {
		const result = evaluateEmailSpamRules(
			"user@example.com",
			baseRules({ enabled: false, maxLocalPartDots: 0 }),
		);
		expect(result).toEqual({ isSpam: false });
	});

	it("returns not-spam when email is missing", () => {
		expect(evaluateEmailSpamRules(undefined, baseRules())).toEqual({
			isSpam: false,
		});
	});

	it("flags malformed emails", () => {
		const result = evaluateEmailSpamRules("not-an-email", baseRules());
		expect(result).toEqual({ isSpam: true, reason: "EMAIL_INVALID" });
	});

	it("rejects local parts with too many dots", () => {
		const result = evaluateEmailSpamRules(
			"b.u.eltame.ki.a@gmail.com",
			baseRules({ maxLocalPartDots: 2 }),
		);
		expect(result).toEqual({ isSpam: true, reason: "EMAIL_TOO_MANY_DOTS" });
	});

	it("allows local parts under the dot threshold", () => {
		const result = evaluateEmailSpamRules(
			"first.last@example.com",
			baseRules({ maxLocalPartDots: 2 }),
		);
		expect(result).toEqual({ isSpam: false });
	});

	it("matches the default many-dots pattern", () => {
		const result = evaluateEmailSpamRules(
			"r.s.s.l.l.mcl@gmail.com",
			baseRules({ useDefaultPatterns: true }),
		);
		expect(result.isSpam).toBe(true);
		if (result.isSpam) {
			expect(result.reason).toBe("EMAIL_MATCHED_DEFAULT_PATTERN");
		}
	});

	it("matches the default gmail random plus tag pattern", () => {
		const result = evaluateEmailSpamRules(
			"meredithgeronimo241+vkd38uoukd5@gmail.com",
			baseRules({ useDefaultPatterns: true }),
		);
		expect(result.isSpam).toBe(true);
		if (result.isSpam) {
			expect(result.reason).toBe("EMAIL_MATCHED_DEFAULT_PATTERN");
			expect(result.pattern).toBe("gmail-random-plus-tag");
		}
	});

	it("does not match default patterns for benign emails", () => {
		const result = evaluateEmailSpamRules(
			"alice@prosopo.io",
			baseRules({ useDefaultPatterns: true }),
		);
		expect(result).toEqual({ isSpam: false });
	});

	it("matches a custom regex against the raw address", () => {
		const result = evaluateEmailSpamRules(
			"someone@disposable.tld",
			baseRules({ customRegexBlocklist: ["@disposable\\.tld$"] }),
		);
		expect(result.isSpam).toBe(true);
		if (result.isSpam) {
			expect(result.reason).toBe("EMAIL_MATCHED_CUSTOM_PATTERN");
			expect(result.pattern).toBe("@disposable\\.tld$");
		}
	});

	it("ignores invalid custom regex without throwing", () => {
		const result = evaluateEmailSpamRules(
			"alice@example.com",
			baseRules({ customRegexBlocklist: ["[invalid("] }),
		);
		expect(result).toEqual({ isSpam: false });
	});

	it("matches custom regex against normalised gmail address when enabled", () => {
		// Without normalisation the dotted variant would not match the simple regex.
		const result = evaluateEmailSpamRules(
			"a.l.i.c.e@gmail.com",
			baseRules({
				normaliseGmail: true,
				customRegexBlocklist: ["^alice@gmail\\.com$"],
			}),
		);
		expect(result.isSpam).toBe(true);
		if (result.isSpam) {
			expect(result.reason).toBe("EMAIL_MATCHED_CUSTOM_PATTERN");
		}
	});
});

describe("normaliseGmailAddress", () => {
	it("strips dots and +tag from gmail addresses", () => {
		expect(normaliseGmailAddress("a.l.i.c.e+promo@gmail.com")).toBe(
			"alice@gmail.com",
		);
	});

	it("treats googlemail.com as gmail.com", () => {
		expect(normaliseGmailAddress("alice@googlemail.com")).toBe(
			"alice@gmail.com",
		);
	});

	it("leaves non-gmail addresses untouched (apart from case)", () => {
		expect(normaliseGmailAddress("Bob@Example.COM")).toBe("bob@example.com");
	});

	it("returns the original string when it can't be parsed", () => {
		expect(normaliseGmailAddress("not-an-email")).toBe("not-an-email");
	});
});

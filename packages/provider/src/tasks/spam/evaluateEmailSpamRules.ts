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

export type EmailSpamReason =
	| "EMAIL_INVALID"
	| "EMAIL_TOO_MANY_DOTS"
	| "EMAIL_MATCHED_DEFAULT_PATTERN"
	| "EMAIL_MATCHED_CUSTOM_PATTERN";

export type EmailSpamResult =
	| { isSpam: false }
	| { isSpam: true; reason: EmailSpamReason; pattern?: string };

const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

// Curated default patterns aimed at common evasion techniques.
// Kept conservative so legitimate users are unlikely to be caught.
export const DEFAULT_EMAIL_SPAM_PATTERNS: { name: string; pattern: RegExp }[] =
	[
		// More than 3 dots in the local part of any address (very common
		// evasion against systems that don't normalise gmail addresses).
		{
			name: "many-dots-local-part",
			pattern: /^[^@]*\.[^@]*\.[^@]*\.[^@]*\.[^@]*@/,
		},
		// Random alphanumeric suffix tags on gmail (e.g. +vkd38uoukd5).
		{
			name: "gmail-random-plus-tag",
			pattern: /^[^@+]+\+[a-z0-9]{6,}@(gmail|googlemail)\.com$/i,
		},
	];

const splitEmail = (email: string): { local: string; domain: string } | null => {
	const trimmed = email.trim().toLowerCase();
	const at = trimmed.lastIndexOf("@");
	if (at <= 0 || at === trimmed.length - 1) {
		return null;
	}
	return { local: trimmed.slice(0, at), domain: trimmed.slice(at + 1) };
};

/**
 * Removes dots and +tag suffixes from a gmail/googlemail local part.
 * Useful for treating x.y@gmail.com, xy@gmail.com, x.y+tag@gmail.com as the
 * same underlying account.
 */
export const normaliseGmailAddress = (email: string): string => {
	const parts = splitEmail(email);
	if (!parts) return email.trim().toLowerCase();
	if (!GMAIL_DOMAINS.has(parts.domain)) {
		return `${parts.local}@${parts.domain}`;
	}
	const stripped = parts.local.replace(/\./g, "").split("+")[0] ?? "";
	return `${stripped}@gmail.com`;
};

const countDots = (s: string): number => {
	let n = 0;
	for (const c of s) if (c === ".") n += 1;
	return n;
};

const compileRegex = (raw: string): RegExp | null => {
	try {
		return new RegExp(raw, "i");
	} catch {
		return null;
	}
};

/**
 * Synchronously evaluates an email against a site's email spam rules.
 * Returns { isSpam: false } if the rules are disabled, no email is supplied,
 * or no rule matched.
 */
export const evaluateEmailSpamRules = (
	email: string | undefined,
	rules: IEmailSpamRules | undefined,
): EmailSpamResult => {
	if (!rules || !rules.enabled || !email) {
		return { isSpam: false };
	}

	const parts = splitEmail(email);
	if (!parts) {
		return { isSpam: true, reason: "EMAIL_INVALID" };
	}

	if (
		typeof rules.maxLocalPartDots === "number" &&
		countDots(parts.local) > rules.maxLocalPartDots
	) {
		return { isSpam: true, reason: "EMAIL_TOO_MANY_DOTS" };
	}

	const target = rules.normaliseGmail
		? normaliseGmailAddress(`${parts.local}@${parts.domain}`)
		: `${parts.local}@${parts.domain}`;

	if (rules.useDefaultPatterns) {
		for (const { name, pattern } of DEFAULT_EMAIL_SPAM_PATTERNS) {
			if (pattern.test(`${parts.local}@${parts.domain}`)) {
				return {
					isSpam: true,
					reason: "EMAIL_MATCHED_DEFAULT_PATTERN",
					pattern: name,
				};
			}
		}
	}

	for (const raw of rules.customRegexBlocklist ?? []) {
		const regex = compileRegex(raw);
		if (regex && regex.test(target)) {
			return {
				isSpam: true,
				reason: "EMAIL_MATCHED_CUSTOM_PATTERN",
				pattern: raw,
			};
		}
	}

	return { isSpam: false };
};

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

import { type IEmailSpamRules, ResultReason } from "@prosopo/types";

export type EmailSpamReason =
	| ResultReason.EMAIL_INVALID
	| ResultReason.EMAIL_TOO_MANY_DOTS
	| ResultReason.EMAIL_MATCHED_DEFAULT_PATTERN
	| ResultReason.EMAIL_MATCHED_CUSTOM_PATTERN;

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

const splitEmail = (
	email: string,
): { local: string; domain: string } | null => {
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

/**
 * Normalises an email for equality-based rate-limit matching:
 *   - lowercases and trims
 *   - strips `+tag` from the local part for every domain (RFC 5233
 *     subaddressing is widely honoured — Gmail, Fastmail, iCloud, Outlook,
 *     ProtonMail — and rotating `+tag` suffixes is the cheapest evasion
 *     against per-address rate limits)
 *   - additionally removes dots from the local part for gmail /
 *     googlemail (Gmail is the only major provider that treats dots as
 *     insignificant)
 *
 * Returns the input trimmed/lowercased if it cannot be split into
 * local@domain. Never returns an empty string for a non-empty input.
 */
export const normaliseEmailForMatching = (email: string): string => {
	const parts = splitEmail(email);
	if (!parts) return email.trim().toLowerCase();
	// If the local part starts with `+` (degenerate) the split yields "";
	// fall back to the raw local so we don't collide every such address
	// under a single `""@domain` bucket.
	const beforePlus = parts.local.split("+")[0];
	const withoutPlusTag = beforePlus ? beforePlus : parts.local;
	if (GMAIL_DOMAINS.has(parts.domain)) {
		const withoutDots = withoutPlusTag.replace(/\./g, "");
		return `${withoutDots || withoutPlusTag}@gmail.com`;
	}
	return `${withoutPlusTag}@${parts.domain}`;
};

const countDots = (s: string): number => {
	let n = 0;
	for (const c of s) if (c === ".") n += 1;
	return n;
};

const regexCache = new Map<string, RegExp | null>();

const getCompiledRegex = (raw: string): RegExp | null => {
	const cached = regexCache.get(raw);
	if (cached !== undefined) {
		return cached;
	}
	let compiled: RegExp | null;
	try {
		compiled = new RegExp(raw, "i");
	} catch {
		compiled = null;
	}
	regexCache.set(raw, compiled);
	return compiled;
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
		return { isSpam: true, reason: ResultReason.EMAIL_INVALID };
	}

	if (
		typeof rules.maxLocalPartDots === "number" &&
		countDots(parts.local) > rules.maxLocalPartDots
	) {
		return { isSpam: true, reason: ResultReason.EMAIL_TOO_MANY_DOTS };
	}

	const target = rules.normaliseGmail
		? normaliseGmailAddress(`${parts.local}@${parts.domain}`)
		: `${parts.local}@${parts.domain}`;

	if (rules.useDefaultPatterns) {
		for (const { name, pattern } of DEFAULT_EMAIL_SPAM_PATTERNS) {
			if (pattern.test(`${parts.local}@${parts.domain}`)) {
				return {
					isSpam: true,
					reason: ResultReason.EMAIL_MATCHED_DEFAULT_PATTERN,
					pattern: name,
				};
			}
		}
	}

	for (const raw of rules.customRegexBlocklist ?? []) {
		const regex = getCompiledRegex(raw);
		if (regex?.test(target)) {
			return {
				isSpam: true,
				reason: ResultReason.EMAIL_MATCHED_CUSTOM_PATTERN,
				pattern: raw,
			};
		}
	}

	return { isSpam: false };
};

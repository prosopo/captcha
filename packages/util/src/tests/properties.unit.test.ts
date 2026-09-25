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
import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { extractDomainFromEmail } from "../email.js";
import { embedData, extractData } from "../hex.js";
import { decodeGoogleTranslateHost, parseUrl } from "../url.js";

const hexString = fc.integer({ min: 1, max: 64 }).chain((n) =>
	fc
		.array(fc.constantFrom(..."0123456789abcdef"), {
			minLength: n * 2,
			maxLength: n * 2,
		})
		.map((chars) => `0x${chars.join("")}`),
);

const label = fc.stringMatching(/^[a-z0-9]([a-z0-9-]{0,20}[a-z0-9])?$/);
const topLevelDomain = fc.stringMatching(/^[a-z]{2,6}$/);
const hostname = fc
	.tuple(fc.array(label, { minLength: 1, maxLength: 3 }), topLevelDomain)
	.map(([labels, tld]) => [...labels, tld].join("."));

const encodeGoogleTranslateHost = (host: string): string =>
	`${host.replace(/-/g, "--").replace(/\./g, "-")}.translate.goog`;

describe("hex embedData / extractData", () => {
	test("embedData refuses data that would overlap its own header", () => {
		expect(() =>
			embedData(
				`0x${"0".repeat(52)}`,
				[17592186044416, 281474976710656, 4503599627370496],
			),
		).toThrow(/exceeds length of hex string/);
	});

	test("extractData returns what embedData embedded, or embedData throws", () => {
		fc.assert(
			fc.property(
				hexString,
				fc.array(fc.nat({ max: Number.MAX_SAFE_INTEGER }), { maxLength: 8 }),
				(hex, data) => {
					let embedded: string;
					try {
						embedded = embedData(hex, data);
					} catch {
						return;
					}
					expect(embedded).toHaveLength(hex.length);
					expect(extractData(embedded)).toEqual(data);
				},
			),
		);
	});

	test("extractData returns numbers or throws an Error on any string", () => {
		fc.assert(
			fc.property(fc.string(), (input) => {
				try {
					const values = extractData(input);
					for (const v of values) expect(Number.isSafeInteger(v)).toBe(true);
				} catch (e) {
					expect(e).toBeInstanceOf(Error);
				}
			}),
		);
	});
});

describe("url helpers", () => {
	test("decodeGoogleTranslateHost inverts Google's encoding", () => {
		fc.assert(
			fc.property(hostname, (host) => {
				expect(decodeGoogleTranslateHost(encodeGoogleTranslateHost(host))).toBe(
					host,
				);
			}),
		);
	});

	test("decodeGoogleTranslateHost ignores other hosts", () => {
		fc.assert(
			fc.property(fc.string(), (host) => {
				fc.pre(
					!host.toLowerCase().replace(/\.$/, "").endsWith(".translate.goog"),
				);
				expect(decodeGoogleTranslateHost(host)).toBeNull();
			}),
		);
	});

	test("parseUrl keeps a plain hostname", () => {
		fc.assert(
			fc.property(hostname, (host) => {
				fc.pre(!host.startsWith("www."));
				expect(parseUrl(host).hostname).toBe(host);
				expect(parseUrl(`https://www.${host}`).hostname).toBe(host);
			}),
		);
	});

	test("parseUrl throws only Errors", () => {
		fc.assert(
			fc.property(fc.string(), (input) => {
				try {
					parseUrl(input);
				} catch (e) {
					expect(e).toBeInstanceOf(Error);
				}
			}),
		);
	});
});

describe("extractDomainFromEmail", () => {
	test("returns the lowercased part after the last @", () => {
		fc.assert(
			fc.property(fc.string(), hostname, (local, host) => {
				expect(extractDomainFromEmail(`${local}@${host.toUpperCase()}`)).toBe(
					host,
				);
			}),
		);
	});

	test("never returns an empty string or one containing @", () => {
		fc.assert(
			fc.property(fc.string(), (input) => {
				const domain = extractDomainFromEmail(input);
				if (domain === null) return;
				expect(domain.length).toBeGreaterThan(0);
				expect(domain).not.toContain("@");
				expect(domain).toBe(domain.trim().toLowerCase());
			}),
		);
	});
});

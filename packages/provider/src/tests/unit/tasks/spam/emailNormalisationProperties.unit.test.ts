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

import { getLogger } from "@prosopo/logger";
import fc from "fast-check";
import { describe, expect, test } from "vitest";
import {
	normaliseEmailForMatching,
	normaliseGmailAddress,
} from "../../../../tasks/spam/evaluateEmailSpamRules.js";
import { normalizeRequestIp } from "../../../../utils/normalizeRequestIp.js";

const logger = getLogger("fatal", "emailNormalisationProperties");

const localPart = fc.stringMatching(/^[a-zA-Z0-9._-]{1,20}$/);
const tag = fc.stringMatching(/^[a-zA-Z0-9._+-]{0,10}$/);
const domain = fc.oneof(
	fc.constantFrom("gmail.com", "googlemail.com", "GMail.com"),
	fc.stringMatching(/^[a-z0-9-]{1,10}\.[a-z]{2,6}$/),
);

describe("normaliseEmailForMatching", () => {
	test("is idempotent", () => {
		fc.assert(
			fc.property(fc.string(), (email) => {
				const once = normaliseEmailForMatching(email);
				expect(normaliseEmailForMatching(once)).toBe(once);
			}),
		);
	});

	test("ignores case, surrounding space and a +tag", () => {
		fc.assert(
			fc.property(localPart, tag, domain, (local, suffix, host) => {
				fc.pre(!local.startsWith("+"));
				const plain = normaliseEmailForMatching(`${local}@${host}`);
				expect(
					normaliseEmailForMatching(
						`  ${local.toUpperCase()}+${suffix}@${host.toUpperCase()} `,
					),
				).toBe(plain);
			}),
		);
	});

	test("never returns an empty string for a non-empty input", () => {
		fc.assert(
			fc.property(fc.string({ minLength: 1 }), (email) => {
				fc.pre(email.trim() !== "");
				expect(normaliseEmailForMatching(email)).not.toBe("");
			}),
		);
	});

	test("agrees with normaliseGmailAddress on gmail addresses with a real local part", () => {
		fc.assert(
			fc.property(
				fc.stringMatching(/^[a-z0-9]{1,10}(\.[a-z0-9]{1,10}){0,3}$/),
				tag,
				(local, suffix) => {
					const email = `${local}+${suffix}@googlemail.com`;
					expect(normaliseEmailForMatching(email)).toBe(
						normaliseGmailAddress(email),
					);
				},
			),
		);
	});
});

describe("normalizeRequestIp", () => {
	test("always returns a string", () => {
		fc.assert(
			fc.property(fc.anything(), (raw) => {
				expect(typeof normalizeRequestIp(raw, logger)).toBe("string");
			}),
		);
	});

	test("returns strings and address properties unchanged", () => {
		fc.assert(
			fc.property(fc.string(), (ip) => {
				expect(normalizeRequestIp(ip, logger)).toBe(ip);
				expect(normalizeRequestIp({ address: ip }, logger)).toBe(ip);
			}),
		);
	});
});

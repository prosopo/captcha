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

import type { AccountAttemptRecord } from "@prosopo/types-database";
import { describe, expect, it } from "vitest";
import { summariseAccountAttempts } from "../../../utils/accountAttempts.js";

const NOW = new Date("2026-10-29T12:00:00Z");

const attempt = (
	challenge: string,
	secondsAgo: number,
	passed: boolean,
	asn?: number,
): AccountAttemptRecord => ({
	challenge,
	account: "5Account",
	dappAccount: "5Dapp",
	captchaType: "puzzle",
	at: new Date(NOW.getTime() - secondsAgo * 1000),
	passed,
	...(asn !== undefined && { asn }),
});

describe("summariseAccountAttempts", () => {
	it("counts failures and describes the newest earlier attempt", () => {
		const attempts: AccountAttemptRecord[] = [
			attempt("c3", 40, false, 9009),
			attempt("c2", 100, false, 9009),
			attempt("c1", 300, true, 9009),
		];
		expect(summariseAccountAttempts(attempts, "current", NOW)).toEqual({
			accountFailures10m: 2,
			accountPrevAttemptAgeSeconds: 40,
			accountPrevAttemptFailed: true,
			accountPrevAttemptAsn: 9009,
		});
	});

	it("leaves out the attempt being verified and anything after it", () => {
		const attempts: AccountAttemptRecord[] = [
			attempt("later", -5, false, 1),
			attempt("current", 0, false, 2),
			attempt("earlier", 60, true, 3),
		];
		expect(summariseAccountAttempts(attempts, "current", NOW)).toEqual({
			accountFailures10m: 0,
			accountPrevAttemptAgeSeconds: 60,
			accountPrevAttemptFailed: false,
			accountPrevAttemptAsn: 3,
		});
	});

	it("reports zero failures and no previous attempt for a first visit", () => {
		expect(summariseAccountAttempts([], "current", NOW)).toEqual({
			accountFailures10m: 0,
		});
	});

	it("omits the previous ASN when the earlier attempt had no IP info", () => {
		const fields = summariseAccountAttempts(
			[attempt("c1", 30, false)],
			"current",
			NOW,
		);
		expect(fields).toEqual({
			accountFailures10m: 1,
			accountPrevAttemptAgeSeconds: 30,
			accountPrevAttemptFailed: true,
		});
		expect("accountPrevAttemptAsn" in fields).toBe(false);
	});

	it("picks the newest earlier attempt even when the input is unsorted", () => {
		const attempts: AccountAttemptRecord[] = [
			attempt("old", 500, true, 1),
			attempt("newest", 20, false, 2),
			attempt("middle", 200, true, 3),
		];
		const fields = summariseAccountAttempts(attempts, "current", NOW);
		expect(fields.accountPrevAttemptAsn).toBe(2);
		expect(fields.accountPrevAttemptAgeSeconds).toBe(20);
	});
});

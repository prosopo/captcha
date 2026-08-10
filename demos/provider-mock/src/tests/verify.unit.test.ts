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

import { describe, expect, test } from "vitest";
import {
	NOT_VERIFIED_MESSAGE,
	TEST_ACCOUNT,
	TEST_COMMITMENT_ID,
	TEST_DAPP,
	VERIFIED_MESSAGE,
	type VerificationOutcome,
	verifyProcaptchaOutput,
} from "../verify.js";
import { createOutput } from "./fixtures.js";

describe("verifyProcaptchaOutput", () => {
	test("approves the test account", () => {
		const outcome: VerificationOutcome = verifyProcaptchaOutput(
			createOutput({ user: TEST_ACCOUNT, dapp: "other" }),
		);
		expect(outcome).toEqual({
			statusMessage: VERIFIED_MESSAGE,
			verified: true,
			commitmentId: TEST_COMMITMENT_ID,
		});
	});

	test("approves the test dapp", () => {
		expect(
			verifyProcaptchaOutput(createOutput({ user: "other", dapp: TEST_DAPP }))
				.verified,
		).toBe(true);
	});

	test("approves the test commitment", () => {
		expect(
			verifyProcaptchaOutput(
				createOutput({
					user: "other",
					dapp: "other",
					commitmentId: TEST_COMMITMENT_ID,
				}),
			).verified,
		).toBe(true);
	});

	test("any one fixture is enough — a token never carries all three", () => {
		// Requiring every field to match would approve nothing at all, since
		// commitmentId is optional in a decoded token.
		const outcome = verifyProcaptchaOutput(
			createOutput({
				user: TEST_ACCOUNT,
				dapp: "other",
				commitmentId: "other",
			}),
		);
		expect(outcome.verified).toBe(true);
	});

	test("rejects a token that matches nothing", () => {
		expect(
			verifyProcaptchaOutput(
				createOutput({ user: "someone", dapp: "elsewhere" }),
			),
		).toEqual({ statusMessage: NOT_VERIFIED_MESSAGE, verified: false });
	});

	test("a rejection carries no commitment id", () => {
		// Returning the test commitment alongside verified:false would let a
		// caller that only reads commitmentId treat a rejection as a pass.
		expect(
			verifyProcaptchaOutput(
				createOutput({ user: "someone", dapp: "elsewhere" }),
			).commitmentId,
		).toBeUndefined();
	});

	test("empty fields do not match", () => {
		// An absent field decodes to "", which must not satisfy a comparison.
		expect(
			verifyProcaptchaOutput(
				createOutput({ user: "", dapp: "", commitmentId: "" }),
			).verified,
		).toBe(false);
	});

	test("an absent commitment id does not match", () => {
		expect(
			verifyProcaptchaOutput(
				createOutput({ user: "a", dapp: "b", commitmentId: undefined }),
			).verified,
		).toBe(false);
	});

	test("matching is exact, not a prefix", () => {
		expect(
			verifyProcaptchaOutput(
				createOutput({ user: `${TEST_ACCOUNT}x`, dapp: "other" }),
			).verified,
		).toBe(false);
		expect(
			verifyProcaptchaOutput(
				createOutput({ user: TEST_ACCOUNT.slice(0, -1), dapp: "other" }),
			).verified,
		).toBe(false);
	});

	test("matching is case sensitive", () => {
		expect(
			verifyProcaptchaOutput(
				createOutput({ user: TEST_ACCOUNT.toLowerCase(), dapp: "other" }),
			).verified,
		).toBe(false);
	});

	test("the fixtures are the ones the integration suites sign with", () => {
		// Pinned: changing either address silently stops every integration test
		// from being approved.
		expect(TEST_ACCOUNT).toBe(
			"5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
		);
		expect(TEST_DAPP).toBe("5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqi1eSuyUpnhM");
		expect(TEST_COMMITMENT_ID).toBe("0x123456789test");
	});

	test("does not mutate the output it was given", () => {
		const output = createOutput();
		const before = structuredClone(output);
		verifyProcaptchaOutput(output);
		expect(output).toEqual(before);
	});
});

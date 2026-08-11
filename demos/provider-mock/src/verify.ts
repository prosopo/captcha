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

import type { ProcaptchaOutput } from "@prosopo/types";

/**
 * The fixtures this mock provider treats as already verified.
 *
 * They are the accounts and commitment the integration suites sign with; any
 * token carrying one of them is approved without a captcha ever being solved,
 * which is the whole point of the mock.
 */
export const TEST_COMMITMENT_ID = "0x123456789test";
export const TEST_ACCOUNT = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
export const TEST_DAPP = "5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqi1eSuyUpnhM";

export const VERIFIED_MESSAGE = "API.USER_VERIFIED";
export const NOT_VERIFIED_MESSAGE = "API.USER_NOT_VERIFIED";

/** The body of a verification response, before translation of the status. */
export interface VerificationOutcome {
	statusMessage: string;
	verified: boolean;
	commitmentId?: string;
}

/**
 * Decide whether a decoded token counts as verified.
 *
 * Any one of the three fixtures matching is enough — a token only carries the
 * fields the client filled in, so requiring all three would never approve.
 * Empty strings are not matches: an absent field decodes to "" and must not be
 * able to satisfy a comparison against a fixture.
 */
export const verifyProcaptchaOutput = (
	output: Pick<ProcaptchaOutput, "user" | "dapp" | "commitmentId">,
): VerificationOutcome => {
	const matched =
		output.user === TEST_ACCOUNT ||
		output.commitmentId === TEST_COMMITMENT_ID ||
		output.dapp === TEST_DAPP;

	if (!matched) {
		return { statusMessage: NOT_VERIFIED_MESSAGE, verified: false };
	}

	return {
		statusMessage: VERIFIED_MESSAGE,
		verified: true,
		commitmentId: TEST_COMMITMENT_ID,
	};
};

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

import type { DecisionMachineInput } from "@prosopo/types";
import type { AccountAttemptRecord } from "@prosopo/types-database";

export const ACCOUNT_HISTORY_WINDOW_MS = 10 * 60 * 1000;

// The verify path sits behind a 5s siteverify timeout; this read is a hint,
// so it gives up long before it could matter.
export const ACCOUNT_HISTORY_TIMEOUT_MS = 250;

export type AccountHistoryFields = Pick<
	DecisionMachineInput,
	| "accountFailures10m"
	| "accountPrevAttemptAgeSeconds"
	| "accountPrevAttemptFailed"
	| "accountPrevAttemptAsn"
>;

/**
 * Turns an account's recent attempts (newest first) into decision-machine
 * fields, leaving out the attempt being verified and anything from its own
 * moment or later.
 */
export const summariseAccountAttempts = (
	attempts: AccountAttemptRecord[],
	currentChallenge: string,
	currentAt: Date,
): AccountHistoryFields => {
	const prior = attempts.filter(
		(attempt) =>
			attempt.challenge !== currentChallenge &&
			attempt.at.getTime() < currentAt.getTime(),
	);
	const fields: AccountHistoryFields = {
		accountFailures10m: prior.filter((attempt) => !attempt.passed).length,
	};
	const previous = prior.reduce<AccountAttemptRecord | undefined>(
		(newest, attempt) =>
			!newest || attempt.at.getTime() > newest.at.getTime() ? attempt : newest,
		undefined,
	);
	if (!previous) {
		return fields;
	}
	return {
		...fields,
		accountPrevAttemptAgeSeconds: Math.round(
			(currentAt.getTime() - previous.at.getTime()) / 1000,
		),
		accountPrevAttemptFailed: !previous.passed,
		...(previous.asn !== undefined && { accountPrevAttemptAsn: previous.asn }),
	};
};

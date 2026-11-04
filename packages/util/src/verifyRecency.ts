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

import { parseInteger } from "./parse.js";

/**
 * Verify the time since the blockNumber is equal to or less than the maxVerifiedTime.
 * @param challenge
 * @param maxVerifiedTime
 */
export const verifyRecency = (challenge: string, maxVerifiedTime: number) => {
	// Get the timestamp from the challenge
	const timestamp = challenge.split("___")[0];

	if (!timestamp) {
		return false;
	}

	// A malformed timestamp is never recent. parseInt would read "12abc" as 12.
	const challengeTimestamp = parseInteger(timestamp, { min: 0 });
	if (!challengeTimestamp.ok) {
		return false;
	}
	return Date.now() - challengeTimestamp.value <= maxVerifiedTime;
};

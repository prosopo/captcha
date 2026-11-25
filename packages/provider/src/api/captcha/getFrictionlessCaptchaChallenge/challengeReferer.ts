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

const PROTECT_CHALLENGE_PATH = "/api/protect/challenge";

export const isProtectChallengeReferer = (
	referer: string | undefined,
): boolean => {
	if (!referer) return false;
	let pathname: string;
	try {
		pathname = new URL(referer).pathname;
	} catch {
		return false;
	}
	return (
		pathname === PROTECT_CHALLENGE_PATH ||
		pathname.startsWith(`${PROTECT_CHALLENGE_PATH}/`)
	);
};

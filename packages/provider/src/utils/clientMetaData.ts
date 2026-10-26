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

import type { ClientMetaData } from "@prosopo/types";

/**
 * Narrows the widget-supplied `clientMetaData` to the fields we persist,
 * dropping empty values so a record never gains an all-undefined subdocument.
 * Returns undefined when there is nothing worth writing, which lets callers
 * spread the result conditionally.
 *
 * Kept as one function so the captcha record and the session record (which
 * both carry `clientMetaData`) always store the same shape, and so a new
 * render-time metadata field only has to be added here.
 */
export const toStoredClientMetaData = (
	clientMetaData?: ClientMetaData,
): ClientMetaData | undefined => {
	const stored: ClientMetaData = {
		...(clientMetaData?.hp && { hp: clientMetaData.hp }),
		...(clientMetaData?.clientSessionId && {
			clientSessionId: clientMetaData.clientSessionId,
		}),
	};

	return Object.keys(stored).length > 0 ? stored : undefined;
};

/**
 * Compares the `clientSessionId` the dapp server supplied at verify time
 * against the one the widget recorded when the captcha was solved.
 *
 * Returns true only when the site asked for a correlation (`expected` set) and
 * the solve does not carry exactly that value — including the case where the
 * solve carries no session id at all, which is what a token minted outside the
 * site's session (or by an older widget) looks like.
 */
export const isClientSessionMismatch = (
	expected: string | undefined,
	recorded: string | undefined,
): boolean => {
	if (!expected) return false;
	return recorded !== expected;
};

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

import type { Session } from "@prosopo/types";
import type { IProviderDatabase } from "@prosopo/types-database";

export type RefreshLineage = Required<
	Pick<Session, "refreshOf" | "refreshCount" | "refreshedAfterMs">
>;

/**
 * Work out where a refresh sits in its chain from the session it replaced.
 *
 * An unknown session, or one from another site, is ignored rather than
 * rejected: the request then mints an ordinary session, which is all a client
 * that never sent `refreshOf` would have got.
 */
export const resolveRefreshLineage = async (
	db: Pick<IProviderDatabase, "getSessionRecordBySessionId">,
	refreshOf: string | undefined,
	siteKey: string,
	now: Date,
): Promise<RefreshLineage | undefined> => {
	if (!refreshOf) return undefined;
	const replaced = await db.getSessionRecordBySessionId(refreshOf);
	if (!replaced || replaced.siteKey !== siteKey) return undefined;
	return {
		refreshOf,
		refreshCount: (replaced.refreshCount ?? 0) + 1,
		refreshedAfterMs: Math.max(
			0,
			now.getTime() - new Date(replaced.createdAt).getTime(),
		),
	};
};

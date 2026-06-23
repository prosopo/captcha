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

import type { Logger } from "@prosopo/logger";
import type { Session } from "@prosopo/types";
import type { Tasks } from "../../../tasks/index.js";

export type SessionDedupResult = {
	sessionId: string;
	captchaType: string;
	session: Session;
};

export type ResolveSessionDedupOutcome = {
	existingToken: Awaited<ReturnType<Tasks["db"]["getSessionRecordByToken"]>>;
	dedup: SessionDedupResult | null;
};

// Mongo is authoritative: getSessionByuserSitekeyIpHash filters on
// `deleted: { $exists: false }`. Redis is NOT consulted for dedup —
// a concurrent /captcha/{type} can invalidate while a concurrent /frictionless
// races a fire-and-forget repopulation in after, leaving Redis pointing at a
// dead session for the full TTL.
export const resolveSessionDedup = async (
	tasks: Tasks,
	token: string,
	userSitekeyIpHash: string,
	logger: Logger,
): Promise<ResolveSessionDedupOutcome> => {
	const [existingToken, existingSession] = await Promise.all([
		tasks.db.getSessionRecordByToken(token),
		tasks.db.getSessionByuserSitekeyIpHash(userSitekeyIpHash),
	]);

	const dedup: SessionDedupResult | null = existingSession
		? {
				sessionId: existingSession.sessionId,
				captchaType: existingSession.captchaType,
				session: existingSession,
			}
		: null;

	// Evict a stale Redis hash → sessionId pointer when Mongo says no live session.
	if (!dedup && tasks.writeQueue) {
		const stalePointer =
			await tasks.writeQueue.getCachedSessionByHash(userSitekeyIpHash);
		if (stalePointer) {
			logger.warn(() => ({
				msg: "Evicting stale Redis dedup pointer",
				data: { userSitekeyIpHash, staleSessionId: stalePointer },
			}));
			await Promise.all([
				tasks.writeQueue.invalidateCachedSessionByHash(userSitekeyIpHash),
				tasks.writeQueue.invalidateCachedSession(stalePointer),
			]);
		}
	}

	return { existingToken, dedup };
};

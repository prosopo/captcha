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

import { CaptchaType, FrictionlessReason, type Session } from "@prosopo/types";
import type { IProviderDatabase } from "@prosopo/types-database";
import { parseDate } from "@prosopo/util";
import { PUZZLE_REFRESHES_BEFORE_IMAGE } from "../../../tasks/captchaTypeSelection.js";

export type RefreshLineage = Required<
	Pick<Session, "refreshOf" | "refreshCount" | "refreshedAfterMs">
>;

export interface ResolvedRefresh {
	lineage: RefreshLineage;
	replaced: Pick<Session, "captchaType" | "reason">;
}

/**
 * Work out where a refresh sits in its chain from the session it replaced.
 *
 * Only a session served to this same user, IP and site can be extended, so
 * the chain's length and timing come from the provider's own records: a
 * client can leave a chain, but cannot borrow someone else's. Anything else,
 * including a session whose createdAt cannot be read, is ignored rather than
 * rejected: the request then mints an ordinary session, which is all a client
 * that never sent `refreshOf` would have got.
 */
export const resolveRefreshLineage = async ({
	db,
	refreshOf,
	siteKey,
	userSitekeyIpHash,
	now,
}: {
	db: Pick<IProviderDatabase, "getSessionRecordBySessionId">;
	refreshOf?: string;
	siteKey: string;
	userSitekeyIpHash: string;
	now: Date;
}): Promise<ResolvedRefresh | undefined> => {
	if (!refreshOf) return undefined;
	const replaced = await db.getSessionRecordBySessionId(refreshOf);
	if (
		!replaced ||
		replaced.siteKey !== siteKey ||
		replaced.userSitekeyIpHash !== userSitekeyIpHash
	) {
		return undefined;
	}
	// A missing or unparseable createdAt would make refreshedAfterMs NaN,
	// which Math.max passes straight through. Such a record is ignored like
	// an unknown one rather than given a made-up age.
	const createdAt = parseDate(replaced.createdAt);
	if (!createdAt.ok) return undefined;
	return {
		lineage: {
			refreshOf,
			refreshCount: (replaced.refreshCount ?? 0) + 1,
			refreshedAfterMs: Math.max(0, now.getTime() - createdAt.value.getTime()),
		},
		replaced: { captchaType: replaced.captchaType, reason: replaced.reason },
	};
};

export interface RefreshSwitchRequest {
	switchToImage?: boolean;
	switchToPuzzle?: boolean;
}

/**
 * Whether this request should be served the image challenge the user chose
 * over their puzzle, on a site with the switch enabled. Either they press the
 * switch on a puzzle now, or they chose image earlier in this chain and are
 * refreshing that image rather than pressing the switch back.
 */
export const isUserImageChoiceActive = (
	request: RefreshSwitchRequest,
	refresh: ResolvedRefresh | undefined,
	switchEnabled: boolean,
): boolean => {
	if (!switchEnabled || !refresh) return false;
	const { captchaType, reason } = refresh.replaced;
	if (CaptchaType.puzzle === captchaType) {
		return true === request.switchToImage;
	}
	return (
		CaptchaType.image === captchaType &&
		FrictionlessReason.PUZZLE_USER_SWITCH === reason &&
		true !== request.switchToPuzzle
	);
};

/**
 * Whether an image session may offer the switch back to a puzzle: only an
 * image the user switched to themselves, and only while going back would not
 * run straight into the refresh limit and hand them another image.
 */
export const isPuzzleSwitchBackAvailable = (
	session: Pick<Session, "reason" | "refreshCount"> | undefined,
	switchEnabled: boolean,
): boolean =>
	switchEnabled &&
	FrictionlessReason.PUZZLE_USER_SWITCH === session?.reason &&
	(session.refreshCount ?? 0) + 1 < PUZZLE_REFRESHES_BEFORE_IMAGE;

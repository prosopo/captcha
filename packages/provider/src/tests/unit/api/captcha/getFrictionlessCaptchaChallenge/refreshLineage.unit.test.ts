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
import type { ProjectedSession } from "@prosopo/types-database";
import { describe, expect, it, vi } from "vitest";
import {
	type ResolvedRefresh,
	isPuzzleSwitchBackAvailable,
	isUserImageChoiceActive,
	resolveRefreshLineage,
} from "../../../../../api/captcha/getFrictionlessCaptchaChallenge/refreshLineage.js";
import { PUZZLE_REFRESHES_BEFORE_IMAGE } from "../../../../../tasks/captchaTypeSelection.js";

const SITE_KEY = "5EjTA28bKSbFPPyMbUjNtArxyqjwq38r1BapVmLZShaqEedV";
const USER_HASH = "user-site-ip-hash";
const NOW = new Date("2026-09-28T12:00:00Z");

const dbReturning = (
	session: Partial<ProjectedSession> | undefined,
): {
	getSessionRecordBySessionId: (
		sessionId: string,
	) => Promise<ProjectedSession | undefined>;
} => ({
	getSessionRecordBySessionId: vi.fn(
		async (): Promise<ProjectedSession | undefined> =>
			session as ProjectedSession | undefined,
	),
});

const ownSession = (
	session: Partial<ProjectedSession>,
): Partial<ProjectedSession> => ({
	siteKey: SITE_KEY,
	userSitekeyIpHash: USER_HASH,
	...session,
});

describe("resolveRefreshLineage", () => {
	it("returns nothing when the request is not a refresh", async () => {
		const db = dbReturning(ownSession({ createdAt: NOW }));
		expect(
			await resolveRefreshLineage(db, undefined, SITE_KEY, USER_HASH, NOW),
		).toBeUndefined();
		expect(db.getSessionRecordBySessionId).not.toHaveBeenCalled();
	});

	it("starts a chain at one from a session that was never refreshed", async () => {
		const db = dbReturning(
			ownSession({ createdAt: new Date(NOW.getTime() - 4000) }),
		);
		expect(
			(await resolveRefreshLineage(db, "prev", SITE_KEY, USER_HASH, NOW))
				?.lineage,
		).toEqual({
			refreshOf: "prev",
			refreshCount: 1,
			refreshedAfterMs: 4000,
		});
	});

	it("extends an existing chain", async () => {
		const db = dbReturning(ownSession({ createdAt: NOW, refreshCount: 2 }));
		expect(
			(await resolveRefreshLineage(db, "prev", SITE_KEY, USER_HASH, NOW))
				?.lineage.refreshCount,
		).toBe(3);
	});

	it("carries what the replaced session was served and why", async () => {
		const db = dbReturning(
			ownSession({
				createdAt: NOW,
				captchaType: CaptchaType.image,
				reason: FrictionlessReason.PUZZLE_USER_SWITCH,
			}),
		);
		expect(
			(await resolveRefreshLineage(db, "prev", SITE_KEY, USER_HASH, NOW))
				?.replaced,
		).toEqual({
			captchaType: CaptchaType.image,
			reason: FrictionlessReason.PUZZLE_USER_SWITCH,
		});
	});

	it("ignores a session it cannot find", async () => {
		expect(
			await resolveRefreshLineage(
				dbReturning(undefined),
				"gone",
				SITE_KEY,
				USER_HASH,
				NOW,
			),
		).toBeUndefined();
	});

	it("ignores a session from another site", async () => {
		const db = dbReturning(
			ownSession({ siteKey: "another-site", createdAt: NOW, refreshCount: 9 }),
		);
		expect(
			await resolveRefreshLineage(db, "prev", SITE_KEY, USER_HASH, NOW),
		).toBeUndefined();
	});

	it("ignores a session served to another user or IP", async () => {
		const db = dbReturning(
			ownSession({
				userSitekeyIpHash: "someone-else",
				createdAt: NOW,
				refreshCount: 9,
			}),
		);
		expect(
			await resolveRefreshLineage(db, "prev", SITE_KEY, USER_HASH, NOW),
		).toBeUndefined();
	});

	it("ignores a session that recorded no user", async () => {
		const db = dbReturning({ siteKey: SITE_KEY, createdAt: NOW });
		expect(
			await resolveRefreshLineage(db, "prev", SITE_KEY, USER_HASH, NOW),
		).toBeUndefined();
	});
});

describe("isUserImageChoiceActive", () => {
	const refreshOf = (
		captchaType: CaptchaType,
		reason?: FrictionlessReason,
	): ResolvedRefresh => ({
		lineage: { refreshOf: "prev", refreshCount: 1, refreshedAfterMs: 1000 },
		replaced: { captchaType, ...(reason && { reason }) },
	});
	const switchedImage = refreshOf(
		CaptchaType.image,
		FrictionlessReason.PUZZLE_USER_SWITCH,
	);

	it("honours a switch from a puzzle on a site with it enabled", () => {
		expect(
			isUserImageChoiceActive(
				{ switchToImage: true },
				refreshOf(CaptchaType.puzzle),
				true,
			),
		).toBe(true);
	});

	it("ignores a switch the user did not ask for", () => {
		expect(
			isUserImageChoiceActive({}, refreshOf(CaptchaType.puzzle), true),
		).toBe(false);
		expect(
			isUserImageChoiceActive(
				{ switchToImage: false },
				refreshOf(CaptchaType.puzzle),
				true,
			),
		).toBe(false);
	});

	it("ignores a switch on a site without it enabled", () => {
		expect(
			isUserImageChoiceActive(
				{ switchToImage: true },
				refreshOf(CaptchaType.puzzle),
				false,
			),
		).toBe(false);
	});

	it("ignores a switch that is not a refresh of a known session", () => {
		expect(
			isUserImageChoiceActive({ switchToImage: true }, undefined, true),
		).toBe(false);
	});

	it("ignores a switch away from a routed image or a PoW", () => {
		for (const type of [CaptchaType.image, CaptchaType.pow]) {
			expect(
				isUserImageChoiceActive({ switchToImage: true }, refreshOf(type), true),
			).toBe(false);
		}
	});

	it("keeps the user's image when they refresh it", () => {
		expect(isUserImageChoiceActive({}, switchedImage, true)).toBe(true);
	});

	it("drops the user's image when they switch back", () => {
		expect(
			isUserImageChoiceActive({ switchToPuzzle: true }, switchedImage, true),
		).toBe(false);
	});

	it("drops the user's image once the site turns the switch off", () => {
		expect(isUserImageChoiceActive({}, switchedImage, false)).toBe(false);
	});

	it("does not hold an image the refresh limit chose", () => {
		expect(
			isUserImageChoiceActive(
				{},
				refreshOf(CaptchaType.image, FrictionlessReason.PUZZLE_REFRESH_LIMIT),
				true,
			),
		).toBe(false);
	});
});

describe("isPuzzleSwitchBackAvailable", () => {
	const switched = (
		refreshCount: number,
	): Pick<Session, "reason" | "refreshCount"> => ({
		reason: FrictionlessReason.PUZZLE_USER_SWITCH,
		refreshCount,
	});

	it("offers the way back on an image the user switched to", () => {
		expect(isPuzzleSwitchBackAvailable(switched(1), true)).toBe(true);
	});

	it("does not offer it once going back would hit the refresh limit", () => {
		expect(
			isPuzzleSwitchBackAvailable(
				switched(PUZZLE_REFRESHES_BEFORE_IMAGE - 1),
				true,
			),
		).toBe(false);
	});

	it("does not offer it on an image the user did not choose", () => {
		expect(
			isPuzzleSwitchBackAvailable(
				{ reason: FrictionlessReason.PUZZLE_REFRESH_LIMIT, refreshCount: 1 },
				true,
			),
		).toBe(false);
		expect(isPuzzleSwitchBackAvailable(undefined, true)).toBe(false);
	});

	it("does not offer it on a site without the switch", () => {
		expect(isPuzzleSwitchBackAvailable(switched(1), false)).toBe(false);
	});
});

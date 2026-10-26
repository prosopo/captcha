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

import { CaptchaType } from "@prosopo/types";
import type { ProjectedSession } from "@prosopo/types-database";
import { describe, expect, it, vi } from "vitest";
import {
	type ResolvedRefresh,
	isImageSwitchRequestValid,
	resolveRefreshLineage,
} from "../../../../../api/captcha/getFrictionlessCaptchaChallenge/refreshLineage.js";

const SITE_KEY = "5EjTA28bKSbFPPyMbUjNtArxyqjwq38r1BapVmLZShaqEedV";
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

describe("resolveRefreshLineage", () => {
	it("returns nothing when the request is not a refresh", async () => {
		const db = dbReturning({ siteKey: SITE_KEY, createdAt: NOW });
		expect(
			await resolveRefreshLineage(db, undefined, SITE_KEY, NOW),
		).toBeUndefined();
		expect(db.getSessionRecordBySessionId).not.toHaveBeenCalled();
	});

	it("starts a chain at one from a session that was never refreshed", async () => {
		const db = dbReturning({
			siteKey: SITE_KEY,
			createdAt: new Date(NOW.getTime() - 4000),
		});
		expect(
			(await resolveRefreshLineage(db, "prev", SITE_KEY, NOW))?.lineage,
		).toEqual({
			refreshOf: "prev",
			refreshCount: 1,
			refreshedAfterMs: 4000,
		});
	});

	it("extends an existing chain", async () => {
		const db = dbReturning({
			siteKey: SITE_KEY,
			createdAt: NOW,
			refreshCount: 2,
		});
		expect(
			(await resolveRefreshLineage(db, "prev", SITE_KEY, NOW))?.lineage
				.refreshCount,
		).toBe(3);
	});

	it("ignores a session it cannot find", async () => {
		expect(
			await resolveRefreshLineage(
				dbReturning(undefined),
				"gone",
				SITE_KEY,
				NOW,
			),
		).toBeUndefined();
	});

	it("ignores a session from another site", async () => {
		const db = dbReturning({
			siteKey: "another-site",
			createdAt: NOW,
			refreshCount: 9,
		});
		expect(
			await resolveRefreshLineage(db, "prev", SITE_KEY, NOW),
		).toBeUndefined();
	});
});

describe("isImageSwitchRequestValid", () => {
	const refreshOf = (replacedCaptchaType: CaptchaType): ResolvedRefresh => ({
		lineage: { refreshOf: "prev", refreshCount: 1, refreshedAfterMs: 1000 },
		replacedCaptchaType,
	});

	it("honours a switch from a puzzle on a site with it enabled", () => {
		expect(
			isImageSwitchRequestValid(true, refreshOf(CaptchaType.puzzle), true),
		).toBe(true);
	});

	it("ignores a switch the user did not ask for", () => {
		expect(
			isImageSwitchRequestValid(undefined, refreshOf(CaptchaType.puzzle), true),
		).toBe(false);
		expect(
			isImageSwitchRequestValid(false, refreshOf(CaptchaType.puzzle), true),
		).toBe(false);
	});

	it("ignores a switch on a site without it enabled", () => {
		expect(
			isImageSwitchRequestValid(true, refreshOf(CaptchaType.puzzle), false),
		).toBe(false);
	});

	it("ignores a switch that is not a refresh of a known session", () => {
		expect(isImageSwitchRequestValid(true, undefined, true)).toBe(false);
	});

	it("ignores a switch away from anything but a puzzle", () => {
		for (const type of [CaptchaType.image, CaptchaType.pow]) {
			expect(isImageSwitchRequestValid(true, refreshOf(type), true)).toBe(
				false,
			);
		}
	});
});

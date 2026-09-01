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

import { stringToHex, u8aToHex } from "@polkadot/util";
import { GlyphKind, type IconPlacement } from "@prosopo/icon-order-assets";
import {
	CaptchaStatus,
	CaptchaType,
	type IconOrderCaptchaStored,
	type KeyringPair,
	type PoWChallengeId,
	type RequestHeaders,
	ResultReason,
	type StoredIconTarget,
	iconOrderToleranceDefault,
} from "@prosopo/types";
import type {
	IProviderDatabase,
	IconOrderCaptchaRecord,
} from "@prosopo/types-database";
import type { ProviderEnvironment } from "@prosopo/types-env";
import { getIPAddress, verifyRecency } from "@prosopo/util";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RenderedIconOrderImages } from "../../../../tasks/iconOrder/iconOrderRenderer.js";
import { IconOrderCaptchaManager } from "../../../../tasks/iconOrderCaptcha/iconOrderTasks.js";
import { checkPowSignature } from "../../../../tasks/powCaptcha/powTasksUtils.js";

vi.mock("@polkadot/util", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@polkadot/util")>();
	return { ...actual, u8aToHex: vi.fn(), stringToHex: vi.fn() };
});

vi.mock("@prosopo/util", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@prosopo/util")>();
	return { ...actual, verifyRecency: vi.fn() };
});

vi.mock("../../../../tasks/powCaptcha/powTasksUtils.js", () => ({
	checkPowSignature: vi.fn(),
}));

// The tests only care about a handful of stored fields; this widens a partial
// fixture without a cast at every mock call site. `submittedAtTimestamp`
// defaults to now because the shared verify pipeline reads it directly and
// treats a missing value as infinitely old.
const asRecord = (
	partial: Partial<IconOrderCaptchaStored>,
): IconOrderCaptchaRecord =>
	({
		submittedAtTimestamp: new Date(),
		...partial,
	}) as unknown as IconOrderCaptchaRecord;

const targets: StoredIconTarget[] = [
	{ x: 60, y: 50, size: 38, kind: GlyphKind.ring },
	{ x: 180, y: 90, size: 38, kind: GlyphKind.star },
	{ x: 240, y: 150, size: 38, kind: GlyphKind.bolt },
];

/**
 * The stored shape drops rotation and hue, which the renderer's own placements
 * carry; add them back so the fixture matches what `renderIconOrderImages`
 * really hands over.
 */
const asPlacements = (): IconPlacement[] =>
	targets.map((target) => ({
		...target,
		kind: target.kind as GlyphKind,
		rotation: 0,
		hue: 0,
	}));

const renderedImages = (): RenderedIconOrderImages => ({
	background: "data:image/webp;base64,BG",
	legend: "data:image/webp;base64,LEGEND",
	legendIconSize: 26,
	targets: asPlacements(),
});

describe("IconOrderCaptchaManager", () => {
	let db: IProviderDatabase;
	let pair: KeyringPair;
	let manager: IconOrderCaptchaManager;
	let mockEnv: ProviderEnvironment;

	beforeEach(() => {
		db = {
			storeIconOrderCaptchaRecord: vi.fn(),
			getIconOrderCaptchaRecordByChallenge: vi.fn(),
			updateIconOrderCaptchaRecord: vi.fn(),
			updateIconOrderCaptchaRecordResult: vi.fn(),
			getClientRecord: vi.fn(),
			getSessionRecordBySessionId: vi.fn(),
			updateSessionRecord: vi.fn(),
		} as unknown as IProviderDatabase;

		pair = {
			sign: vi.fn().mockReturnValue(new Uint8Array()),
			address: "testAddress",
		} as unknown as KeyringPair;

		mockEnv = { config: {} } as unknown as ProviderEnvironment;
		manager = new IconOrderCaptchaManager(db, pair, mockEnv.config);

		vi.clearAllMocks();
		vi.mocked(u8aToHex).mockReturnValue("0xsigned");
		vi.mocked(stringToHex).mockImplementation((s) => `0xhex:${s}`);
		vi.mocked(verifyRecency).mockReturnValue(true);
	});

	describe("getIconOrderCaptchaChallenge", () => {
		it("mints a signed challenge carrying the rendered targets", async () => {
			const render = vi.fn().mockResolvedValue(renderedImages());
			const challenge = await manager.getIconOrderCaptchaChallenge(
				"user",
				"dapp",
				"https://example.com",
				0.5,
				render,
			);

			expect(challenge.challenge).toContain("___user___dapp___");
			expect(challenge.providerSignature).toBe("0xsigned");
			expect(challenge.tolerance).toBe(0.5);
			expect(challenge.targets).toEqual(targets);
			expect(render).toHaveBeenCalledOnce();
		});

		it("strips render-only fields from the persisted targets", async () => {
			const render = vi.fn().mockResolvedValue(renderedImages());
			const challenge = await manager.getIconOrderCaptchaChallenge(
				"user",
				"dapp",
				"https://example.com",
				undefined,
				render,
			);

			for (const target of challenge.targets) {
				expect(Object.keys(target).sort()).toEqual(["kind", "size", "x", "y"]);
			}
		});

		it("keeps the imagery and the answer in separate fields", async () => {
			const render = vi.fn().mockResolvedValue(renderedImages());
			const challenge = await manager.getIconOrderCaptchaChallenge(
				"user",
				"dapp",
				"https://example.com",
				undefined,
				render,
			);

			// The response is built from `images`; anything on it would reach
			// the client, so the answer must not be reachable from there.
			expect(challenge.images).toEqual({
				background: "data:image/webp;base64,BG",
				legend: "data:image/webp;base64,LEGEND",
				legendIconSize: 26,
			});
			expect(JSON.stringify(challenge.images)).not.toContain("240");
		});

		it("falls back to the default tolerance when none is resolved", async () => {
			const challenge = await manager.getIconOrderCaptchaChallenge(
				"user",
				"dapp",
				"https://example.com",
				undefined,
				vi.fn().mockResolvedValue(renderedImages()),
			);
			expect(challenge.tolerance).toBe(iconOrderToleranceDefault);
		});
	});

	describe("verifyIconOrderCaptchaSolution", () => {
		const challenge: PoWChallengeId = `${Date.now()}___user___dapp___1`;
		const headers: RequestHeaders = {};
		const ip = getIPAddress("1.1.1.1");

		const submit = (clicks: { x: number; y: number }[]) =>
			manager.verifyIconOrderCaptchaSolution(
				challenge,
				"0xprovider",
				clicks,
				[],
				60000,
				"0xuser",
				ip,
				headers,
			);

		const storedRecord = (over: Partial<IconOrderCaptchaStored> = {}) =>
			asRecord({
				challenge,
				userAccount: "user",
				dappAccount: "dapp",
				targets,
				tolerance: 0.6,
				userSubmitted: false,
				serverChecked: false,
				result: { status: CaptchaStatus.pending },
				...over,
			});

		it("approves the target icons clicked in the right order", async () => {
			vi.mocked(db.getIconOrderCaptchaRecordByChallenge).mockResolvedValue(
				storedRecord(),
			);

			await expect(
				submit([
					{ x: 60, y: 50 },
					{ x: 180, y: 90 },
					{ x: 240, y: 150 },
				]),
			).resolves.toBe(true);

			expect(db.updateIconOrderCaptchaRecordResult).toHaveBeenCalledWith(
				challenge,
				{ status: CaptchaStatus.approved },
				false,
				true,
				"0xuser",
				undefined,
			);
		});

		it("rejects the right icons clicked in the wrong order", async () => {
			vi.mocked(db.getIconOrderCaptchaRecordByChallenge).mockResolvedValue(
				storedRecord(),
			);

			await expect(
				submit([
					{ x: 180, y: 90 },
					{ x: 60, y: 50 },
					{ x: 240, y: 150 },
				]),
			).resolves.toBe(false);

			expect(db.updateIconOrderCaptchaRecordResult).toHaveBeenCalledWith(
				challenge,
				{
					status: CaptchaStatus.disapproved,
					reason: ResultReason.CAPTCHA_INVALID_SOLUTION,
				},
				false,
				true,
				"0xuser",
				undefined,
			);
		});

		it("rejects clicks that miss the icons", async () => {
			vi.mocked(db.getIconOrderCaptchaRecordByChallenge).mockResolvedValue(
				storedRecord(),
			);
			await expect(
				submit([
					{ x: 5, y: 5 },
					{ x: 10, y: 10 },
					{ x: 15, y: 15 },
				]),
			).resolves.toBe(false);
		});

		it("rejects a submission with the wrong number of clicks", async () => {
			vi.mocked(db.getIconOrderCaptchaRecordByChallenge).mockResolvedValue(
				storedRecord(),
			);
			await expect(
				submit([
					{ x: 60, y: 50 },
					{ x: 180, y: 90 },
				]),
			).resolves.toBe(false);
		});

		it("refuses a second submission against the same challenge", async () => {
			vi.mocked(db.getIconOrderCaptchaRecordByChallenge).mockResolvedValue(
				storedRecord({ userSubmitted: true }),
			);

			await expect(
				submit([
					{ x: 60, y: 50 },
					{ x: 180, y: 90 },
					{ x: 240, y: 150 },
				]),
			).resolves.toBe(false);
			expect(db.updateIconOrderCaptchaRecordResult).not.toHaveBeenCalled();
		});

		it("returns false when the challenge is unknown", async () => {
			vi.mocked(db.getIconOrderCaptchaRecordByChallenge).mockResolvedValue(
				null,
			);
			await expect(submit([{ x: 60, y: 50 }])).resolves.toBe(false);
		});

		it("disapproves a submission that arrives outside the window", async () => {
			vi.mocked(verifyRecency).mockReturnValue(false);
			vi.mocked(db.getIconOrderCaptchaRecordByChallenge).mockResolvedValue(
				storedRecord(),
			);

			await expect(
				submit([
					{ x: 60, y: 50 },
					{ x: 180, y: 90 },
					{ x: 240, y: 150 },
				]),
			).resolves.toBe(false);
			expect(db.updateIconOrderCaptchaRecordResult).toHaveBeenCalledWith(
				challenge,
				{
					status: CaptchaStatus.disapproved,
					reason: ResultReason.CAPTCHA_INVALID_TIMESTAMP,
				},
				false,
				true,
				"0xuser",
				undefined,
			);
		});

		it("persists the clicks and pointer trail even on a failed solve", async () => {
			vi.mocked(db.getIconOrderCaptchaRecordByChallenge).mockResolvedValue(
				storedRecord(),
			);
			const clicks = [
				{ x: 5, y: 5 },
				{ x: 10, y: 10 },
				{ x: 15, y: 15 },
			];
			const trail = [{ x: 5, y: 5, t: 12 }];

			await manager.verifyIconOrderCaptchaSolution(
				challenge,
				"0xprovider",
				clicks,
				trail,
				60000,
				"0xuser",
				ip,
				headers,
			);

			expect(db.updateIconOrderCaptchaRecord).toHaveBeenCalledWith(challenge, {
				clicks,
				iconOrderEvents: trail,
			});
		});

		it("checks both signatures before touching the database", async () => {
			vi.mocked(db.getIconOrderCaptchaRecordByChallenge).mockResolvedValue(
				null,
			);
			await submit([{ x: 60, y: 50 }]);

			expect(checkPowSignature).toHaveBeenCalledTimes(2);
			const order = vi
				.mocked(checkPowSignature)
				.mock.invocationCallOrder.at(-1);
			const dbOrder = vi
				.mocked(db.getIconOrderCaptchaRecordByChallenge)
				.mock.invocationCallOrder.at(0);
			expect(order).toBeLessThan(dbOrder ?? Number.POSITIVE_INFINITY);
		});
	});

	describe("captcha type identity", () => {
		it("stamps its own type on results", () => {
			const handle = manager as unknown as { captchaType: CaptchaType };
			expect(handle.captchaType).toBe(CaptchaType.iconOrder);
		});
	});
});

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

import {
	CHALLENGE_CAPTCHA_TYPES,
	CaptchaType,
	type GetFrictionlessCaptchaResponse,
} from "@prosopo/types";
import { describe, expect, it, vi } from "vitest";
import { sendChallenge } from "../../../../tasks/frictionless/challengeDispatch.js";
import type { FrictionlessManager } from "../../../../tasks/frictionless/frictionlessTasks.js";

const buildManager = () => ({
	sendImageCaptcha: vi.fn().mockResolvedValue({ status: "ok", from: "image" }),
	sendPowCaptcha: vi.fn().mockResolvedValue({ status: "ok", from: "pow" }),
	sendPuzzleCaptcha: vi
		.fn()
		.mockResolvedValue({ status: "ok", from: "puzzle" }),
});

describe("sendChallenge", () => {
	it.each([
		[CaptchaType.image, "sendImageCaptcha"],
		[CaptchaType.pow, "sendPowCaptcha"],
		[CaptchaType.puzzle, "sendPuzzleCaptcha"],
	] as const)("routes %s to %s", async (captchaType, method) => {
		const manager = buildManager();
		const params = { siteKey: "site", solvedImagesCount: 4 };

		const result = await sendChallenge(
			manager as unknown as FrictionlessManager,
			captchaType,
			params,
		);

		expect(manager[method]).toHaveBeenCalledWith(params);
		expect(
			(result as GetFrictionlessCaptchaResponse & { from: string }).from,
		).toBe(captchaType);

		// Exactly one sender fires — no accidental double-dispatch.
		const calls = [
			manager.sendImageCaptcha,
			manager.sendPowCaptcha,
			manager.sendPuzzleCaptcha,
		].filter((fn) => fn.mock.calls.length > 0);
		expect(calls).toHaveLength(1);
	});

	it("has a sender for every challenge type", async () => {
		// Guards the reason this table exists: a new challenge type must not be
		// able to reach dispatch without a sender.
		for (const captchaType of CHALLENGE_CAPTCHA_TYPES) {
			const manager = buildManager();
			await expect(
				sendChallenge(
					manager as unknown as FrictionlessManager,
					captchaType,
					{},
				),
			).resolves.toBeDefined();
		}
	});

	it("passes image-only params through untouched for pow and puzzle", async () => {
		// The callers that used to branch per type now pass solvedImagesCount
		// unconditionally; sendCaptcha is what discards it. Dispatch must not
		// silently filter it, or that contract would be hidden here instead.
		const manager = buildManager();
		await sendChallenge(
			manager as unknown as FrictionlessManager,
			CaptchaType.pow,
			{ solvedImagesCount: 9 },
		);
		expect(manager.sendPowCaptcha).toHaveBeenCalledWith({
			solvedImagesCount: 9,
		});
	});
});

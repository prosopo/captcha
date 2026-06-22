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
import { AccessPolicyType } from "@prosopo/user-access-policy";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleAccessPolicy } from "../../../../../api/captcha/getFrictionlessCaptchaChallenge/accessPolicy.js";

const buildInput = () => {
	const tasks = {
		frictionlessManager: {
			scoreIncreaseAccessPolicy: vi.fn(
				(_p: unknown, _bs: number, score: number, sc: unknown) => ({
					score: score + 0.1,
					scoreComponents: { ...(sc as object), bumped: true },
				}),
			),
			updateScore: vi.fn(),
			registerBlockedSession: vi.fn(),
			sendImageCaptcha: vi.fn().mockResolvedValue({ kind: "image" }),
			sendPowCaptcha: vi.fn().mockResolvedValue({ kind: "pow" }),
			sendPuzzleCaptcha: vi.fn().mockResolvedValue({ kind: "puzzle" }),
		},
	};
	return {
		tasks,
		input: {
			tasks,
			clientRecord: {
				settings: { imageMaxRounds: 5 },
			},
			userAccessPolicy: undefined as unknown,
			baseBotScore: 0,
			botScore: 0.4,
			scoreComponents: { baseScore: 0 },
			userSitekeyIpHash: "hash",
			dapp: "dapp",
			ipInfo: undefined,
			flatHeaders: {},
			logger: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
			userScope: {} as never,
		},
	};
};

const buildRes = () => ({
	json: vi.fn().mockReturnValue("ok"),
	status: vi.fn().mockReturnThis(),
});

describe("handleAccessPolicy", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns handled=false unchanged when no policy is supplied", async () => {
		const { input } = buildInput();
		const res = buildRes();
		const r = await handleAccessPolicy(input as never, res as never);
		expect(r).toEqual({
			handled: false,
			botScore: 0.4,
			scoreComponents: { baseScore: 0 },
		});
	});

	it("bumps the score even when no branch fires (carries state forward)", async () => {
		const { tasks, input } = buildInput();
		input.userAccessPolicy = {
			type: AccessPolicyType.Restrict,
			captchaType: CaptchaType.frictionless,
		};
		const res = buildRes();
		const r = await handleAccessPolicy(input as never, res as never);
		expect(r.handled).toBe(false);
		if (!r.handled) {
			expect(r.botScore).toBeCloseTo(0.5);
			expect(r.scoreComponents).toMatchObject({ bumped: true });
		}
		expect(tasks.frictionlessManager.updateScore).toHaveBeenCalled();
	});

	it("returns 401 for block policies", async () => {
		const { tasks, input } = buildInput();
		input.userAccessPolicy = { type: "block" };
		const res = buildRes();
		const r = await handleAccessPolicy(input as never, res as never);
		expect(r.handled).toBe(true);
		expect(res.status).toHaveBeenCalledWith(401);
		expect(tasks.frictionlessManager.registerBlockedSession).toHaveBeenCalled();
	});

	it("dispatches to sendImageCaptcha for image-typed policies", async () => {
		const { tasks, input } = buildInput();
		input.userAccessPolicy = {
			type: AccessPolicyType.Restrict,
			captchaType: CaptchaType.image,
			solvedImagesCount: 99,
		};
		const res = buildRes();
		const r = await handleAccessPolicy(input as never, res as never);
		expect(r.handled).toBe(true);
		const args = tasks.frictionlessManager.sendImageCaptcha.mock.calls[0]?.[0];
		// Clamped to clientRecord.settings.imageMaxRounds (=5).
		expect(args.solvedImagesCount).toBe(5);
	});

	it("dispatches to sendPowCaptcha for pow-typed policies", async () => {
		const { tasks, input } = buildInput();
		input.userAccessPolicy = {
			type: AccessPolicyType.Restrict,
			captchaType: CaptchaType.pow,
		};
		const res = buildRes();
		const r = await handleAccessPolicy(input as never, res as never);
		expect(r.handled).toBe(true);
		expect(tasks.frictionlessManager.sendPowCaptcha).toHaveBeenCalled();
	});

	it("dispatches to sendPuzzleCaptcha for puzzle-typed policies", async () => {
		const { tasks, input } = buildInput();
		input.userAccessPolicy = {
			type: AccessPolicyType.Restrict,
			captchaType: CaptchaType.puzzle,
		};
		const res = buildRes();
		const r = await handleAccessPolicy(input as never, res as never);
		expect(r.handled).toBe(true);
		expect(tasks.frictionlessManager.sendPuzzleCaptcha).toHaveBeenCalled();
	});
});

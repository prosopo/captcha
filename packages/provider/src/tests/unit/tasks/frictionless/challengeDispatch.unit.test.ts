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
	CONCRETE_CAPTCHA_TYPES,
	CaptchaType,
	type ConcreteCaptchaType,
	type GetFrictionlessCaptchaResponse,
	type Session,
} from "@prosopo/types";
import { type Mock, describe, expect, it, vi } from "vitest";
import {
	type ChallengeSenders,
	sendChallenge,
} from "../../../../tasks/frictionless/challengeDispatch.js";

type SenderMock = Mock<
	(params?: Partial<Session>) => Promise<GetFrictionlessCaptchaResponse>
>;

const SENDER_FOR: Record<ConcreteCaptchaType, keyof ChallengeSenders> = {
	[CaptchaType.image]: "sendImageCaptcha",
	[CaptchaType.pow]: "sendPowCaptcha",
	[CaptchaType.puzzle]: "sendPuzzleCaptcha",
	[CaptchaType.iconOrder]: "sendIconOrderCaptcha",
};

const buildManager = (): Record<keyof ChallengeSenders, SenderMock> => {
	const sender = (captchaType: ConcreteCaptchaType): SenderMock =>
		vi.fn(
			async (): Promise<GetFrictionlessCaptchaResponse> => ({
				captchaType,
				status: "ok",
			}),
		);
	return {
		sendImageCaptcha: sender(CaptchaType.image),
		sendPowCaptcha: sender(CaptchaType.pow),
		sendPuzzleCaptcha: sender(CaptchaType.puzzle),
		sendIconOrderCaptcha: sender(CaptchaType.iconOrder),
	};
};

describe("sendChallenge", () => {
	it.each(CONCRETE_CAPTCHA_TYPES)(
		"serves %s through its own sender and no other",
		async (captchaType) => {
			const manager = buildManager();
			const params: Partial<Session> = {
				siteKey: "site",
				solvedImagesCount: 4,
			};

			const result = await sendChallenge(manager, captchaType, params);

			expect(result.captchaType).toBe(captchaType);
			expect(manager[SENDER_FOR[captchaType]]).toHaveBeenCalledWith(params);
			expect(
				Object.values(manager).filter((fn) => fn.mock.calls.length > 0),
			).toHaveLength(1);
		},
	);

	it("passes other types' knobs through for sendCaptcha to drop", async () => {
		const manager = buildManager();
		await sendChallenge(manager, CaptchaType.pow, { solvedImagesCount: 9 });
		expect(manager.sendPowCaptcha).toHaveBeenCalledWith({
			solvedImagesCount: 9,
		});
	});
});

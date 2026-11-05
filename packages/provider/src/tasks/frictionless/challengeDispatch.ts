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
	CaptchaType,
	type ConcreteCaptchaType,
	type GetFrictionlessCaptchaResponse,
	type Session,
} from "@prosopo/types";
import type { FrictionlessManager } from "./frictionlessTasks.js";

export type ChallengeSenders = Pick<
	FrictionlessManager,
	| "sendImageCaptcha"
	| "sendPowCaptcha"
	| "sendPuzzleCaptcha"
	| "sendIconOrderCaptcha"
>;

type ChallengeSender = (
	manager: ChallengeSenders,
	params: Partial<Session>,
) => Promise<GetFrictionlessCaptchaResponse>;

const CHALLENGE_SENDERS: Record<ConcreteCaptchaType, ChallengeSender> = {
	[CaptchaType.image]: (manager, params) => manager.sendImageCaptcha(params),
	[CaptchaType.pow]: (manager, params) => manager.sendPowCaptcha(params),
	[CaptchaType.puzzle]: (manager, params) => manager.sendPuzzleCaptcha(params),
	[CaptchaType.iconOrder]: (manager, params) =>
		manager.sendIconOrderCaptcha(params),
};

/**
 * Serve whichever challenge a caller has already decided on. Callers may pass
 * every type's knobs: `sendCaptcha` drops the ones the served type ignores.
 */
export const sendChallenge = (
	manager: ChallengeSenders,
	captchaType: ConcreteCaptchaType,
	params: Partial<Session>,
): Promise<GetFrictionlessCaptchaResponse> =>
	CHALLENGE_SENDERS[captchaType](manager, params);

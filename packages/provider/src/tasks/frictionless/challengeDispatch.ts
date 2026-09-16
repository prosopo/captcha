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
	type ChallengeCaptchaType,
	type GetFrictionlessCaptchaResponse,
	type Session,
} from "@prosopo/types";
import type { FrictionlessManager } from "./frictionlessTasks.js";

/**
 * Params accepted by every `send*Captcha` helper. Type-specific fields
 * (`solvedImagesCount`, `powDifficulty`) may always be supplied — the
 * manager's `sendCaptcha` discards the ones that don't apply to the type it
 * ends up serving, so callers don't need to branch before dispatching.
 */
export type ChallengeSendParams = Partial<Session>;

type ChallengeSender = (
	manager: FrictionlessManager,
	params: ChallengeSendParams,
) => Promise<GetFrictionlessCaptchaResponse>;

/**
 * Single dispatch table from challenge type → the manager call that issues it.
 *
 * Declared as a total `Record<ChallengeCaptchaType, …>` on purpose: the three
 * places that used to branch on captchaType (the configured-type
 * short-circuit, the access-policy handler, and the client-side verify
 * dispatch in `@prosopo/server`) each had their own if/switch chain, so adding
 * a challenge type meant finding all of them. Adding a member to
 * `ChallengeCaptchaType` now fails to compile here instead.
 */
const CHALLENGE_SENDERS: Record<ChallengeCaptchaType, ChallengeSender> = {
	[CaptchaType.image]: (manager, params) => manager.sendImageCaptcha(params),
	[CaptchaType.pow]: (manager, params) => manager.sendPowCaptcha(params),
	[CaptchaType.puzzle]: (manager, params) => manager.sendPuzzleCaptcha(params),
};

export const sendChallenge = (
	manager: FrictionlessManager,
	captchaType: ChallengeCaptchaType,
	params: ChallengeSendParams,
): Promise<GetFrictionlessCaptchaResponse> =>
	CHALLENGE_SENDERS[captchaType](manager, params);

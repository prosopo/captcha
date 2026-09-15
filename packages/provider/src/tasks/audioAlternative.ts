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

import { CaptchaType, type IUserSettings } from "@prosopo/types";

/**
 * The audio challenge is an accessibility alternative, the way reCAPTCHA's
 * audio option is: a user only reaches it by pressing "use audio instead" on a
 * visual challenge, and only on a site that has `audioAccessibilityEnabled`
 * turned on. Nothing routes a user to audio — no site setting, access rule,
 * traffic category, routing machine or PoW escalation can name it — so a
 * session is never minted as audio.
 *
 * Instead the audio challenge is served against the visual session the user
 * was already given. Pressing the control re-runs /frictionless in the widget
 * (the provider consumed the previous session when it issued the visual
 * challenge), which mints a fresh visual session, and the audio challenge
 * request is accepted against that session here.
 */

/** The session types that offer, and so may be exchanged for, audio. */
const AUDIO_ALTERNATIVE_SESSION_TYPES: ReadonlySet<string> = new Set<string>([
	CaptchaType.image,
	CaptchaType.puzzle,
	CaptchaType.iconOrder,
]);

/**
 * Whether a session of this type is a visual challenge that can offer the
 * audio alternative. PoW has no challenge UI to hang the control off, and
 * `authenticated` / `frictionless` are not challenges at all.
 */
export const isAudioAlternativeSessionType = (
	captchaType: string | undefined,
): boolean =>
	captchaType !== undefined && AUDIO_ALTERNATIVE_SESSION_TYPES.has(captchaType);

/**
 * Whether an audio challenge may be issued against a session minted as a
 * different type. True only when audio is what was asked for, the session is
 * a visual challenge, and the site has opted in to the alternative.
 */
export const isAudioAlternativeAllowed = (
	requestedCaptchaType: CaptchaType,
	sessionCaptchaType: CaptchaType,
	settings: Pick<IUserSettings, "audioAccessibilityEnabled"> | undefined,
): boolean =>
	requestedCaptchaType === CaptchaType.audio &&
	settings?.audioAccessibilityEnabled === true &&
	isAudioAlternativeSessionType(sessionCaptchaType);

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
	type IUserSettings,
	isCaptchaTypeFeatureEnabled,
} from "@prosopo/types";

// Nothing can select audio, so it is served against a visual session: "use
// audio instead" re-runs /frictionless (issuing the visual challenge consumed
// the old session) and the audio request is accepted against the new one.

const AUDIO_ALTERNATIVE_SESSION_TYPES: ReadonlySet<string> = new Set<string>([
	CaptchaType.image,
	CaptchaType.puzzle,
	CaptchaType.iconOrder,
]);

/** Whether a session of this type is a visual challenge that can offer audio. */
export const isAudioAlternativeSessionType = (
	captchaType: string | undefined,
): boolean =>
	captchaType !== undefined && AUDIO_ALTERNATIVE_SESSION_TYPES.has(captchaType);

type AudioAlternativeSettings = Pick<
	IUserSettings,
	"audioAccessibilityEnabled" | "captchaTypeFeatureFlags"
>;

/**
 * The site owner has to turn the alternative on, and Prosopo has to have
 * switched on the audio feature flag for the site.
 */
export const isAudioAlternativeEnabled = (
	settings: AudioAlternativeSettings | undefined,
): boolean =>
	settings?.audioAccessibilityEnabled === true &&
	isCaptchaTypeFeatureEnabled(
		CaptchaType.audio,
		settings.captchaTypeFeatureFlags,
	);

/** Whether a challenge of this type shows "use audio instead". */
export const offersAudioAlternative = (
	captchaType: string | undefined,
	audioAlternativeEnabled: boolean,
): boolean =>
	audioAlternativeEnabled && isAudioAlternativeSessionType(captchaType);

/** Whether an audio challenge may be issued against a session of another type. */
export const isAudioAlternativeAllowed = (
	requestedCaptchaType: CaptchaType,
	sessionCaptchaType: CaptchaType,
	settings: AudioAlternativeSettings | undefined,
): boolean =>
	requestedCaptchaType === CaptchaType.audio &&
	offersAudioAlternative(
		sessionCaptchaType,
		isAudioAlternativeEnabled(settings),
	);

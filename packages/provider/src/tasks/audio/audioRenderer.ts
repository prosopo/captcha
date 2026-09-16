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
	type AudioRenderSettings,
	DEFAULT_RENDER_SETTINGS,
	type RenderedAudioChallenge,
	toDataUri,
} from "@prosopo/audio-assets";
import type { IAudioSettings } from "@prosopo/types";
import {
	getAudioChallengeBuffer,
	initAudioChallengeBuffer,
} from "./audioBuffer.js";

export interface RenderedAudioClip {
	/** WAV as a data URI, ready to hand to an `<audio>` element. */
	clip: string;
	/** How many characters the user must type. */
	characterCount: number;
	/**
	 * The spoken transcript. Caller must persist this on the challenge
	 * record and must never place it in a response body.
	 */
	answer: string;
	durationMs: number;
}

/**
 * Merge zero or more partial-override sources on top of the asset
 * package defaults. Later sources win, matching the cascade in
 * `getAudioCaptchaChallenge`: traffic-filter policy overrides the
 * client-record setting, which overrides the built-in default.
 */
export const resolveAudioRenderSettings = (
	...overrides: (IAudioSettings | undefined)[]
): AudioRenderSettings => {
	let resolved: AudioRenderSettings = { ...DEFAULT_RENDER_SETTINGS };
	for (const override of overrides) {
		if (!override) continue;
		if (override.digitCount !== undefined) {
			resolved = { ...resolved, digitCount: override.digitCount };
		}
		if (override.noiseSnrDb !== undefined) {
			resolved = { ...resolved, noiseSnrDb: override.noiseSnrDb };
		}
		if (override.babbleGain !== undefined) {
			resolved = { ...resolved, babbleGain: override.babbleGain };
		}
		if (override.babbleVoices !== undefined) {
			resolved = { ...resolved, babbleVoices: override.babbleVoices };
		}
		if (override.reverbMix !== undefined) {
			resolved = { ...resolved, reverbMix: override.reverbMix };
		}
		if (override.gapMs !== undefined) {
			resolved = { ...resolved, gapMs: override.gapMs };
		}
	}
	return resolved;
};

/**
 * Take one challenge from the process-wide buffer and encode it for the
 * wire.
 *
 * Lazily initialises the buffer on first use so a provider that never
 * serves audio pays nothing for it — unlike the puzzle background
 * buffer, which is primed at boot because the puzzle is on by default.
 */
export const renderAudioClip = (
	settings: AudioRenderSettings,
): RenderedAudioClip => {
	const buffer = getAudioChallengeBuffer() ?? initAudioChallengeBuffer();
	const challenge: RenderedAudioChallenge = buffer.take(settings);

	return {
		clip: toDataUri(challenge.wav),
		characterCount: challenge.answer.length,
		answer: challenge.answer,
		durationMs: challenge.durationMs,
	};
};
